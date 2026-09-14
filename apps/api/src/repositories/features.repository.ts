import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, featureFlag, featureFlagOverride, organization, plan, planFeature, subscription } from "@workdeal/db";
import { FEATURE_SUBSCRIPTION_GRANTING_STATUSES, type FeatureKey } from "@workdeal/shared";
import { ttlCache } from "../lib/ttl-cache.js";

// ── Tipos de linha ────────────────────────────────────────────────────────

export interface FlagRow {
  key: FeatureKey;
  name: string;
  description: string | null;
  defaultEnabled: boolean;
  emergencyDisabled: boolean;
  group: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OverrideRow {
  flagKey: FeatureKey;
  organizationId: string;
  enabled: boolean;
  expiresAt: Date | null;
}

export interface OverrideAdminRow extends OverrideRow {
  id: string;
  note: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  organizationName: string | null;
}

export interface PlanFeatureSeedRow {
  planId: string;
  featureKey: string;
  featureValue: string | null;
}

export interface GrantingSubscriptionRow {
  subscriptionId: string;
  organizationId: string | null;
  organizationName: string | null;
  planId: string;
  planSlug: string;
  planName: string;
  status: string;
}

// ── Grafo de planos (referência quase estática — só admin edita) ─────────

interface PlanGraphNode {
  id: string;
  inheritFromPlanId: string | null;
}

interface PlanGraph {
  nodes: PlanGraphNode[];
  features: PlanFeatureSeedRow[];
}

async function loadPlanGraph(): Promise<PlanGraph> {
  const [nodes, features] = await Promise.all([
    db.select({ id: plan.id, inheritFromPlanId: plan.inheritFromPlanId }).from(plan),
    db
      .select({ planId: planFeature.planId, featureKey: planFeature.featureKey, featureValue: planFeature.featureValue })
      .from(planFeature),
  ]);
  return { nodes, features };
}

// Planos mudam raramente (só admin) — TTL curto e tolerante a stale.
const getPlanGraphCached = ttlCache(loadPlanGraph, 30_000);

// Features catalog/flag define (referência quase estática — só admin edita)
const getFlagsCached = ttlCache(async () => db.select().from(featureFlag).orderBy(asc(featureFlag.sortOrder), asc(featureFlag.createdAt)), 15_000);
const getOverridesCached = ttlCache(async () => db.select().from(featureFlagOverride), 15_000);

// ── Repositório ───────────────────────────────────────────────────────────

export const featuresRepository = {
  /**
   * Features resolvidas de um plano (próprias + herança), com o próprio plano
   * a ter prioridade sobre os pais — mesma regra do billing service, mas numa
   * única query em vez de N. Fonte para `resolveFeatureMap` do shared.
   */
  async resolvePlanFeatures(planId: string): Promise<PlanFeatureSeedRow[]> {
    const graph = await getPlanGraphCached();
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const byPlan = new Map<string, PlanFeatureSeedRow[]>();
    for (const f of graph.features) {
      const arr = byPlan.get(f.planId) ?? [];
      arr.push(f);
      byPlan.set(f.planId, arr);
    }

    const resolved: PlanFeatureSeedRow[] = [];
    const seen = new Set<string>();
    const visited = new Set<string>();
    let current = byId.get(planId) ?? null;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      for (const f of byPlan.get(current.id) ?? []) {
        if (seen.has(f.featureKey)) continue;
        seen.add(f.featureKey);
        resolved.push({ planId, featureKey: f.featureKey, featureValue: f.featureValue });
      }
      current = current.inheritFromPlanId ? (byId.get(current.inheritFromPlanId) ?? null) : null;
    }
    return resolved;
  },

  async invalidatePlanGraphCache(): Promise<void> {
    getPlanGraphCached.invalidate();
  },

  // ── Subscrições que concedem features (auditoria de integridade) ─────────

  /**
   * Subscrições em estado que concede features (active/past_due/trialing),
   * com plano resolvido e organização. Usado pela auditoria de integridade:
   * para cada sub devolve-se o plano e compara-se com os flags operacionais.
   * Limite de 500 para a auditoria não travar a BD (admin interno).
   */
  async listGrantingSubscriptions(): Promise<GrantingSubscriptionRow[]> {
    return db
      .select({
        subscriptionId: subscription.id,
        organizationId: subscription.organizationId,
        organizationName: organization.name,
        planId: subscription.planId,
        planSlug: plan.slug,
        planName: plan.name,
        status: subscription.status,
      })
      .from(subscription)
      .innerJoin(plan, eq(subscription.planId, plan.id))
      .leftJoin(organization, eq(subscription.organizationId, organization.id))
      .where(inArray(subscription.status, [...FEATURE_SUBSCRIPTION_GRANTING_STATUSES]))
      .limit(500);
  },

  // ── Flags ───────────────────────────────────────────────────────────────

  async listFeatureFlags(): Promise<FlagRow[]> {
    const rows = await getFlagsCached();
    return rows as FlagRow[];
  },

  async findFeatureFlag(key: string): Promise<FlagRow | null> {
    const [row] = await db.select().from(featureFlag).where(eq(featureFlag.key, key)).limit(1);
    return (row as FlagRow | undefined) ?? null;
  },

  async createFeatureFlag(data: { key: FeatureKey; name: string; description?: string | null; defaultEnabled: boolean; group?: string | null; sortOrder?: number }): Promise<FlagRow> {
    const [row] = await db
      .insert(featureFlag)
      .values({
        key: data.key,
        name: data.name,
        description: data.description ?? null,
        defaultEnabled: data.defaultEnabled,
        group: data.group ?? null,
        sortOrder: data.sortOrder ?? 100,
        updatedAt: new Date(),
      })
      .returning();
    return row as FlagRow;
  },

  async updateFeatureFlag(key: string, data: Partial<Omit<FlagRow, "key" | "createdAt">>): Promise<FlagRow | null> {
    const [row] = await db
      .update(featureFlag)
      .set({ ...data, key: undefined, createdAt: undefined, updatedAt: new Date() })
      .where(eq(featureFlag.key, key))
      .returning();
    return (row as FlagRow | undefined) ?? null;
  },

  async deleteFeatureFlag(key: string): Promise<boolean> {
    const [row] = await db.delete(featureFlag).where(eq(featureFlag.key, key)).returning({ key: featureFlag.key });
    return !!row;
  },

  async countFlagsInGroup(group: string | null): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(featureFlag)
      .where(group ? eq(featureFlag.group, group) : sql`${featureFlag.group} is null`);
    return row?.count ?? 0;
  },

  // ── Sobreposições ───────────────────────────────────────────────────────

  async findOrganization(id: string): Promise<{ id: string; name: string } | null> {
    const [row] = await db.select({ id: organization.id, name: organization.name }).from(organization).where(eq(organization.id, id)).limit(1);
    return row ?? null;
  },

  /** Todas as sobreposições (tabela pequena) — usadas na resolução por âmbito. */
  async listOverrides(): Promise<OverrideRow[]> {
    const rows = await getOverridesCached();
    return rows.map((r) => ({
      flagKey: r.flagKey as FeatureKey,
      organizationId: r.organizationId,
      enabled: r.enabled,
      expiresAt: r.expiresAt,
    }));
  },

  /** Sobreposições de um flag com dados da organização (painel admin). */
  async listOverridesForFlag(flagKey: string): Promise<OverrideAdminRow[]> {
    const rows = await db
      .select({
        id: featureFlagOverride.id,
        flagKey: featureFlagOverride.flagKey,
        organizationId: featureFlagOverride.organizationId,
        enabled: featureFlagOverride.enabled,
        expiresAt: featureFlagOverride.expiresAt,
        note: featureFlagOverride.note,
        createdByUserId: featureFlagOverride.createdByUserId,
        createdAt: featureFlagOverride.createdAt,
        organizationName: organization.name,
      })
      .from(featureFlagOverride)
      .leftJoin(organization, eq(featureFlagOverride.organizationId, organization.id))
      .where(eq(featureFlagOverride.flagKey, flagKey))
      .orderBy(desc(featureFlagOverride.createdAt));
    return rows.map((r) => ({ ...r, flagKey: r.flagKey as FeatureKey }));
  },

  async upsertOverride(data: { flagKey: FeatureKey; organizationId: string; enabled: boolean; note?: string | null; createdByUserId: string | null; expiresAt?: Date | null }): Promise<OverrideAdminRow> {
    const [row] = await db
      .insert(featureFlagOverride)
      .values({
        id: crypto.randomUUID(),
        flagKey: data.flagKey,
        organizationId: data.organizationId,
        enabled: data.enabled,
        note: data.note ?? null,
        createdByUserId: data.createdByUserId,
        expiresAt: data.expiresAt ?? null,
      })
      .onConflictDoUpdate({
        target: [featureFlagOverride.flagKey, featureFlagOverride.organizationId],
        set: {
          enabled: data.enabled,
          note: data.note ?? null,
          createdByUserId: data.createdByUserId,
          expiresAt: data.expiresAt ?? null,
        },
      })
      .returning();
    return {
      ...(row as OverrideRow & { id: string; note: string | null; createdByUserId: string | null; createdAt: Date; organizationName: null }),
      organizationName: (await this.findOrganization(data.organizationId))?.name ?? null,
    };
  },

  async deleteOverride(flagKey: string, organizationId: string): Promise<boolean> {
    const [row] = await db
      .delete(featureFlagOverride)
      .where(and(eq(featureFlagOverride.flagKey, flagKey), eq(featureFlagOverride.organizationId, organizationId)))
      .returning({ id: featureFlagOverride.id });
    return !!row;
  },

  async invalidateFlagsCache(): Promise<void> {
    getFlagsCached.invalidate();
    getOverridesCached.invalidate();
  },

  async listFlagsWithOverridesCount(): Promise<{ flag: FlagRow; overridesCount: number }[]> {
    const [flags, overrides] = await Promise.all([this.listFeatureFlags(), this.listOverrides()]);
    const counts = new Map<string, number>();
    for (const o of overrides) counts.set(o.flagKey, (counts.get(o.flagKey) ?? 0) + 1);
    return flags.map((flag) => ({ flag, overridesCount: counts.get(flag.key) ?? 0 }));
  },
};