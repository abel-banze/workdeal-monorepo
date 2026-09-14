/**
 * Critérios de ranking do directório — FONTE ÚNICA DE VERDADE.
 *
 * Ordena as empresas na listagem por relevância comercial, em camadas:
 *   1. `search_boost` do plano ativo da empresa (feature dos pacotes: Trust=1, Premium=2, Enterprise=3)
 *   2. Estado de verificação da organização (organization.verification_status)
 *   3. Selos ativos de qualidade (badges: verified, highly-rated, profile-complete)
 *   4. Recência (updated_at) como desempate
 *
 * A escala é desenhada para que cada tier de plano fique estritamente acima
 * de qualquer combinação de sinais de qualidade de um tier inferior:
 *   - boost_tier × BOOST_TIER_SCALE (1000) domina o resto
 *   - verificação × VERIFICATION_SCALE (10)
 *   - soma dos selos (max 40 < 100, não passa a barreira dos 1000)
 *
 * A expressão SQL dos repositórios é construída com estes mesmos pesos
 * (apps/api/src/lib/ranking-sql.ts). `computeRankingScore` espelha a fórmula
 * em TS, testável sem BD.
 */

/** Estados de subscrição que concedem o `search_boost` (subscription.status). */
export const ACTIVE_BOOST_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"] as const;

/** Peso por grau de `search_boost` da feature do plano (feature_value "1"|"2"|"3"). */
export const PLAN_SEARCH_BOOST_WEIGHT: Readonly<Record<number, number>> = {
  0: 0, // Free (sem search_boost)
  1: 1, // Workdeal Trust
  2: 2, // Premium
  3: 3, // Enterprise
};

/** Peso por estado de verificação da organização. */
export const VERIFICATION_STATUS_WEIGHT: Readonly<Record<string, number>> = {
  verified: 10,
  in_review: 6,
  pending: 3,
  pre_registered: 0,
  suspended: 0,
  expired: 0,
};

/** Peso por selo (badge) ativo no perfil. */
export const BADGE_SLUG_WEIGHT: Readonly<Record<string, number>> = {
  verified: 20,
  "highly-rated": 15,
  "profile-complete": 5,
};

/** Escala dos tiers do plano — mantém os níveis estritamente separados dos sinais de qualidade. */
export const BOOST_TIER_SCALE = 1000;
/** Escala da verificação dentro de um mesmo tier de plano. */
export const VERIFICATION_SCALE = 10;

/** Traduz o `feature_value` de `search_boost` ("1"|"2"|"3") para o peso de tier. */
export function parseSearchBoostValue(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || !(parsed in PLAN_SEARCH_BOOST_WEIGHT)) return 0;
  return PLAN_SEARCH_BOOST_WEIGHT[parsed];
}

export interface RankingScoreInput {
  /** Tier de search_boost do plano ativo (0-3). */
  searchBoostTier?: number;
  verificationStatus?: string | null;
  activeBadgeSlugs?: Array<string | null>;
}

/** Score puro (TS) do ranking — espelha a expressão SQL. */
export function computeRankingScore(input: RankingScoreInput): number {
  const boost = (input.searchBoostTier ?? 0) * BOOST_TIER_SCALE;
  const verification = (VERIFICATION_STATUS_WEIGHT[input.verificationStatus ?? ""] ?? 0) * VERIFICATION_SCALE;
  const badges = (input.activeBadgeSlugs ?? []).reduce((acc, slug) => acc + (slug ? (BADGE_SLUG_WEIGHT[slug] ?? 0) : 0), 0);
  return boost + verification + badges;
}