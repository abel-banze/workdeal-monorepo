import { can, type Actor, type DomainPermission, type ResourceAccess } from "./permissions.js";

// ── Entitlements (subscrição + plano + RBAC) ────────────────────────────
// Lógica pura e reutilizável para garantir que uma empresa só faz o que lhe
// é permitido. Não acede à BD — recebe o estado actual (subscrição, plano,
// uso de recursos, papel) como input e devolve decisões tipadas.
//
// A camada de dados (repositories em apps/api) é quem busca o snapshot e o
// alimenta a estas funções; qualquer página/Server Action/Hono pode reutilizar
// a mesma fonte de verdade sem duplicar regras de negócio.

// ── Tipos de entrada ─────────────────────────────────────────────────────

export type SubscriptionEntitlementStatus =
  | "active"
  | "past_due"
  | "trialing"
  | "cancelled"
  | "paused"
  | "expired";

export type EntitlementCheck =
  | "subscription.active"
  | "subscription.past_due"
  | "subscription.trialing"
  | "subscription.inactive"
  | "limit.profiles"
  | "limit.team_members"
  | "limit.listings"
  | "limit.events"
  | "limit.branches"
  | "limit.api_calls"
  | "permission.denied";

export type EntitlementRequirement =
  | { type: "subscription"; excludeTrial?: boolean }
  | { type: "limit"; kind: ResourceLimitKind; count?: number }
  | { type: "permission"; actor: Actor; resource: ResourceAccess; permission: DomainPermission };

export type ResourceLimitKind =
  | "profiles"
  | "team_members"
  | "listings"
  | "events"
  | "branches"
  | "api_calls";

/** Limites efectivos de um plano (já com a herança de features resolvida na camada de dados). */
export interface PlanEntitlements {
  maxProfiles: number | null;
  maxTeamMembers: number | null;
  maxListings: number | null;
  maxEvents: number | null;
  maxBranches: number | null;
  apiAccess: boolean;
  maxApiCallsPerMonth: number | null;
}

/** Snapshot do estado da subscrição de uma empresa, tal como vem da BD. */
export interface SubscriptionSnapshot {
  status: SubscriptionEntitlementStatus;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
}

export interface SubscriptionCheckResult {
  ok: boolean;
  code: EntitlementCheck;
  message: string;
  details?: {
    status?: SubscriptionEntitlementStatus;
    currentPeriodEnd?: string;
    trialEndsAt?: string;
    remainingDays?: number;
  };
}

export interface LimitCheckResult {
  ok: boolean;
  code: EntitlementCheck;
  kind: ResourceLimitKind;
  used: number;
  max: number | null;
  message: string;
}

export type EntitlementResult =
  | ({ ok: true } & (
      | { check: "subscription" }
      | { check: "limit"; kind: ResourceLimitKind; used: number; max: number | null }
      | { check: "permission"; permission: DomainPermission }
    ))
  | ({ ok: false } & (
      | { check: "subscription"; code: EntitlementCheck; message: string }
      | { check: "limit"; kind: ResourceLimitKind; used: number; max: number | null; message: string }
      | { check: "permission"; permission: DomainPermission; message: string }
    ));

// ── Status da subscrição ─────────────────────────────────────────────────

const ACTIVE_STATUSES: ReadonlySet<SubscriptionEntitlementStatus> = new Set(["active", "past_due", "trialing"]);

export function isSubscriptionActive(status: SubscriptionEntitlementStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function isTrialActive(sub: SubscriptionSnapshot): boolean {
  return sub.status === "trialing" && !!sub.trialEndsAt && sub.trialEndsAt.getTime() > Date.now();
}

export function remainingTrialDays(sub: SubscriptionSnapshot): number {
  if (!sub.trialEndsAt) return 0;
  return Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 86_400_000));
}

/**
 * Verifica se a subscrição permite aceder a uma capacidade paga.
 * `active` e `past_due` (período de tolerância) dão acesso; `trialing` só se
 * ainda estiver dentro do período experimental; restantes estados negam.
 */
export function checkSubscription(sub: SubscriptionSnapshot, opts: { excludeTrial?: boolean } = {}): SubscriptionCheckResult {
  const { excludeTrial = false } = opts;

  if (sub.status === "active") {
    return { ok: true, code: "subscription.active", message: "Subscrição activa" };
  }
  if (sub.status === "past_due") {
    return { ok: true, code: "subscription.past_due", message: "Pagamento em atraso — acesso mantido em tolerância" };
  }

  if (sub.status === "trialing") {
    if (excludeTrial) {
      return {
        ok: false,
        code: "subscription.active",
        message: "Esta capacidade só está disponível fora do período experimental",
        details: { status: sub.status, trialEndsAt: sub.trialEndsAt?.toISOString() },
      };
    }
    if (isTrialActive(sub)) {
      return { ok: true, code: "subscription.trialing", message: "Período experimental activo", details: { status: sub.status, remainingDays: remainingTrialDays(sub) } };
    }
    return { ok: false, code: "subscription.inactive", message: "Período experimental terminou", details: { status: sub.status, trialEndsAt: sub.trialEndsAt?.toISOString() } };
  }

  return {
    ok: false,
    code: "subscription.inactive",
    message: `Subscrição ${sub.status} — renove para continuar a usar esta capacidade`,
    details: { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd?.toISOString() },
  };
}

// ── Limites do plano ─────────────────────────────────────────────────────

type NumberLimitKeys = "maxProfiles" | "maxTeamMembers" | "maxListings" | "maxEvents" | "maxBranches" | "maxApiCallsPerMonth";

const KIND_TO_LIMIT_KEY: Record<ResourceLimitKind, NumberLimitKeys> = {
  profiles: "maxProfiles",
  team_members: "maxTeamMembers",
  listings: "maxListings",
  events: "maxEvents",
  branches: "maxBranches",
  api_calls: "maxApiCallsPerMonth",
};

const LIMIT_LABELS_PT: Record<ResourceLimitKind, string> = {
  profiles: "perfis",
  team_members: "membros de equipa",
  listings: "listagens",
  events: "eventos",
  branches: "filiais",
  api_calls: "chamadas à API",
};

const LIMIT_CHECK_CODE = {
  profiles: "limit.profiles",
  team_members: "limit.team_members",
  listings: "limit.listings",
  events: "limit.events",
  branches: "limit.branches",
  api_calls: "limit.api_calls",
} as const satisfies Record<ResourceLimitKind, EntitlementCheck>;

/** Máximo efectivo para um tipo de recurso (null = ilimitado). */
export function maxForKind(plan: PlanEntitlements, kind: ResourceLimitKind): number | null {
  return plan[KIND_TO_LIMIT_KEY[kind]] ?? null;
}

function isWithinLimit(used: number, max: number | null): boolean {
  return max === null || used <= max;
}

/**
 * Verifica se a empresa ainda pode criar/ter mais de um dado recurso.
 * `count` (opcional) é o número a somar ao uso actual (ex: criar +1 evento).
 */
export function checkPlanLimit(plan: PlanEntitlements, kind: ResourceLimitKind, used: number, count = 0): LimitCheckResult {
  const max = maxForKind(plan, kind);
  const projected = used + count;
  const code = LIMIT_CHECK_CODE[kind];

  if (max === null) {
    return { ok: true, code, kind, used, max, message: `Recurso "ilimitado"` };
  }

  if (isWithinLimit(projected, max)) {
    return { ok: true, code, kind, used, max, message: `Dentro do limite de ${LIMIT_LABELS_PT[kind]}` };
  }

  return {
    ok: false,
    code,
    kind,
    used,
    max,
    message: `Limite de ${LIMIT_LABELS_PT[kind]} atingido (${used} de ${max}${count > 0 ? ` +${count}` : ""})`,
  };
}

// ── Orquestração ─────────────────────────────────────────────────────────

export interface EntitlementsContext {
  plan: PlanEntitlements;
  subscription: SubscriptionSnapshot;
  usage: Partial<Record<ResourceLimitKind, number>>;
}

export interface EntitlementViolation {
  check: EntitlementCheck;
  message: string;
  details?: Record<string, unknown>;
}

export interface EntitlementsEvaluation {
  ok: boolean;
  violations: EntitlementViolation[];
  limits: Record<ResourceLimitKind, { used: number; max: number | null; ok: boolean }>;
  subscription: SubscriptionCheckResult;
}

/**
 * Avalia um requisito individual. Devolve um resultado tipado que indica se
 * a acção pode avançar ou, se falhar, o código/limite em causa.
 */
export function evaluateRequirement(
  requirement: EntitlementRequirement,
  ctx: EntitlementsContext,
): EntitlementResult {
  switch (requirement.type) {
    case "subscription": {
      const res = checkSubscription(ctx.subscription, { excludeTrial: requirement.excludeTrial });
      if (res.ok) return { ok: true, check: "subscription" };
      return { ok: false, check: "subscription", code: res.code, message: res.message };
    }
    case "limit": {
      const count = requirement.count ?? 0;
      const used = ctx.usage[requirement.kind] ?? 0;
      return evaluatePlanLimit(ctx.plan, requirement.kind, used, count);
    }
    case "permission":
      return evaluatePermission(requirement);
  }
}

function evaluatePlanLimit(plan: PlanEntitlements, kind: ResourceLimitKind, used: number, count: number): EntitlementResult {
  const res = checkPlanLimit(plan, kind, used, count);
  if (res.ok) return { ok: true, check: "limit", kind, used, max: res.max };
  return { ok: false, check: "limit", kind, used, max: res.max, message: res.message };
}

function evaluatePermission(requirement: Extract<EntitlementRequirement, { type: "permission" }>): EntitlementResult {
  const { actor, resource, permission } = requirement;
  const allowed = can(actor, resource, permission);
  if (allowed) return { ok: true, check: "permission", permission };
  return { ok: false, check: "permission", permission, message: "Sem permissão para esta acção" };
}

/**
 * Valida uma acção que precisa de subscrição activa + um limite de recurso.
 * Sempre que possível associar um `kind` para que o plano limite o uso.
 */
export function requirePaidAction(
  requirement: Extract<EntitlementRequirement, { type: "limit" | "subscription" }>,
  ctx: EntitlementsContext,
): EntitlementResult {
  if (requirement.type === "subscription") {
    return evaluateRequirement({ type: "subscription", excludeTrial: requirement.excludeTrial }, ctx);
  }
  const sub = checkSubscription(ctx.subscription);
  if (!sub.ok) {
    return { ok: false, check: "subscription", code: sub.code, message: sub.message };
  }
  const count = requirement.count ?? 0;
  const used = ctx.usage[requirement.kind] ?? 0;
  return evaluatePlanLimit(ctx.plan, requirement.kind, used, count);
}

// ── Snapshot de quota/status (dashboard) ────────────────────────────────

/**
 * Monta a visão completa para o dashboard da empresa: estado da subscrição,
 * limites do plano e uso actual por recurso.
 */
export function evaluateEntitlements(ctx: EntitlementsContext): EntitlementsEvaluation {
  const subscription = checkSubscription(ctx.subscription);

  const limits = {} as Record<ResourceLimitKind, { used: number; max: number | null; ok: boolean }>;
  const violations: EntitlementViolation[] = [];

  (Object.keys(KIND_TO_LIMIT_KEY) as ResourceLimitKind[]).forEach((kind) => {
    const used = ctx.usage[kind] ?? 0;
    const res = checkPlanLimit(ctx.plan, kind, used);
    limits[kind] = { used, max: res.max, ok: res.ok };
    if (!res.ok) {
      violations.push({ check: res.code as EntitlementCheck, message: res.message, details: { kind, used, max: res.max } });
    }
  });

  if (!subscription.ok) {
    violations.unshift({ check: subscription.code, message: subscription.message, details: subscription.details });
  }

  return { ok: violations.length === 0, violations, limits, subscription };
}
