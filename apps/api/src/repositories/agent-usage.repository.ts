import { eq, sql } from "drizzle-orm";
import { db, agentUsage } from "@workdeal/db";

export type AgentUsageRow = typeof agentUsage.$inferSelect;

export const agentUsageRepository = {
  async insert(data: {
    organizationId?: string | null;
    userId: string;
    agentKey: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    durationMs: number;
    status: string;
    errorCode?: string | null;
  }) {
    const [row] = await db
      .insert(agentUsage)
      .values({
        organizationId: data.organizationId ?? null,
        userId: data.userId,
        agentKey: data.agentKey,
        provider: data.provider,
        model: data.model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        estimatedCostUsd: String(data.estimatedCostUsd),
        durationMs: data.durationMs,
        status: data.status,
        errorCode: data.errorCode ?? null,
      })
      .returning();
    return row;
  },

  /** Quota de custo no mês corrente (UTC) por âmbito. */
  async sumCostThisMonth(scope: { userId: string; organizationId?: string | null }) {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const conds: ReturnType<typeof eq>[] = [
      eq(agentUsage.userId, scope.userId),
      sql`${agentUsage.createdAt} >= ${monthStart}`,
    ];
    if (scope.organizationId) conds.push(eq(agentUsage.organizationId, scope.organizationId));
    const [row] = await db
      .select({ total: sql<string>`coalesce(sum(${agentUsage.estimatedCostUsd}), 0)` })
      .from(agentUsage)
      .where(sql.join(conds, sql` AND `));
    return Number(row?.total ?? "0");
  },
};
