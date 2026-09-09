import { describe, it, expect, vi, beforeEach } from "vitest";

// Anti auto-proposta: o service real é exercitado com repositório e auth
// mockados — criador, membro da organização e terceiro independente.
const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  tasksRepo: {
    findById: vi.fn(),
    getUserProfileIds: vi.fn(),
    findProposalByTaskAndProvider: vi.fn(),
    createProposal: vi.fn(),
    update: vi.fn(),
  },
  tagsRepo: {
    ensureTagsBySlugs: vi.fn(),
    setTaskTags: vi.fn(),
  },
}));

vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));
vi.mock("../repositories/tasks.repository.js", () => ({ tasksRepository: mocks.tasksRepo }));
vi.mock("../repositories/tags.repository.js", () => ({ tagsRepository: mocks.tagsRepo }));

import { tasksService } from "./tasks.service.js";
import type { AuthUser } from "@workdeal/shared";

const creator = { id: "u-creator", email: "criador@empresa.co.mz" } as unknown as AuthUser;
const colleague = { id: "u-colleague", email: "colega@empresa.co.mz" } as unknown as AuthUser;
const outsider = { id: "u-outsider", email: "fora@outra.co.mz" } as unknown as AuthUser;

const orgTask = {
  id: "t1",
  requesterUserId: "u-creator",
  requesterOrganizationId: "org-1",
  status: "open",
  proposalDeadlineAt: null,
};

const proposalInput = {
  taskId: "t1",
  providerProfileId: "prof-9",
  message: "Posso executar em 5 dias.",
  priceMzn: 15000,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tasksRepo.findById.mockResolvedValue(orgTask);
  mocks.tasksRepo.getUserProfileIds.mockResolvedValue(["prof-9"]);
  mocks.tasksRepo.findProposalByTaskAndProvider.mockResolvedValue(null);
  mocks.tasksRepo.createProposal.mockResolvedValue({ id: "prop-1" });
  mocks.tasksRepo.update.mockResolvedValue({});
  mocks.getOrgRole.mockResolvedValue(null);
});

describe("submitProposal — anti auto-proposta", () => {
  it("bloqueia o criador da tarefa (403 OWN_TASK)", async () => {
    await expect(tasksService.submitProposal(creator, proposalInput as never)).rejects.toMatchObject({
      status: 403,
      code: "OWN_TASK",
    });
    expect(mocks.tasksRepo.createProposal).not.toHaveBeenCalled();
  });

  it("bloqueia membro da organização solicitante (403 OWN_TASK)", async () => {
    mocks.getOrgRole.mockResolvedValue("member");
    await expect(tasksService.submitProposal(colleague, proposalInput as never)).rejects.toMatchObject({
      status: 403,
      code: "OWN_TASK",
    });
    expect(mocks.tasksRepo.createProposal).not.toHaveBeenCalled();
  });

  it("bloqueia gestor (editor) da organização solicitante", async () => {
    mocks.getOrgRole.mockResolvedValue("editor");
    await expect(tasksService.submitProposal(colleague, proposalInput as never)).rejects.toMatchObject({
      status: 403,
      code: "OWN_TASK",
    });
    expect(mocks.tasksRepo.createProposal).not.toHaveBeenCalled();
  });

  it("permite terceiro independente (cria proposta)", async () => {
    const res = await tasksService.submitProposal(outsider, proposalInput as never);
    expect(res).toMatchObject({ id: "prop-1" });
    expect(mocks.tasksRepo.createProposal).toHaveBeenCalledOnce();
  });

  it("permite membro propor em tarefa pessoal de outro utilizador", async () => {
    mocks.tasksRepo.findById.mockResolvedValue({ ...orgTask, requesterOrganizationId: null });
    const res = await tasksService.submitProposal(colleague, proposalInput as never);
    expect(res).toMatchObject({ id: "prop-1" });
  });
});
