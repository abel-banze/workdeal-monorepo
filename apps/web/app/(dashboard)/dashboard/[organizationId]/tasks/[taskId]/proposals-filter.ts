/**
 * Filtragem, pesquisa e ordenação de propostas — lógica pura da mesa de decisão.
 * Sem React nem Next: coberta por teste unitário em apps/web/tests/.
 */

export type ProposalStatusFilter = "all" | "submitted" | "shortlisted" | "accepted" | "rejected" | "withdrawn";

export type ProposalSort = "recent" | "priceAsc" | "priceDesc" | "daysAsc";

export interface ProposalSummary {
  id: string;
  providerProfileName: string | null;
  message: string;
  priceMzn: number | null;
  estimatedDays: number | null;
  status: string;
  createdAt: string;
}

export interface ProposalQuery {
  q: string;
  status: ProposalStatusFilter;
  sort: ProposalSort;
}

export const DEFAULT_PROPOSAL_QUERY: ProposalQuery = { q: "", status: "all", sort: "recent" };

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

/** Aplica pesquisa + filtro de estado + ordenação; nunca muta o array original. */
export function filterAndSortProposals<T extends ProposalSummary>(proposals: T[], query: ProposalQuery): T[] {
  return proposals
    .filter((p) => (query.status === "all" ? true : p.status === query.status))
    .filter((p) => matchesQuery(p, query.q))
    .slice()
    .sort((a, b) => compareProposals(a, b, query.sort));
}
