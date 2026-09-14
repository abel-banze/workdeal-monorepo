import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, aiSettings, aiCredential, agentUsage, organization, user } from "@workdeal/db";
import { ttlCache } from "../lib/ttl-cache.js";
import type { AiUsageQueryInput } from "@workdeal/shared";

export type AiSettingsRow = typeof aiSettings.$inferSelect;
export type AiCredentialRow = typeof aiCredential.$inferSelect;

type Json = Record<string, unknown>;

// Config global é single-row e muda raramente — TTL curto, tolerante a stale.
const getSettingsCached = ttlCache(async () => {
  const [row] = await db.select().from(aiSettings).limit(1);
  return row ?? null;
}, 15_000);

const getCredentialsCached = ttlCache(async () => db.select().from(aiCredential), 15_000);

function usageFilters(q: AiUsageQueryInput) {
  const conds: ReturnType<typeof gte>[] = [];
  if (q.from) conds.push(gte(agentUsage.createdAt, new Date(q.from)));
  if (q.to) conds.push(lte(agentUsage.createdAt, new Date(q.to)));
  if (q.agentKey) conds.push(eq(agentUsage.agentKey, q.agentKey));
  if (q.provider) conds.push(eq(agentUsage.provider, q.provider));
  return conds.length ? and(...conds) : undefined;
}

export const aiSettingsRepository = {
  // ── Settings (single-row) ───────────────────────────────────────────────

  async getSettings(): Promise<AiSettingsRow | null> {
    return getSettingsCached();
  },

  async upsertSettings(data: { provider: string; modelOverrides: Json; budgets: Json }): Promise<AiSettingsRow> {
    const [row] = await db
      .insert(aiSettings)
      .values({
        id: "default",
        provider: data.provider,
        modelOverrides: data.modelOverrides,
        budgets: data.budgets,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aiSettings.id,
        set: {
          provider: data.provider,
          modelOverrides: data.modelOverrides,
          budgets: data.budgets,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!row) throw new Error("ai_settings: upsert não devolveu linha");
    getSettingsCached.invalidate();
    return row;
  },

  async clearSettingsOverrides(): Promise<void> {
    await db
      .update(aiSettings)
      .set({ modelOverrides: {}, budgets: {}, updatedAt: new Date() })
      .where(eq(aiSettings.id, "default"));
    getSettingsCached.invalidate();
  },

  // ── Credenciais (chaves encriptadas) ────────────────────────────────────

  async getCredential(provider: string): Promise<AiCredentialRow | null> {
    const [row] = await db.select().from(aiCredential).where(eq(aiCredential.provider, provider)).limit(1);
    return row ?? null;
  },

  async listCredentials(): Promise<AiCredentialRow[]> {
    return getCredentialsCached();
  },

  async upsertCredential(provider: string, apiKeyEncrypted: string): Promise<AiCredentialRow> {
    const [row] = await db
      .insert(aiCredential)
      .values({ provider, apiKeyEncrypted, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: aiCredential.provider,
        set: { apiKeyEncrypted, updatedAt: new Date() },
      })
      .returning();
    if (!row) throw new Error("ai_credentials: upsert não devolveu linha");
    getCredentialsCached.invalidate();
    return row;
  },

  async deleteCredential(provider: string): Promise<boolean> {
    const [row] = await db
      .delete(aiCredential)
      .where(eq(aiCredential.provider, provider))
      .returning({ provider: aiCredential.provider });
    getCredentialsCached.invalidate();
    return !!row;
  },

  /**
   * Config runtime consolidada: settings + credenciais encriptadas (o serviço
   * desencripta). Devolve-nos tudo o que o motor precisa, num só acesso.
   */
  async getRuntimeSnapshot(): Promise<{ settings: AiSettingsRow | null; credentials: AiCredentialRow[] }> {
    const [settings, credentials] = await Promise.all([getSettingsCached(), getCredentialsCached()]);
    return { settings, credentials };
  },

  // ── Telemetria (agent_usage) ────────────────────────────────────────────

  async getUsageTotals(q: AiUsageQueryInput) {
    const [row] = await db
      .select({
        runs: sql<number>`count(*)::int`,
        ok: sql<number>`count(*) filter (where ${agentUsage.status} = 'ok')::int`,
        errors: sql<number>`count(*) filter (where ${agentUsage.status} <> 'ok')::int`,
        inputTokens: sql<number>`coalesce(sum(${agentUsage.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${agentUsage.outputTokens}), 0)::int`,
        costUsd: sql<string>`coalesce(sum(${agentUsage.estimatedCostUsd}), 0)`,
        avgDurationMs: sql<number>`coalesce(avg(${agentUsage.durationMs}), 0)::int`,
      })
      .from(agentUsage)
      .where(usageFilters(q));
    return row
      ? {
          runs: row.runs ?? 0,
          ok: row.ok ?? 0,
          errors: row.errors ?? 0,
          inputTokens: row.inputTokens ?? 0,
          outputTokens: row.outputTokens ?? 0,
          costUsd: Number(row.costUsd ?? "0"),
          avgDurationMs: row.avgDurationMs ?? 0,
        }
      : null;
  },

  async getUsageByAgent(q: AiUsageQueryInput) {
    const rows = await db
      .select({
        agentKey: agentUsage.agentKey,
        provider: agentUsage.provider,
        runs: sql<number>`count(*)::int`,
        ok: sql<number>`count(*) filter (where ${agentUsage.status} = 'ok')::int`,
        errors: sql<number>`count(*) filter (where ${agentUsage.status} <> 'ok')::int`,
        costUsd: sql<string>`coalesce(sum(${agentUsage.estimatedCostUsd}), 0)`,
      })
      .from(agentUsage)
      .where(usageFilters(q))
      .groupBy(agentUsage.agentKey, agentUsage.provider)
      .orderBy(desc(sql`count(*)`));
    return rows.map((r) => ({ ...r, costUsd: Number(r.costUsd), errorRate: r.runs ? +((r.errors / r.runs) * 100).toFixed(2) : 0 }));
  },

  async getUsageByProvider(q: AiUsageQueryInput) {
    const rows = await db
      .select({
        provider: agentUsage.provider,
        runs: sql<number>`count(*)::int`,
        costUsd: sql<string>`coalesce(sum(${agentUsage.estimatedCostUsd}), 0)`,
      })
      .from(agentUsage)
      .where(usageFilters(q))
      .groupBy(agentUsage.provider)
      .orderBy(desc(sql`count(*)`));
    return rows.map((r) => ({ ...r, costUsd: Number(r.costUsd) }));
  },

  async getUsageDaily(q: AiUsageQueryInput & { maxDays?: number }) {
    const range = usageFilters({ ...q, to: q.to, from: q.from });
    const rows = await db
      .select({
        day: sql<string>`to_char(${agentUsage.createdAt}, 'YYYY-MM-DD')`,
        runs: sql<number>`count(*)::int`,
        costUsd: sql<string>`coalesce(sum(${agentUsage.estimatedCostUsd}), 0)`,
      })
      .from(agentUsage)
      .where(range)
      .groupBy(sql`to_char(${agentUsage.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${agentUsage.createdAt}, 'YYYY-MM-DD') desc`)
      .limit(q.maxDays ?? 30);
    return rows.map((r) => ({ day: r.day, runs: r.runs ?? 0, costUsd: Number(r.costUsd) })).reverse();
  },

  async getRecentRuns(limit = 50) {
    const rows = await db
      .select({
        id: agentUsage.id,
        agentKey: agentUsage.agentKey,
        provider: agentUsage.provider,
        model: agentUsage.model,
        status: agentUsage.status,
        errorCode: agentUsage.errorCode,
        inputTokens: agentUsage.inputTokens,
        outputTokens: agentUsage.outputTokens,
        costUsd: agentUsage.estimatedCostUsd,
        durationMs: agentUsage.durationMs,
        createdAt: agentUsage.createdAt,
        organizationName: organization.name,
        userId: agentUsage.userId,
        userName: user.name,
      })
      .from(agentUsage)
      .leftJoin(organization, eq(agentUsage.organizationId, organization.id))
      .leftJoin(user, eq(agentUsage.userId, user.id))
      .orderBy(desc(agentUsage.createdAt))
      .limit(limit);
    return rows.map((r) => ({ ...r, costUsd: Number(r.costUsd) }));
  },
};