import { describe, it, expect, vi, beforeEach } from "vitest";

// Anti auto-proposta: o service real é exercitado com repositório e auth
// mockados — criador, membro da organização e terceiro independente.
const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  tasksRepo: {
    findById: vi.fn(),
    list: vi.fn(),
    getUserProfileIds: vi.fn(),
    findProposalByTaskAndProvider: vi.fn(),
    createProposal: vi.fn(),
    update: vi.fn(),
    listProposals: vi.fn(),
    listProposalsByProviders: vi.fn(),
    findBidById: vi.fn(),
    updateBid: vi.fn(),
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

  it("bloqueia perfil que não pertence ao utilizador (403 PROFILE_REQUIRED)", async () => {
    mocks.tasksRepo.getUserProfileIds.mockResolvedValue(["prof-outro"]);
    await expect(tasksService.submitProposal(outsider, proposalInput as never)).rejects.toMatchObject({
      status: 403,
      code: "PROFILE_REQUIRED",
    });
    expect(mocks.tasksRepo.createProposal).not.toHaveBeenCalled();
  });

  it("permite propor com o perfil da empresa do utilizador", async () => {
    mocks.tasksRepo.getUserProfileIds.mockResolvedValue(["prof-pessoal", "prof-empresa"]);
    const res = await tasksService.submitProposal(outsider, { ...proposalInput, providerProfileId: "prof-empresa" } as never);
    expect(res).toMatchObject({ id: "prop-1" });
    expect(mocks.tasksRepo.createProposal).toHaveBeenCalledWith(expect.objectContaining({ providerProfileId: "prof-empresa" }));
  });

  it("permite membro propor em tarefa pessoal de outro utilizador", async () => {
    mocks.tasksRepo.findById.mockResolvedValue({ ...orgTask, requesterOrganizationId: null });
    const res = await tasksService.submitProposal(colleague, proposalInput as never);
    expect(res).toMatchObject({ id: "prop-1" });
  });

  it.each([
    ["email", "Proposta sólida, contacta joao@empresa.co.mz para detalhes."],
    ["telefone", "Posso executar em 5 dias, liga 841234567 para combinar."],
    ["link", "Posso executar, vê o portfólio em https://empresa.co.mz ya."],
  ])("bloqueia proposta com %s (400 CONTACT_SHARING_BLOCKED)", async (_label, message) => {
    await expect(tasksService.submitProposal(outsider, { ...proposalInput, message } as never)).rejects.toMatchObject({
      status: 400,
      code: "CONTACT_SHARING_BLOCKED",
    });
    expect(mocks.tasksRepo.createProposal).not.toHaveBeenCalled();
  });
});

describe("listProposals/myProposals — visibilidade de identidades", () => {
  it("solicitante vê a identidade real do proponente (nome/slug/logo)", async () => {
    mocks.tasksRepo.listProposals.mockResolvedValue({
      items: [
        {
          id: "prop-1",
          providerProfileId: "prof-9",
          providerProfileName: "Fornecedor Lda",
          providerProfileSlug: "fornecedor-lda",
          providerProfileLogo: "https://img/logo.png",
        },
      ],
      total: 1,
    });
    const res = await tasksService.listProposals(creator, "t1", {});
    expect(res.items[0]!.providerProfileName).toBe("Fornecedor Lda");
    expect(res.items[0]!.providerProfileSlug).toBe("fornecedor-lda");
    expect(res.items[0]!.providerProfileLogo).toBe("https://img/logo.png");
  });

  it("fornecedor não vê o nome real do solicitante nas suas propostas", async () => {
    mocks.tasksRepo.listProposalsByProviders.mockResolvedValue({
      items: [{ id: "prop-1", requesterUserName: "Criador" }],
      total: 1,
    });
    const res = await tasksService.myProposals(outsider, {});
    expect(res.items[0]!.requesterUserName).toBe("Solicitante");
  });
});

describe("vistas públicas — identidade do criador oculta", () => {
  it("getTask não expõe nome/slug/logo do solicitante", async () => {
    mocks.tasksRepo.findById.mockResolvedValue({
      ...orgTask,
      requesterProfileName: "Criador",
      requesterProfileSlug: "criador",
      requesterProfileLogo: "https://img/criador.png",
      tags: [],
    });
    const res = await tasksService.getTask("t1");
    expect(res.id).toBe("t1");
    expect((res as unknown as Record<string, unknown>).requesterProfileName).toBeNull();
    expect((res as unknown as Record<string, unknown>).requesterProfileSlug).toBeNull();
    expect((res as unknown as Record<string, unknown>).requesterProfileLogo).toBeNull();
  });

  it("listTasks não expõe nome/slug/logo do solicitante", async () => {
    mocks.tasksRepo.list.mockResolvedValue({
      items: [{ id: "t1", requesterProfileName: "Criador", requesterProfileSlug: "criador", requesterProfileLogo: null }],
      total: 1,
    });
    const res = await tasksService.listTasks({} as never);
    expect(res.items[0]!.requesterProfileName).toBeNull();
    expect(res.items[0]!.requesterProfileSlug).toBeNull();
  });
});

describe("updateBid — bloqueio de contactos na nota", () => {
  it.each([
    ["email", "bom trabalho, escreve para joao@empresa.co.mz"],
    ["telefone", "liga 841234567 para combinar"],
    ["link", "detalhes em https://empresa.co.mz"],
  ])("bloqueia nota com %s (400 CONTACT_SHARING_BLOCKED)", async (_label, reviewNote) => {
    await expect(tasksService.updateBid(creator, "b1", "in_progress", reviewNote)).rejects.toMatchObject({
      status: 400,
      code: "CONTACT_SHARING_BLOCKED",
    });
    expect(mocks.tasksRepo.findBidById).not.toHaveBeenCalled();
    expect(mocks.tasksRepo.updateBid).not.toHaveBeenCalled();
  });

  it("permite nota limpa e persiste na adjudicação", async () => {
    mocks.tasksRepo.findBidById.mockResolvedValue({
      id: "b1",
      taskId: "t1",
      providerProfileId: "prof-9",
      requesterUserId: "u-creator",
      status: "awarded",
    });
    mocks.tasksRepo.updateBid.mockResolvedValue({ id: "b1", status: "in_progress" });
    await tasksService.updateBid(creator, "b1", "in_progress", "Bom trabalho, dentro do prazo.");
    expect(mocks.tasksRepo.updateBid).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ status: "in_progress", reviewNote: "Bom trabalho, dentro do prazo." }),
    );
  });
});
