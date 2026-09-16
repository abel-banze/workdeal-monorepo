/**
 * Filtragem, pesquisa e ordenação de propostas — lógica pura da mesa de decisão.
 * Sem React nem Next: coberta por teste unitário em apps/web/tests/.
 */

export type ProposalStatusFilter = "all" | "submitted" | "shortlisted" | "accepted" | "rejected" | "withdrawn";

export type ProposalSort = "recent" | "priceAsc" | "priceDesc" | "daysAsc";

export interface ProviderBadgeLite {
  slug: string;
  name: string;
  type: string;
}

export interface ProposalSummary {
  id: string;
  providerProfileName: string | null;
  message: string;
  priceMzn: number | null;
  estimatedDays: number | null;
  status: string;
  createdAt: string;
  providerProvince: string | null;
  providerDistrict: string | null;
  providerBadges: ProviderBadgeLite[];
}

export interface ProposalQuery {
  q: string;
  status: ProposalStatusFilter;
  sort: ProposalSort;
  /** Tecto/preço: propostas sem preço contam como "sob consulta" e passam sempre. */
  priceMin: number | null;
  priceMax: number | null;
  /** Prazo máximo de entrega em dias (null = sem limite). */
  maxDays: number | null;
  /** Províncias do proponente (vazio = todas). */
  provinces: string[];
  /** Slugs de selos exigidos — a proposta passa se tiver pelo menos um. */
  badgeSlugs: string[];
}

/**
 * Tecto de propostas por pedido — a API rejeita `limit` acima de 50
 * (`Too big: expected number to be <=50`). A paginação seguinte é feita
 * no cliente (Mostrar mais).
 */
export const TASK_PROPOSALS_FETCH_LIMIT = 50;

export const DEFAULT_PROPOSAL_QUERY: ProposalQuery = {
  q: "",
  status: "all",
  sort: "recent",
  priceMin: null,
  priceMax: null,
  maxDays: null,
  provinces: [],
  badgeSlugs: [],
};

/** Contagens por estado para os chips do filtro (inclui total em `all`). */
export function countProposalsByStatus<T extends ProposalSummary>(proposals: T[]): Record<ProposalStatusFilter, number> {
  const counts: Record<ProposalStatusFilter, number> = {
    all: proposals.length,
    submitted: 0,
    shortlisted: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
  };
  for (const p of proposals) {
    if (p.status in counts && p.status !== "all") counts[p.status as Exclude<ProposalStatusFilter, "all">] += 1;
  }
  return counts;
}

/** Facetas para a sheet de filtros: províncias e selos presentes na lista. */
export function proposalFacets<T extends ProposalSummary>(proposals: T[]): {
  provinces: string[];
  badges: ProviderBadgeLite[];
} {
  const provinces = new Set<string>();
  const badges = new Map<string, ProviderBadgeLite>();
  for (const p of proposals) {
    if (p.providerProvince) provinces.add(p.providerProvince);
    for (const b of p.providerBadges ?? []) {
      if (!badges.has(b.slug)) badges.set(b.slug, b);
    }
  }
  return {
    provinces: [...provinces].sort((a, b) => a.localeCompare(b, "pt-MZ")),
    badges: [...badges.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-MZ")),
  };
}

function matchesQuery<T extends ProposalSummary>(p: T, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    (p.providerProfileName ?? "").toLowerCase().includes(needle) ||
    (p.message ?? "").toLowerCase().includes(needle)
  );
}

function compareProposals(a: ProposalSummary, b: ProposalSummary, sort: ProposalSort): number {
  switch (sort) {
    case "priceAsc":
      return (a.priceMzn ?? Number.POSITIVE_INFINITY) - (b.priceMzn ?? Number.POSITIVE_INFINITY);
    case "priceDesc":
      return (b.priceMzn ?? Number.NEGATIVE_INFINITY) - (a.priceMzn ?? Number.NEGATIVE_INFINITY);
    case "daysAsc":
      return (a.estimatedDays ?? Number.POSITIVE_INFINITY) - (b.estimatedDays ?? Number.POSITIVE_INFINITY);
    case "recent":
    default:
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
}

/** Conta quantos filtros avançados estão activos (para o selo do botão Filtros). */
export function countActiveFilters(query: ProposalQuery): number {
  let n = 0;
  if (query.priceMin != null || query.priceMax != null) n += 1;
  if (query.maxDays != null) n += 1;
  if (query.provinces.length > 0) n += 1;
  if (query.badgeSlugs.length > 0) n += 1;
  return n;
}

/** Aplica pesquisa + filtros + ordenação; nunca muta o array original. */
export function filterAndSortProposals<T extends ProposalSummary>(proposals: T[], query: ProposalQuery): T[] {
  return proposals
    .filter((p) => (query.status === "all" ? true : p.status === query.status))
    .filter((p) => matchesQuery(p, query.q))
    .filter((p) => {
      if (p.priceMzn == null) return true;
      if (query.priceMin != null && p.priceMzn < query.priceMin) return false;
      if (query.priceMax != null && p.priceMzn > query.priceMax) return false;
      return true;
    })
    .filter((p) => {
      if (query.maxDays == null) return true;
      return p.estimatedDays != null && p.estimatedDays <= query.maxDays;
    })
    .filter((p) => {
      if (query.provinces.length === 0) return true;
      return p.providerProvince != null && query.provinces.includes(p.providerProvince);
    })
    .filter((p) => {
      if (query.badgeSlugs.length === 0) return true;
      const slugs = new Set((p.providerBadges ?? []).map((b) => b.slug));
      return query.badgeSlugs.some((s) => slugs.has(s));
    })
    .slice()
    .sort((a, b) => compareProposals(a, b, query.sort));
}
