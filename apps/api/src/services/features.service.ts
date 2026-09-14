import { billingRepository } from "../repositories/billing.repository.js";
import { featuresRepository, type FlagRow, type OverrideAdminRow, type OverrideRow } from "../repositories/features.repository.js";
import { AppError } from "../lib/errors.js";
import {
  checkSubscription,
  FEATURE_KEYS,
  featureLabel,
  isFeatureKey,
  resolveFeatureMap,
  resolveFlagEnabled,
  resolveFlagBlockReason,
  resolveFeatureReason,
  explainFlagBlock,
  collectFeatureReasons,
  type FeatureAccessReason,
  type FeatureKey,
  type FlagBlockReason,
  type FlagDefinition,
  type SubscriptionEntitlementStatus,
} from "@workdeal/shared";

export interface FeatureScope {
  userId: string;
  organizationId?: string | null;
}

export interface FeatureDecision {
  entitled: boolean;
  enabled: boolean;
  accessible: boolean;
}

export interface FeatureAccessEntry {
  key: FeatureKey;
  label: string;
  entitled: boolean;
  enabled: boolean;
  accessible: boolean;
}

/** Decisão estruturada de um gate por âmbito (para AppError + auditoria). */
export interface ScopeFeatureDecision {
  accessible: boolean;
  reason: FeatureAccessReason;
  flagBlockReason?: FlagBlockReason;
  plan: { id: string; name: string | null; slug: string | null } | null;
}

interface ScopeSnapshot {
  organizationId: string | null;
  sub: {
    id: string;
    planId: string;
    planName: string | null;
    planSlug: string | null;
    status: SubscriptionEntitlementStatus;
    currentPeriodEnd: Date | null;
    trialEndsAt: Date | null;
  } | null;
  planMap: Map<FeatureKey, string>;
  defs: Map<FeatureKey, FlagDefinition>;
  overrides: readonly OverrideRow[];
}

class FeaturesService {
  // ── Resolução interna ──────────────────────────────────────────────────

  /** Features resolvidas do plano (próprias + herança, próprio vence). */
  async resolvePlanFeatureMap(planId: string): Promise<Map<FeatureKey, string>> {
    const rows = await featuresRepository.resolvePlanFeatures(planId);
    return resolveFeatureMap(rows);
  }

  private async resolveFlagContext(): Promise<{
    defs: Map<FeatureKey, FlagDefinition>;
    overrides: readonly OverrideRow[];
  }> {
    const [flags, overrides] = await Promise.all([
      featuresRepository.listFeatureFlags(),
      featuresRepository.listOverrides(),
    ]);
    const defs = new Map<FeatureKey, FlagDefinition>();
    for (const f of flags) {
      defs.set(f.key, { key: f.key, defaultEnabled: f.defaultEnabled, emergencyDisabled: f.emergencyDisabled });
    }
    return { defs, overrides };
  }

  /** Snapshot completo do âmbito — subscrição, plano resolvido e flags. */
  private async resolveScopeSnapshot(scope: FeatureScope): Promise<ScopeSnapshot> {
    const organizationId = scope.organizationId ?? null;
    const sub = await billingRepository.findSubscriptionForScope(scope.userId, organizationId);
    const [planMap, { defs, overrides }] = await Promise.all([
      sub ? this.resolvePlanFeatureMap(sub.planId) : Promise.resolve(new Map<FeatureKey, string>()),
      this.resolveFlagContext(),
    ]);
    return {
      organizationId,
      sub: sub
        ? {
            id: sub.id,
            planId: sub.planId,
            planName: sub.planName ?? null,
            planSlug: sub.planSlug ?? null,
            status: sub.status as SubscriptionEntitlementStatus,
            currentPeriodEnd: sub.currentPeriodEnd,
            trialEndsAt: sub.trialEndsAt,
          }
        : null,
      planMap,
      defs,
      overrides,
    };
  }

  /** subscrição concede acesso? (active/past_due/trialing dentro do trial). */
  private subscriptionGrants(sub: ScopeSnapshot["sub"]): boolean {
    if (!sub) return false;
    return checkSubscription({
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
    }).ok;
  }

  /** Decisão tipada de uma feature para o âmbito (com razão de bloqueio). */
  private decisionFor(snapshot: ScopeSnapshot, key: FeatureKey): ScopeFeatureDecision {
    const hasSubscription = !!snapshot.sub;
    const subscriptionGranting = this.subscriptionGrants(snapshot.sub);
    const result = resolveFeatureReason({
      hasSubscription,
      subscriptionGranting,
      planGrants: snapshot.planMap.has(key),
      flagBlockReason: resolveFlagBlockReason(snapshot.defs.get(key), snapshot.overrides, snapshot.organizationId),
    });
    return {
      ...result,
      plan: hasSubscription
        ? { id: snapshot.sub!.planId, name: snapshot.sub!.planName, slug: snapshot.sub!.planSlug }
        : null,
    };
  }

  /** Eixo PLAN + eixo FLAG num só snapshot (ápia típica de UI). */
  async getFeatureState(scope: FeatureScope) {
    const snapshot = await this.resolveScopeSnapshot(scope);
    const subscriptionGranting = this.subscriptionGrants(snapshot.sub);

    const decisions = new Map<FeatureKey, FeatureDecision>();
    for (const key of FEATURE_KEYS) {
      const entitled = snapshot.planMap.has(key);
      const enabled = resolveFlagEnabled(snapshot.defs.get(key), snapshot.overrides, snapshot.organizationId);
      decisions.set(key, { entitled, enabled, accessible: entitled && enabled && subscriptionGranting });
    }
    return { subscription: snapshot.sub, planMap: snapshot.planMap, decisions };
  }

  /** Lista serializável (key + label + estado) para expor ao frontend. */
  async getFeatureAccessList(scope: FeatureScope): Promise<FeatureAccessEntry[]> {
    const { decisions } = await this.getFeatureState(scope);
    return FEATURE_KEYS.map((key) => {
      const d = decisions.get(key)!;
      return { key, label: featureLabel(key), entitled: d.entitled, enabled: d.enabled, accessible: d.accessible };
    });
  }

  /** A feature está concedida pelo plano E ligada pelo flag E subscrição activa? */
  async hasFeature(scope: FeatureScope, key: FeatureKey): Promise<boolean> {
    const snapshot = await this.resolveScopeSnapshot(scope);
    return this.decisionFor(snapshot, key).accessible;
  }

  /** Valor da feature (ex: nível de search_boost) se acessível; senão `null`. */
  async getFeatureValue(scope: FeatureScope, key: FeatureKey): Promise<string | null> {
    const snapshot = await this.resolveScopeSnapshot(scope);
    const decision = this.decisionFor(snapshot, key);
    if (!decision.accessible) return null;
    return snapshot.planMap.get(key) ?? null;
  }

  /** Decisão estruturada de uma feature para o âmbito (auditoria / UI). */
  async explainFeature(scope: FeatureScope, key: FeatureKey): Promise<ScopeFeatureDecision & { label: string }> {
    const snapshot = await this.resolveScopeSnapshot(scope);
    const decision = this.decisionFor(snapshot, key);
    return { ...decision, label: featureLabel(key) };
  }

  /** Lança 403 FEATURE_REQUIRED com detalhes estruturados se não acessível. */
  async requireFeature(scope: FeatureScope, key: FeatureKey, message?: string): Promise<void> {
    const snapshot = await this.resolveScopeSnapshot(scope);
    const decision = this.decisionFor(snapshot, key);
    if (decision.accessible) return;
    throw this.deniedError([decision], [key], snapshot, message);
  }

  /**
   * Exige um conjunto de features. `strategy: "all"` exige todas;
   * `strategy: "any"` aceita se pelo menos uma estiver acessível.
   */
  async requireFeatureKeys(
    scope: FeatureScope,
    keys: FeatureKey[],
    opts: { strategy?: "all" | "any"; message?: string } = {},
  ): Promise<void> {
    const snapshot = await this.resolveScopeSnapshot(scope);
    const strategy = opts.strategy ?? "all";
    const decisions = collectFeatureReasons(
      snapshot.planMap,
      snapshot.defs,
      snapshot.overrides,
      snapshot.organizationId,
      keys,
      { hasSubscription: !!snapshot.sub, subscriptionGranting: this.subscriptionGrants(snapshot.sub) },
    );

    const missing =
      strategy === "all"
        ? keys.filter((k) => !decisions.get(k)!.accessible)
        : keys.filter((k) => decisions.get(k)!.accessible).length === 0
          ? keys
          : [];

    if (missing.length === 0) return;

    const deniedDecisions = missing.map((k) => {
      const r = decisions.get(k)!;
      return {
        accessible: r.accessible,
        reason: r.reason,
        flagBlockReason: r.flagBlockReason,
        plan: snapshot.sub ? { id: snapshot.sub.planId, name: snapshot.sub.planName, slug: snapshot.sub.planSlug } : null,
      } satisfies ScopeFeatureDecision;
    });

    throw this.deniedError(deniedDecisions, missing, snapshot, opts.message);
  }

  private deniedError(
    decisions: ScopeFeatureDecision[],
    missingKeys: FeatureKey[],
    snapshot: ScopeSnapshot,
    message?: string,
  ): AppError {
    const labels = missingKeys.map((k) => `${featureLabel(k)} (${k})`);
    const detail = {
      feature: missingKeys,
      label: labels,
      reason: decisions[0]?.reason ?? "plan_does_not_grant",
      flagBlockReason: decisions[0]?.flagBlockReason,
      plan: snapshot.sub ? { id: snapshot.sub.planId, name: snapshot.sub.planName, slug: snapshot.sub.planSlug } : null,
    };
    return new AppError(
      403,
      "FEATURE_REQUIRED",
      message ?? `Funcionalidade não disponível para a sua subscrição: ${labels.join(", ")}`,
      detail,
    );
  }

  // ── Auditoria de integridade (garantia, não só gate) ──────────────────
  // Garante o invariante: "nenhuma organização com subscrição activa fica sem
  // uma feature que o seu plano concede". Detecta flags que bloqueiam por
  // engano (default desligado sem override, kill-switch, override desligado).

  async assertEntitlementIntegrity(): Promise<{
    generatedAt: string;
    totalGrantingSubscriptions: number;
    totalGrants: number;
    blockedEntitlements: EntitlementIntegrityIssue[];
    summary: Record<string, number>;
  }> {
    const [subs, { defs, overrides }] = await Promise.all([
      featuresRepository.listGrantingSubscriptions(),
      this.resolveFlagContext(),
    ]);

    const issues: EntitlementIntegrityIssue[] = [];
    let totalGrants = 0;

    for (const sub of subs) {
      const planMap = await this.resolvePlanFeatureMap(sub.planId);
      for (const key of planMap.keys() as IterableIterator<FeatureKey>) {
        totalGrants++;
        const block = resolveFlagBlockReason(defs.get(key), overrides, sub.organizationId);
        if (block) {
          issues.push({
            subscriptionId: sub.subscriptionId,
            organizationId: sub.organizationId,
            organizationName: sub.organizationName ?? null,
            planSlug: sub.planSlug,
            planName: sub.planName,
            status: sub.status,
            featureKey: key,
            featureLabel: featureLabel(key),
            blockReason: block,
            blockLabel: explainFlagBlock(defs.get(key), overrides, sub.organizationId, key).blockLabel ?? "",
          });
        }
      }
    }

    const summary: Record<string, number> = {
      kill_switch: 0,
      default_disabled: 0,
      org_override_disabled: 0,
    };
    for (const i of issues) summary[i.blockReason] = (summary[i.blockReason] ?? 0) + 1;

    return {
      generatedAt: new Date().toISOString(),
      totalGrantingSubscriptions: subs.length,
      totalGrants,
      blockedEntitlements: issues,
      summary,
    };
  }

  // ── Administração de flags ─────────────────────────────────────────────

  async listFlags(group?: string | null): Promise<{ flag: FlagRow; overridesCount: number }[]> {
    let items = await featuresRepository.listFlagsWithOverridesCount();
    if (group) items = items.filter((i) => i.flag.group === group);
    return items;
  }

  async getFlag(key: string): Promise<{ flag: FlagRow; overrides: OverrideAdminRow[] }> {
    const flag = await featuresRepository.findFeatureFlag(key);
    if (!flag) throw new AppError(404, "NOT_FOUND", "Flag não encontrado");
    const overrides = await featuresRepository.listOverridesForFlag(key);
    return { flag, overrides };
  }

  async getFlagOverrides(key: string): Promise<OverrideAdminRow[]> {
    const flag = await featuresRepository.findFeatureFlag(key);
    if (!flag) throw new AppError(404, "NOT_FOUND", "Flag não encontrado");
    return featuresRepository.listOverridesForFlag(key);
  }

  async createFlag(input: {
    key: string;
    name: string;
    description?: string | null;
    defaultEnabled: boolean;
    group?: string | null;
    sortOrder?: number;
  }): Promise<FlagRow> {
    if (!isFeatureKey(input.key)) {
      throw new AppError(400, "UNKNOWN_FEATURE", "A feature não existe no catálogo — adiciona-a primeiro em packages/shared");
    }
    if (await featuresRepository.findFeatureFlag(input.key)) {
      throw new AppError(409, "FLAG_EXISTS", "Já existe um flag para esta feature");
    }
    const flag = await featuresRepository.createFeatureFlag({ ...input, key: input.key });
    await featuresRepository.invalidateFlagsCache();
    return flag;
  }

  async updateFlag(
    key: string,
    input: { name?: string; description?: string | null; defaultEnabled?: boolean; emergencyDisabled?: boolean; group?: string | null; sortOrder?: number },
  ): Promise<FlagRow> {
    const existing = await featuresRepository.findFeatureFlag(key);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Flag não encontrado");
    const flag = await featuresRepository.updateFeatureFlag(key, input);
    await featuresRepository.invalidateFlagsCache();
    return flag!;
  }

  /** Liga/desliga o estado por defeito (toggle do painel). */
  async toggleFlagDefault(key: string): Promise<FlagRow> {
    const existing = await featuresRepository.findFeatureFlag(key);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Flag não encontrado");
    const flag = await featuresRepository.updateFeatureFlag(key, { defaultEnabled: !existing.defaultEnabled });
    await featuresRepository.invalidateFlagsCache();
    return flag!;
  }

  /** Kill-switch de emergência — desliga a feature para TODOS os âmbitos. */
  async toggleFlagEmergency(key: string): Promise<FlagRow> {
    const existing = await featuresRepository.findFeatureFlag(key);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Flag não encontrado");
    const flag = await featuresRepository.updateFeatureFlag(key, { emergencyDisabled: !existing.emergencyDisabled });
    await featuresRepository.invalidateFlagsCache();
    return flag!;
  }

  async deleteFlag(key: string): Promise<void> {
    const existing = await featuresRepository.findFeatureFlag(key);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Flag não encontrado");
    await featuresRepository.deleteFeatureFlag(key);
    await featuresRepository.invalidateFlagsCache();
  }

  async setFlagOverride(input: {
    flagKey: string;
    organizationId: string;
    enabled: boolean;
    note?: string | null;
    createdByUserId: string | null;
    expiresAt?: Date | null;
  }): Promise<OverrideAdminRow> {
    if (!isFeatureKey(input.flagKey)) {
      throw new AppError(400, "UNKNOWN_FEATURE", "A feature não existe no catálogo");
    }
    const [flag, org] = await Promise.all([
      featuresRepository.findFeatureFlag(input.flagKey),
      featuresRepository.findOrganization(input.organizationId),
    ]);
    if (!flag) throw new AppError(404, "NOT_FOUND", "Flag não encontrado");
    if (!org) throw new AppError(400, "INVALID_ORGANIZATION", "Organização não encontrada");
    const override = await featuresRepository.upsertOverride({
      flagKey: input.flagKey as FeatureKey,
      organizationId: input.organizationId,
      enabled: input.enabled,
      note: input.note,
      createdByUserId: input.createdByUserId,
      expiresAt: input.expiresAt,
    });
    await featuresRepository.invalidateFlagsCache();
    return override;
  }

  async removeFlagOverride(flagKey: string, organizationId: string): Promise<void> {
    await featuresRepository.deleteOverride(flagKey, organizationId);
    await featuresRepository.invalidateFlagsCache();
  }
}

export interface EntitlementIntegrityIssue {
  subscriptionId: string;
  organizationId: string | null;
  organizationName: string | null;
  planSlug: string;
  planName: string;
  status: string;
  featureKey: FeatureKey;
  featureLabel: string;
  blockReason: FlagBlockReason;
  blockLabel: string;
}

export const featuresService = new FeaturesService();

// Reexporta o tipo para conveniência (middleware, controllers).
export type { FeatureKey };
export { FEATURE_KEYS, featureLabel };