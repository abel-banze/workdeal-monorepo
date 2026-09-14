import { eq } from "drizzle-orm";
import { db, plan } from "@workdeal/db";
import { parseSearchBoostValue } from "@workdeal/shared/lib/ranking";
import { featuresService } from "../services/features.service.js";
import { ttlCache } from "./ttl-cache.js";

/**
 * Mapa `planId → grau de search_boost`. O valor de cada plano é derivado do
 * resolvedor unificado de features (`featuresService.resolvePlanFeatureMap` —
 * próprio plano com prioridade sobre a herança Enterprise → Premium → Trust → Free),
 * que é o mesmo gráfico de planos em cache usado pelos gates de features.
 * Continua a limitar-se aos planos activos, como antes.
 */
async function loadPlanBoostNodes(): Promise<Array<{ id: string; boostTier: number }>> {
  const plans = await db.select({ id: plan.id }).from(plan).where(eq(plan.isActive, true));
  const nodes = await Promise.all(
    plans.map(async (p) => ({
      id: p.id,
      boostTier: parseSearchBoostValue((await featuresService.resolvePlanFeatureMap(p.id)).get("search_boost") ?? null),
    })),
  );
  return nodes;
}

// Planos mudam raramente (só admin) — TTL curto, tolerante a stale.
const getPlanBoostNodesCached = ttlCache(loadPlanBoostNodes, 60_000);

/** Mapa `planId → grau de search_boost` com a herança já resolvida. */
export async function getPlanBoostMap(): Promise<Map<string, number>> {
  const nodes = await getPlanBoostNodesCached();
  return new Map(nodes.map((n) => [n.id, n.boostTier]));
}