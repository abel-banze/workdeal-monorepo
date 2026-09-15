import { describe, it, expect, vi, beforeEach } from "vitest";

// Gate premium do dashboard analítico: perfis de empresa exigem a feature
// analytics_visits_contacts (senão a UI cairia no fallback de zeros a fingir
// "sem tráfego"); perfis pessoais não passam pela gate.
const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  requireFeature: vi.fn(),
  dbRows: [] as { userId: string | null; organizationId: string | null }[],
  repo: {
    getDailyVisits: vi.fn(),
    getTotalStats: vi.fn(),
    getOrigins: vi.fn(),
    getProvinceDistribution: vi.fn(),
    getVisitorActions: vi.fn(),
    getContactClicks: vi.fn(),
    getQuotesCount: vi.fn(),
    getRecentVisitors: vi.fn(),
  },
}));

vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));
vi.mock("@workdeal/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => mocks.dbRows }) }) }) },
  profile: {},
}));
vi.mock("../repositories/analytics.repository.js", () => ({ analyticsRepository: mocks.repo }));
vi.mock("./features.service.js", () => ({ featuresService: { requireFeature: mocks.requireFeature } }));

import { analyticsService } from "./analytics.service.js";
import type { AuthUser } from "@workdeal/shared";

const member = { id: "u-member", email: "membro@empresa.co.mz" } as unknown as AuthUser;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dbRows = [{ userId: null, organizationId: "org-1" }];
  mocks.getOrgRole.mockResolvedValue("admin");
  mocks.requireFeature.mockResolvedValue(undefined);
  mocks.repo.getDailyVisits.mockResolvedValue([]);
  mocks.repo.getTotalStats.mockResolvedValue({ total30: 0, unicos30: 0, growth: 0 });
  mocks.repo.getOrigins.mockResolvedValue([]);
  mocks.repo.getProvinceDistribution.mockResolvedValue([]);
  mocks.repo.getVisitorActions.mockResolvedValue([]);
  mocks.repo.getContactClicks.mockResolvedValue([]);
  mocks.repo.getQuotesCount.mockResolvedValue(0);
  mocks.repo.getRecentVisitors.mockResolvedValue([]);
});

describe("getDashboard — gate premium analytics_visits_contacts", () => {
  it("bloqueia perfil de empresa sem a feature (403, sem ler dados)", async () => {
    mocks.requireFeature.mockRejectedValue(Object.assign(new Error("Funcionalidade indisponível"), { status: 403, code: "FEATURE_REQUIRED" }));
    await expect(analyticsService.getDashboard(member, "prof-1")).rejects.toMatchObject({ status: 403 });
    expect(mocks.requireFeature).toHaveBeenCalledWith({ userId: "u-member", organizationId: "org-1" }, "analytics_visits_contacts");
    expect(mocks.repo.getDailyVisits).not.toHaveBeenCalled();
  });

  it("permite com a feature e devolve o dashboard", async () => {
    const res = await analyticsService.getDashboard(member, "prof-1");
    expect(mocks.repo.getDailyVisits).toHaveBeenCalledOnce();
    expect(res.total30).toBe(0);
  });

  it("perfil pessoal não exige a feature", async () => {
    mocks.dbRows = [{ userId: "u-member", organizationId: null }];
    const res = await analyticsService.getDashboard(member, "prof-1");
    expect(mocks.requireFeature).not.toHaveBeenCalled();
    expect(res.total30).toBe(0);
  });
});
