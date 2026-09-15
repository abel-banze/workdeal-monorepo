import { describe, expect, it } from "vitest";
import {
  countProposalsByStatus,
  filterAndSortProposals,
  type ProposalQuery,
  type ProposalSummary,
} from "../app/(dashboard)/dashboard/[organizationId]/tasks/[taskId]/proposals-filter";

const P = (over: Partial<ProposalSummary> & { id: string }): ProposalSummary => ({
  providerProfileName: null,
  message: "",
  priceMzn: null,
  estimatedDays: null,
  status: "submitted",
  createdAt: "2026-09-01T10:00:00.000Z",
  ...over,
});

const SAMPLE: ProposalSummary[] = [
  P({ id: "a", providerProfileName: "Canaliza Maputo", message: "Reparo urgente com garantia", priceMzn: 5000, estimatedDays: 3, status: "submitted", createdAt: "2026-09-01T10:00:00.000Z" }),
  P({ id: "b", providerProfileName: "Electro Beira", message: "Instalação eléctrica completa", priceMzn: 3000, estimatedDays: 7, status: "shortlisted", createdAt: "2026-09-03T10:00:00.000Z" }),
  P({ id: "c", providerProfileName: "Obras Nampula", message: "Orçamento sem compromisso", priceMzn: null, estimatedDays: null, status: "rejected", createdAt: "2026-09-02T10:00:00.000Z" }),
];

const Q = (over: Partial<ProposalQuery>): ProposalQuery => ({ q: "", status: "all", sort: "recent", ...over });

describe("proposals-filter", () => {
  it("ordena por mais recentes por omissão", () => {
    expect(filterAndSortProposals(SAMPLE, Q({})).map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("filtra por estado", () => {
    expect(filterAndSortProposals(SAMPLE, Q({ status: "shortlisted" })).map((p) => p.id)).toEqual(["b"]);
  });

  it("pesquisa por empresa ou mensagem (case-insensitive)", () => {
    expect(filterAndSortProposals(SAMPLE, Q({ q: "eléctrica" })).map((p) => p.id)).toEqual(["b"]);
    expect(filterAndSortProposals(SAMPLE, Q({ q: "CANALIZA" })).map((p) => p.id)).toEqual(["a"]);
    expect(filterAndSortProposals(SAMPLE, Q({ q: "  " })).length).toBe(3);
  });

  it("ordena por preço com propostas sem preço no fim", () => {
    expect(filterAndSortProposals(SAMPLE, Q({ sort: "priceAsc" })).map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(filterAndSortProposals(SAMPLE, Q({ sort: "priceDesc" })).map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("ordena por prazo com propostas sem prazo no fim", () => {
    expect(filterAndSortProposals(SAMPLE, Q({ sort: "daysAsc" })).map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("não muta o array original", () => {
    const ids = SAMPLE.map((p) => p.id);
    filterAndSortProposals(SAMPLE, Q({ sort: "priceAsc" }));
    expect(SAMPLE.map((p) => p.id)).toEqual(ids);
  });

  it("conta por estado para os chips", () => {
    expect(countProposalsByStatus(SAMPLE)).toEqual({
      all: 3,
      submitted: 1,
      shortlisted: 1,
      accepted: 0,
      rejected: 1,
      withdrawn: 0,
    });
  });
});
