import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "@workdeal/shared";
import type { MessageRow, ThreadWithContext } from "../repositories/negotiations.repository.js";

const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  tasksRepo: {
    findProposalById: vi.fn(),
    findById: vi.fn(),
    getUserProfileIds: vi.fn(),
    updateProposalTerms: vi.fn(),
  },
  repo: {
    createThread: vi.fn(),
    findThreadByProposal: vi.fn(),
    findMessageById: vi.fn(),
    setMessageOfferStatus: vi.fn(),
    findThreadById: vi.fn(),
    listThreadsForRequester: vi.fn(),
    listThreadsForProvider: vi.fn(),
    attachThreadDisplay: vi.fn(),
    unreadCounts: vi.fn(),
    updateThreadStatus: vi.fn(),
    insertMessage: vi.fn(),
    listMessages: vi.fn(),
    markSeen: vi.fn(),
    incrementThreadMessageCount: vi.fn(),
    setThreadLastMessage: vi.fn(),
    findNotificationRecipient: vi.fn(),
    findPersonalProfileId: vi.fn(),
    listManagerOrgIds: vi.fn(),
    findProfileNames: vi.fn(),
    findUserNames: vi.fn(),
  },
  notify: vi.fn(),
  notifyOffer: vi.fn(),
}));

vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));
vi.mock("../repositories/tasks.repository.js", () => ({ tasksRepository: mocks.tasksRepo }));
vi.mock("../repositories/negotiations.repository.js", () => ({ negotiationsRepository: mocks.repo }));
vi.mock("./negotiation-notifications.service.js", () => ({
  notifyNewNegotiationMessage: mocks.notify,
  notifyOfferResponse: mocks.notifyOffer,
}));

import { negotiationsService } from "./negotiations.service.js";

const requester = { id: "u-creator", name: "Criador" } as unknown as AuthUser;
const orgManager = { id: "u-manager", name: "Gestor" } as unknown as AuthUser;
const providerUser = { id: "u-provider", name: "Fornecedor" } as unknown as AuthUser;
const outsider = { id: "u-outsider", name: "Intruso" } as unknown as AuthUser;

const PROPOSAL = {
  id: "prop-1",
  taskId: "t1",
  status: "submitted",
  providerProfileId: "prof-9",
} as const;

const TASK = {
  id: "t1",
  requesterUserId: "u-creator",
  requesterOrganizationId: "org-1",
  title: "Construção de vedação",
} as const;

const THREAD = (overrides: Partial<ThreadWithContext> = {}): ThreadWithContext => ({
  id: "th-1",
  taskProposalId: "prop-1",
  taskId: "t1",
  status: "open",
  messageCount: 1,
  lastMessageAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  proposalStatus: "submitted",
  providerProfileId: "prof-9",
  requesterUserId: "u-creator",
  requesterOrganizationId: "org-1",
  taskTitle: "Construção de vedação",
  ...overrides,
});

const MSG = (overrides: Partial<MessageRow> = {}): MessageRow => ({
  id: "m1",
  threadId: "th-1",
  senderUserId: "u-provider",
  senderProfileId: "prof-9",
  senderSide: "provider",
  kind: "text",
  body: "Olá",
  priceMzn: null,
  estimatedDays: null,
  offerStatus: "pending",
  seenByRequester: false,
  seenByProvider: true,
  createdAt: new Date(),
  ...overrides,
});

const OFFER = (overrides: Partial<MessageRow> = {}): MessageRow =>
  MSG({
    id: "m-offer",
    kind: "offer",
    body: "Faço por este valor",
    priceMzn: 12000,
    estimatedDays: 5,
    ...overrides,
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrgRole.mockResolvedValue(null);
  mocks.tasksRepo.getUserProfileIds.mockResolvedValue([]);
  mocks.repo.findThreadById.mockResolvedValue(THREAD());
  mocks.repo.listMessages.mockResolvedValue({ items: [MSG()], total: 1 });
  mocks.repo.unreadCounts.mockResolvedValue(new Map([["th-1", 0]]));
  mocks.repo.findPersonalProfileId.mockResolvedValue(null);
  mocks.notify.mockResolvedValue(undefined);
  mocks.notifyOffer.mockResolvedValue(undefined);
});

describe("negotiationsService.getThread — resolução de partes", () => {
  it("permite o dono da tarefa (lado requester) e marca como visto", async () => {
    const detail = await negotiationsService.getThread(requester, "th-1");
    expect(detail.thread.id).toBe("th-1");
    expect(detail.messages[0]!.body).toBe("Olá");
    expect(mocks.repo.markSeen).toHaveBeenCalledWith("th-1", "requester");
  });

  it("permite membro gestor da organização solicitante (role editor)", async () => {
    mocks.getOrgRole.mockResolvedValue("editor");
    await negotiationsService.getThread(orgManager, "th-1");
    expect(mocks.repo.markSeen).toHaveBeenCalledWith("th-1", "requester");
  });

  it("bloqueia membro sem tasks:manage da organização solicitante (403 FORBIDDEN)", async () => {
    mocks.getOrgRole.mockResolvedValue("member");
    await expect(negotiationsService.getThread(orgManager, "th-1")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(mocks.repo.markSeen).not.toHaveBeenCalled();
  });

  it("permite quem age pelo perfil do fornecedor (lado provider)", async () => {
    mocks.tasksRepo.getUserProfileIds.mockResolvedValue(["prof-9"]);
    await negotiationsService.getThread(providerUser, "th-1");
    expect(mocks.repo.markSeen).toHaveBeenCalledWith("th-1", "provider");
  });

  it("bloqueia terceiro independente (403 FORBIDDEN)", async () => {
    await expect(negotiationsService.getThread(outsider, "th-1")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("404 THREAD_NOT_FOUND quando não existe", async () => {
    mocks.repo.findThreadById.mockResolvedValue(null);
    await expect(negotiationsService.getThread(requester, "th-x")).rejects.toMatchObject({
      status: 404,
      code: "THREAD_NOT_FOUND",
    });
  });
});

describe("negotiationsService.sendMessage", () => {
  it("mensagem de texto do requester persiste e notifica o lado provider", async () => {
    mocks.repo.insertMessage.mockResolvedValue(MSG({ senderUserId: "u-creator", senderSide: "requester", senderProfileId: null, kind: "text", body: "Boa tarde" }));

    const view = await negotiationsService.sendMessage(requester, "th-1", { kind: "text", body: "Boa tarde" });

    expect(mocks.repo.insertMessage).toHaveBeenCalledWith({
      threadId: "th-1",
      senderUserId: "u-creator",
      senderProfileId: null,
      senderSide: "requester",
      kind: "text",
      body: "Boa tarde",
      priceMzn: null,
      estimatedDays: null,
    });
    expect(mocks.repo.incrementThreadMessageCount).toHaveBeenCalledWith("th-1");
    expect(mocks.notify).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: "th-1", recipientSide: "provider", isOffer: false }),
    );
    expect(view.senderName).toBe("Solicitante");
    expect(view.senderProfileId).toBeNull();
  });

  it("contra-oferta do provider persiste preço e prazo", async () => {
    mocks.tasksRepo.getUserProfileIds.mockResolvedValue(["prof-9"]);
    mocks.repo.insertMessage.mockResolvedValue(
      MSG({ senderUserId: "u-provider", senderSide: "provider", kind: "offer", body: "Fecho a 12.500", priceMzn: 12500, estimatedDays: 10 }),
    );

    await negotiationsService.sendMessage(providerUser, "th-1", { kind: "offer", body: "Fecho a 12.500", priceMzn: 12500, estimatedDays: 10 });

    expect(mocks.repo.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderSide: "provider", senderProfileId: "prof-9", kind: "offer", priceMzn: 12500, estimatedDays: 10 }),
    );
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ recipientSide: "requester", isOffer: true }));
  });

  it("bloqueia envio quando a thread está fechada (409 THREAD_CLOSED)", async () => {
    mocks.repo.findThreadById.mockResolvedValue(THREAD({ status: "closed" }));
    await expect(negotiationsService.sendMessage(requester, "th-1", { kind: "text", body: "ainda dá?" })).rejects.toMatchObject({
      status: 409,
      code: "THREAD_CLOSED",
    });
    expect(mocks.repo.insertMessage).not.toHaveBeenCalled();
  });

  it("bloqueia contra-oferta quando a proposta já não é negociável (409 PROPOSAL_NOT_NEGOTIABLE)", async () => {
    mocks.repo.findThreadById.mockResolvedValue(THREAD({ proposalStatus: "accepted" }));
    await expect(negotiationsService.sendMessage(requester, "th-1", { kind: "offer", body: "posso baixar", priceMzn: 9000 })).rejects.toMatchObject({
      status: 409,
      code: "PROPOSAL_NOT_NEGOTIABLE",
    });
    expect(mocks.repo.insertMessage).not.toHaveBeenCalled();
  });

  it("mensagem de texto continua permitida em proposta não negociável", async () => {
    mocks.repo.findThreadById.mockResolvedValue(THREAD({ proposalStatus: "accepted" }));
    mocks.repo.insertMessage.mockResolvedValue(MSG({ kind: "text", body: "obrigado" }));
    await negotiationsService.sendMessage(requester, "th-1", { kind: "text", body: "obrigado" });
    expect(mocks.repo.insertMessage).toHaveBeenCalledOnce();
  });
});

describe("negotiationsService.openThread", () => {
  beforeEach(() => {
    mocks.tasksRepo.findProposalById.mockResolvedValue(PROPOSAL);
    mocks.tasksRepo.findById.mockResolvedValue(TASK);
  });

  it("cria a thread com mensagem de sistema 'Negociação iniciada' (idempotência não interfere)", async () => {
    mocks.repo.findThreadByProposal.mockResolvedValue(null);
    mocks.repo.createThread.mockResolvedValue(THREAD());
    mocks.repo.findThreadById.mockResolvedValue(THREAD());

    await negotiationsService.openThread(requester, { proposalId: "prop-1" });

    expect(mocks.repo.createThread).toHaveBeenCalledWith("prop-1", "t1");
    expect(mocks.repo.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: "system", body: "Negociação iniciada" }));
    expect(mocks.repo.incrementThreadMessageCount).toHaveBeenCalledWith("th-1");
  });

  it("reutiliza a thread existente sem duplicar", async () => {
    mocks.repo.findThreadByProposal.mockResolvedValue(THREAD());

    await negotiationsService.openThread(requester, { proposalId: "prop-1" });

    expect(mocks.repo.createThread).not.toHaveBeenCalled();
    expect(mocks.repo.insertMessage).not.toHaveBeenCalled();
  });

  it("404 PROPOSAL_NOT_FOUND quando a proposta não existe", async () => {
    mocks.tasksRepo.findProposalById.mockResolvedValue(null);
    await expect(negotiationsService.openThread(requester, { proposalId: "prop-x" })).rejects.toMatchObject({
      status: 404,
      code: "PROPOSAL_NOT_FOUND",
    });
  });
});

describe("negotiationsService.listThreads", () => {
  it("por defeito usa o lado provider quando o utilizador tem perfis de fornecedor", async () => {
    mocks.tasksRepo.getUserProfileIds.mockResolvedValue(["prof-9"]);
    mocks.repo.listThreadsForProvider.mockResolvedValue({ items: [THREAD()], total: 1 });

    await negotiationsService.listThreads(providerUser, {});

    expect(mocks.repo.listThreadsForProvider).toHaveBeenCalledWith(["prof-9"], undefined, 1, 20);
    expect(mocks.repo.listThreadsForRequester).not.toHaveBeenCalled();
  });

  it("usa o lado requester quando o utilizador não tem perfis de fornecedor", async () => {
    mocks.repo.listThreadsForRequester.mockResolvedValue({ items: [THREAD()], total: 1 });
    mocks.repo.listManagerOrgIds.mockResolvedValue(["org-1"]);

    await negotiationsService.listThreads(requester, {});

    expect(mocks.repo.listThreadsForRequester).toHaveBeenCalledWith("u-creator", ["org-1"], undefined, 1, 20);
  });
});

describe("negotiationsService.closeByProposal", () => {
  it("fecha a thread e insere mensagem de sistema quando é aceite", async () => {
    mocks.repo.findThreadByProposal.mockResolvedValue(THREAD());
    mocks.repo.findThreadById.mockResolvedValue(THREAD());
    mocks.repo.updateThreadStatus.mockResolvedValue(THREAD({ status: "closed" }));
    mocks.repo.insertMessage.mockResolvedValue(MSG({ kind: "system", senderUserId: "u-creator", senderProfileId: null }));

    await negotiationsService.closeByProposal("prop-1", requester, "accepted");

    expect(mocks.repo.updateThreadStatus).toHaveBeenCalledWith("th-1", "closed");
    expect(mocks.repo.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "system", senderSide: "requester", body: "Proposta aceite — negociação encerrada" }),
    );
    expect(mocks.repo.incrementThreadMessageCount).toHaveBeenCalledWith("th-1");
  });

  it("é um no-op quando a proposta não tem thread", async () => {
    mocks.repo.findThreadByProposal.mockResolvedValue(null);
    await negotiationsService.closeByProposal("prop-x", requester, "rejected");
    expect(mocks.repo.updateThreadStatus).not.toHaveBeenCalled();
    expect(mocks.repo.insertMessage).not.toHaveBeenCalled();
  });
});

describe("negotiationsService — anonimato das partes", () => {
  it("getThread nunca expõe nomes, slugs ou logos reais", async () => {
    const detail = await negotiationsService.getThread(requester, "th-1");
    expect(detail.thread.providerProfileSlug).toBeNull();
    expect(detail.thread.providerProfileLogo).toBeNull();
    expect(detail.thread.providerProfileName).toMatch(/^Fornecedor · #[0-9A-F]{4}$/);
    expect(detail.thread.requesterProfileName).toBe("Solicitante");
    expect(detail.thread.providerProfileName).not.toContain("Fornecedor Lda");
  });

  it("mensagens expõem só o alias do lado, sem perfil real", async () => {
    const detail = await negotiationsService.getThread(requester, "th-1");
    expect(detail.messages[0]!.senderName).toBe("Fornecedor");
    expect(detail.messages[0]!.senderProfileId).toBeNull();
  });

  it("listThreads anonimiza todas as threads", async () => {
    mocks.repo.listThreadsForRequester.mockResolvedValue({ items: [THREAD()], total: 1 });
    mocks.repo.listManagerOrgIds.mockResolvedValue(["org-1"]);
    const res = await negotiationsService.listThreads(requester, {});
    expect(res.items[0]!.providerProfileSlug).toBeNull();
    expect(res.items[0]!.providerProfileLogo).toBeNull();
    expect(res.items[0]!.requesterProfileName).toBe("Solicitante");
  });

  it("notificação de email usa alias, nunca o nome real", async () => {
    mocks.repo.insertMessage.mockResolvedValue(MSG({ senderUserId: "u-creator", senderSide: "requester", senderProfileId: null }));
    await negotiationsService.sendMessage(requester, "th-1", { kind: "text", body: "Boa tarde" });
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ senderName: "Solicitante" }));
  });
});

describe("negotiationsService.sendMessage — bloqueio de contactos", () => {
  it.each([
    ["email", "fala comigo em joao@empresa.co.mz"],
    ["link", "vê em https://empresa.co.mz o nosso trabalho"],
    ["telefone", "liga-me no 841234567"],
    ["whatsapp", "o meu whatsapp é 8412345"],
  ])("bloqueia %s (400 CONTACT_SHARING_BLOCKED)", async (_label, body) => {
    await expect(negotiationsService.sendMessage(requester, "th-1", { kind: "text", body })).rejects.toMatchObject({
      status: 400,
      code: "CONTACT_SHARING_BLOCKED",
    });
    expect(mocks.repo.insertMessage).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("bloqueia contacto no corpo da contraproposta", async () => {
    await expect(
      negotiationsService.sendMessage(requester, "th-1", { kind: "offer", body: "lê em empresa.com", priceMzn: 9000 }),
    ).rejects.toMatchObject({ status: 400, code: "CONTACT_SHARING_BLOCKED" });
    expect(mocks.repo.insertMessage).not.toHaveBeenCalled();
  });

  it("permite contraproposta sem contacto", async () => {
    mocks.repo.insertMessage.mockResolvedValue(MSG({ kind: "offer", body: "", priceMzn: 9000 }));
    await negotiationsService.sendMessage(requester, "th-1", { kind: "offer", body: "", priceMzn: 9000 });
    expect(mocks.repo.insertMessage).toHaveBeenCalledOnce();
  });
});

describe("negotiationsService.respondToOffer — aceitar/recusar contraproposta", () => {
  beforeEach(() => {
    mocks.repo.findMessageById.mockResolvedValue(OFFER());
    mocks.repo.setMessageOfferStatus.mockImplementation(async (id: string, status: "accepted" | "rejected") =>
      OFFER({ id, offerStatus: status }),
    );
  });

  it("requester aceita oferta do provider: actualiza termos, regista sistema e notifica", async () => {
    const res = await negotiationsService.respondToOffer(requester, "th-1", "m-offer", "accepted");
    expect(res.offerStatus).toBe("accepted");
    expect(mocks.repo.setMessageOfferStatus).toHaveBeenCalledWith("m-offer", "accepted");
    expect(mocks.tasksRepo.updateProposalTerms).toHaveBeenCalledWith("prop-1", { priceMzn: 12000, estimatedDays: 5 });
    expect(mocks.repo.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: "th-1", kind: "system", senderSide: "requester" }),
    );
    expect(mocks.notifyOffer).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: "th-1", recipientSide: "provider", decision: "accepted", priceMzn: 12000 }),
    );
  });

  it("provider recusa oferta do requester e notifica sem tocar nos termos", async () => {
    mocks.tasksRepo.getUserProfileIds.mockResolvedValue(["prof-9"]);
    mocks.repo.findMessageById.mockResolvedValue(
      OFFER({ id: "m-o2", senderUserId: "u-creator", senderProfileId: null, senderSide: "requester", priceMzn: 9000, estimatedDays: null }),
    );
    const res = await negotiationsService.respondToOffer(providerUser, "th-1", "m-o2", "rejected");
    expect(res.offerStatus).toBe("rejected");
    expect(mocks.tasksRepo.updateProposalTerms).not.toHaveBeenCalled();
    expect(mocks.notifyOffer).toHaveBeenCalledWith(
      expect.objectContaining({ recipientSide: "requester", decision: "rejected" }),
    );
  });

  it("impede responder à própria oferta (403 OWN_OFFER)", async () => {
    mocks.tasksRepo.getUserProfileIds.mockResolvedValue(["prof-9"]);
    await expect(negotiationsService.respondToOffer(providerUser, "th-1", "m-offer", "accepted")).rejects.toMatchObject({
      status: 403,
      code: "OWN_OFFER",
    });
    expect(mocks.repo.setMessageOfferStatus).not.toHaveBeenCalled();
    expect(mocks.notifyOffer).not.toHaveBeenCalled();
  });

  it("rejeita mensagem que não é oferta (400 NOT_AN_OFFER)", async () => {
    mocks.repo.findMessageById.mockResolvedValue(MSG({ kind: "text" }));
    await expect(negotiationsService.respondToOffer(requester, "th-1", "m1", "accepted")).rejects.toMatchObject({
      status: 400,
      code: "NOT_AN_OFFER",
    });
  });

  it("rejeita oferta já respondida (409 OFFER_ALREADY_ANSWERED)", async () => {
    mocks.repo.findMessageById.mockResolvedValue(OFFER({ offerStatus: "accepted" }));
    await expect(negotiationsService.respondToOffer(requester, "th-1", "m-offer", "rejected")).rejects.toMatchObject({
      status: 409,
      code: "OFFER_ALREADY_ANSWERED",
    });
  });

  it("rejeita em thread encerrada (409 THREAD_CLOSED)", async () => {
    mocks.repo.findThreadById.mockResolvedValue(THREAD({ status: "closed" }));
    await expect(negotiationsService.respondToOffer(requester, "th-1", "m-offer", "accepted")).rejects.toMatchObject({
      status: 409,
      code: "THREAD_CLOSED",
    });
  });

  it("404 quando a oferta não pertence à thread", async () => {
    mocks.repo.findMessageById.mockResolvedValue(OFFER({ threadId: "th-outra" }));
    await expect(negotiationsService.respondToOffer(requester, "th-1", "m-offer", "accepted")).rejects.toMatchObject({
      status: 404,
      code: "OFFER_NOT_FOUND",
    });
  });
});