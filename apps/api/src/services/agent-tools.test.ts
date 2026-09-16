import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "@workdeal/shared";

const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  profilesRepo: { listProfiles: vi.fn() },
  tasksRepo: {
    findById: vi.fn(),
    list: vi.fn(),
    listByRequester: vi.fn(),
    listProposals: vi.fn(),
    listProposalsByProviders: vi.fn(),
    getUserProfileIds: vi.fn(),
  },
  negotiationsRepo: {
    listManagerOrgIds: vi.fn(),
    listThreadsForRequester: vi.fn(),
    listThreadsForProvider: vi.fn(),
  },
  profilesService: { getPublicProfile: vi.fn() },
  tasksService: { getTask: vi.fn() },
}));

vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));
vi.mock("../repositories/profiles.repository.js", () => ({ profilesRepository: mocks.profilesRepo }));
vi.mock("../repositories/tasks.repository.js", () => ({ tasksRepository: mocks.tasksRepo }));
vi.mock("../repositories/negotiations.repository.js", () => ({ negotiationsRepository: mocks.negotiationsRepo }));
vi.mock("./profiles.service.js", () => ({ profilesService: mocks.profilesService }));
vi.mock("./tasks.service.js", () => ({ tasksService: mocks.tasksService }));

import { buildAssistantTools } from "./agent-tools.js";

const USER = { id: "u1", email: "c@x.mz", name: "Carla" } as unknown as AuthUser;

function tool(name: string) {
  const tools = buildAssistantTools({ user: USER, organizationId: null });
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} em falta`);
  return t;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrgRole.mockResolvedValue(null);
  mocks.tasksRepo.getUserProfileIds.mockResolvedValue([]);
  mocks.negotiationsRepo.listManagerOrgIds.mockResolvedValue([]);
});

describe("agent-tools — catálogo", () => {
  it("expõe as 6 tools com schemas válidos", () => {
    const tools = buildAssistantTools({ user: USER, organizationId: "org-1" });
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["get_profile", "get_task", "my_activity", "search_profiles", "search_tasks", "task_proposals_summary"].sort(),
    );
    for (const t of tools) {
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.inputSchema).toBeDefined();
    }
  });
});

describe("agent-tools — search_profiles", () => {
  it("devolve subconjunto público (sem emails nem dados internos)", async () => {
    mocks.profilesRepo.listProfiles.mockResolvedValue({
      total: 1,
      items: [
        {
          name: "Canaliza Lda",
          slug: "canaliza",
          tagline: "Canalização 24h",
          province: "Maputo",
          badges: [{ slug: "v", name: "Verificada", type: "trust" }],
          email: "privado@x.mz",
          phone: "+258840000000",
        },
      ],
    });
    const res = (await tool("search_profiles").execute({ q: "canal", limit: 5 })) as {
      items: Record<string, unknown>[];
    };
    expect(res.items[0]).toEqual({
      name: "Canaliza Lda",
      slug: "canaliza",
      tagline: "Canalização 24h",
      province: "Maputo",
      badges: ["Verificada"],
    });
    expect(JSON.stringify(res)).not.toContain("privado@x.mz");
  });

  it("limita resultados a 10 no máximo", async () => {
    mocks.profilesRepo.listProfiles.mockResolvedValue({ total: 0, items: [] });
    await tool("search_profiles").execute({ q: "ab", limit: 99 });
    expect(mocks.profilesRepo.listProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
    );
  });
});

describe("agent-tools — task_proposals_summary (RBAC)", () => {
  it("dono da tarefa vê agregados sem identidades", async () => {
    mocks.tasksRepo.findById.mockResolvedValue({
      id: "t1",
      title: "Fuga",
      requesterUserId: "u1",
      requesterOrganizationId: null,
    });
    mocks.tasksRepo.listProposals.mockResolvedValue({
      total: 2,
      items: [
        { status: "submitted", priceMzn: 5000, estimatedDays: 3 },
        { status: "shortlisted", priceMzn: 9000, estimatedDays: 7 },
      ],
    });
    const res = (await tool("task_proposals_summary").execute({ taskId: "t1" })) as Record<string, unknown>;
    expect(res).toMatchObject({
      taskId: "t1",
      total: 2,
      byStatus: { submitted: 1, shortlisted: 1 },
      priceMinMzn: 5000,
      priceAvgMzn: 7000,
      priceMaxMzn: 9000,
    });
    expect(JSON.stringify(res)).not.toContain("u1");
  });

  it("terceiro sem gestão é bloqueado (403)", async () => {
    mocks.tasksRepo.findById.mockResolvedValue({
      id: "t1",
      title: "Fuga",
      requesterUserId: "outro",
      requesterOrganizationId: null,
    });
    await expect(tool("task_proposals_summary").execute({ taskId: "t1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mocks.tasksRepo.listProposals).not.toHaveBeenCalled();
  });
});

describe("agent-tools — my_activity", () => {
  it("devolve só contagens", async () => {
    mocks.tasksRepo.listByRequester.mockResolvedValue({ total: 2, items: [] });
    mocks.tasksRepo.listProposalsByProviders.mockResolvedValue({ total: 5, items: [] });
    mocks.tasksRepo.getUserProfileIds.mockResolvedValue(["prof-9"]);
    mocks.negotiationsRepo.listThreadsForRequester.mockResolvedValue({ total: 1, items: [] });
    mocks.negotiationsRepo.listThreadsForProvider.mockResolvedValue({ total: 3, items: [] });
    const res = await tool("my_activity").execute({});
    expect(res).toEqual({
      openTasks: 2,
      proposalsSent: 5,
      negotiationsOpenAsRequester: 1,
      negotiationsOpenAsProvider: 3,
    });
  });
});
