import { describe, expect, it } from "vitest";
import {
  TASK_PROPOSALS_FETCH_LIMIT,
  countActiveFilters,
  countProposalsByStatus,
  filterAndSortProposals,
  proposalFacets,
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
  providerProvince: null,
  providerDistrict: null,
  providerBadges: [],
  ...over,
});

const VERIFIED = { slug: "verificada", name: "Verificada", type: "trust" };
const PREMIUM = { slug: "premium", name: "Premium", type: "paid" };

const SAMPLE: ProposalSummary[] = [
  P({ id: "a", providerProfileName: "Canaliza Maputo", message: "Reparo urgente com garantia", priceMzn: 5000, estimatedDays: 3, status: "submitted", createdAt: "2026-09-01T10:00:00.000Z", providerProvince: "Maputo", providerDistrict: "KaMpfumu", providerBadges: [VERIFIED] }),
  P({ id: "b", providerProfileName: "Electro Beira", message: "Instalação eléctrica completa", priceMzn: 3000, estimatedDays: 7, status: "shortlisted", createdAt: "2026-09-03T10:00:00.000Z", providerProvince: "Sofala", providerDistrict: "Beira", providerBadges: [VERIFIED, PREMIUM] }),
  P({ id: "c", providerProfileName: "Obras Nampula", message: "Orçamento sem compromisso", priceMzn: null, estimatedDays: null, status: "rejected", createdAt: "2026-09-02T10:00:00.000Z", providerProvince: "Nampula", providerDistrict: null, providerBadges: [] }),
];

const Q = (over: Partial<ProposalQuery>): ProposalQuery => ({
  q: "",
  status: "all",
  sort: "recent",
  priceMin: null,
  priceMax: null,
  maxDays: null,
  provinces: [],
  badgeSlugs: [],
  ...over,
});

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

  it("filtra por intervalo de preço; sem preço passa sempre (sob consulta)", () => {
    expect(filterAndSortProposals(SAMPLE, Q({ sort: "priceAsc", priceMax: 4000 })).map((p) => p.id)).toEqual(["b", "c"]);
    expect(filterAndSortProposals(SAMPLE, Q({ sort: "priceAsc", priceMin: 4000 })).map((p) => p.id)).toEqual(["a", "c"]);
    expect(filterAndSortProposals(SAMPLE, Q({ priceMin: 4000, priceMax: 6000 })).map((p) => p.id)).toEqual(["c", "a"]);
  });

  it("filtra por prazo máximo; sem prazo não passa", () => {
    expect(filterAndSortProposals(SAMPLE, Q({ maxDays: 5 })).map((p) => p.id)).toEqual(["a"]);
  });

  it("filtra por província do proponente", () => {
    expect(filterAndSortProposals(SAMPLE, Q({ provinces: ["Sofala", "Nampula"] })).map((p) => p.id)).toEqual(["b", "c"]);
  });

  it("filtra por selos (basta um dos exigidos)", () => {
    expect(filterAndSortProposals(SAMPLE, Q({ badgeSlugs: ["premium"] })).map((p) => p.id)).toEqual(["b"]);
    expect(filterAndSortProposals(SAMPLE, Q({ badgeSlugs: ["verificada"] })).map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("combina filtros", () => {
    expect(
      filterAndSortProposals(SAMPLE, Q({ status: "submitted", priceMax: 6000, provinces: ["Maputo"] })).map((p) => p.id),
    ).toEqual(["a"]);
  });

  it("deriva facetas (províncias e selos presentes)", () => {
    const { provinces, badges } = proposalFacets(SAMPLE);
    expect(provinces).toEqual(["Maputo", "Nampula", "Sofala"]);
    expect(badges.map((b) => b.slug).sort()).toEqual(["premium", "verificada"]);
  });

  it("respeita o tecto da API (limit <= 50) — regressão do erro Too big", () => {
    expect(TASK_PROPOSALS_FETCH_LIMIT).toBeLessThanOrEqual(50);
    expect(Number.isInteger(TASK_PROPOSALS_FETCH_LIMIT)).toBe(true);
  });

  it("conta filtros avançados activos", () => {
    expect(countActiveFilters(Q({}))).toBe(0);
    expect(countActiveFilters(Q({ priceMax: 5000, maxDays: 7, provinces: ["Maputo"], badgeSlugs: ["x"] }))).toBe(4);
    expect(countActiveFilters(Q({ priceMin: 100 }))).toBe(1);
  });
});
