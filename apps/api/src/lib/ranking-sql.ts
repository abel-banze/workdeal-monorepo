import { sql, type SQL } from "drizzle-orm";
import { badge, organization, profile, profileBadge, subscription } from "@workdeal/db";
import {
  ACTIVE_BOOST_SUBSCRIPTION_STATUSES,
  BADGE_SLUG_WEIGHT,
  BOOST_TIER_SCALE,
  VERIFICATION_SCALE,
  VERIFICATION_STATUS_WEIGHT,
} from "@workdeal/shared/lib/ranking";
import { getPlanBoostMap } from "./plan-boost.js";

/**
 * Expressões SQL de ranking do directório.
 *
 * O score total ordena por camadas estritas (ver packages/shared/src/lib/ranking.ts):
 *   boost_tier × 1000 + verificação × 10 + Σ selos  →  depois updated_at desc.
 *
 * Existe ainda uma variante "tier só" (0-3) para usar como chave secundária na
 * pesquisa textual, onde a relevância (ts_rank/similarity) continua a dominar e o
 * boost serve de desempate entre resultados com relevância próxima.
 */

/** plan_id da subscrição ativa da organização do perfil (correlated subquery). */
const activePlanIdExpr: SQL = sql`(
  SELECT ${subscription.planId}
  FROM ${subscription}
  WHERE ${subscription.organizationId} = ${profile.organizationId}
    AND ${subscription.organizationId} IS NOT NULL
    AND ${subscription.status} IN (${sql.join(ACTIVE_BOOST_SUBSCRIPTION_STATUSES.map((s) => sql`${s}`), sql`, `)})
  ORDER BY ${subscription.createdAt} DESC
  LIMIT 1
)`;

/** Exprime `plan_id → tier (0-3)` com os valores resovidos com herança (TTL cache). */
async function planBoostTierExpr(): Promise<SQL> {
  const map = await getPlanBoostMap();
  if (map.size === 0) return sql`0`;
  const whens = [...map.entries()].map(([id, tier]) => sql`WHEN ${id} THEN ${tier}`);
  return sql`(CASE ${activePlanIdExpr} ${sql.join(whens, sql` `)} ELSE 0 END)`;
}

/** Peso da verificação da organização do perfil (0..100). */
const verificationWeightExpr: SQL = sql`COALESCE((
  SELECT CASE ${organization.verificationStatus}
    ${sql.join(
      Object.entries(VERIFICATION_STATUS_WEIGHT).map(([status, w]) => sql`WHEN ${status} THEN ${w}`),
      sql` `,
    )}
    ELSE 0 END
  FROM ${organization}
  WHERE ${organization.id} = ${profile.organizationId}
), 0)`;

/** Peso dos selos ativos do perfil (0..40). */
const badgeWeightExpr: SQL = sql`COALESCE((
  SELECT SUM(CASE ${badge.slug}
    ${sql.join(
      Object.entries(BADGE_SLUG_WEIGHT).map(([slug, w]) => sql`WHEN ${slug} THEN ${w}`),
      sql` `,
    )}
    ELSE 0 END)
  FROM ${profileBadge}
  JOIN ${badge} ON ${badge.id} = ${profileBadge.badgeId}
  WHERE ${profileBadge.profileId} = ${profile.id}
    AND ${profileBadge.status} = 'active'
), 0)`;

/** Score total de ranking (chave primária na listagem default). */
export async function buildRankingScoreExpr(): Promise<SQL> {
  const boost = await planBoostTierExpr();
  return sql`(${sql`${boost} * ${BOOST_TIER_SCALE}`} + ${sql`${verificationWeightExpr} * ${VERIFICATION_SCALE}`} + ${badgeWeightExpr})`;
}

/** Só o tier do plano (0-3) — chave secundária na pesquisa textual (desempate de relevância). */
export async function buildSearchBoostTierExpr(): Promise<SQL> {
  return planBoostTierExpr();
}