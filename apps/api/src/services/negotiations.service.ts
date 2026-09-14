import type { AuthUser, CreateThreadInput, ProposalStatus, SendNegotiationMessageInput, SenderSide } from "@workdeal/shared";
import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { negotiationsRepository, type ThreadWithContext } from "../repositories/negotiations.repository.js";
import { tasksRepository } from "../repositories/tasks.repository.js";
import { notifyNewNegotiationMessage } from "./negotiation-notifications.service.js";

type ThreadMessageRow = Awaited<ReturnType<typeof negotiationsRepository.listMessages>>["items"][number];
type ThreadRow = Awaited<ReturnType<typeof negotiationsRepository.createThread>>;

export type ThreadView = ThreadRow & {
  proposalStatus: ProposalStatus;
  providerProfileId: string;
  requesterUserId: string;
  requesterOrganizationId: string | null;
  taskTitle: string | null;
  providerProfileName: string | null;
  providerProfileSlug: string | null;
  providerProfileLogo: string | null;
  requesterProfileName: string | null;
  unreadCount: number;
};

export type MessageView = ThreadMessageRow & {
  senderName: string | null;
};

export type ThreadDetail = {
  thread: ThreadView;
  messages: MessageView[];
  totalMessages: number;
};

const NEGOTIABLE_PROPOSAL_STATUSES = new Set<ProposalStatus>(["submitted", "shortlisted"]);

// ── Partes ─────────────────────────────────────────────────────────
// Solicitante: dono da tarefa OU membro da organização solicitante com
// tasks:manage. Fornecedor: quem age em nome do perfil que submeteu a proposta.
async function mustResolveSide(user: AuthUser, thread: ThreadWithContext): Promise<SenderSide> {
  if (thread.requesterUserId === user.id) return "requester";
  if (thread.requesterOrganizationId) {
    const role = await getOrgRole(user.id, thread.requesterOrganizationId);
    if (role && hasOrgPermission(role, "tasks:manage")) return "requester";
  }
  const profileIds = await tasksRepository.getUserProfileIds(user.id);
  if (profileIds.includes(thread.providerProfileId)) return "provider";
  throw new AppError(403, "FORBIDDEN", "Sem acesso a esta negociação");
}

async function attachMessageSender(messages: ThreadMessageRow[]): Promise<MessageView[]> {
  if (messages.length === 0) return [];
  const userIds = [...new Set(messages.map((m) => m.senderUserId))];
  const profileIds = [...new Set(messages.map((m) => m.senderProfileId).filter((v): v is string => Boolean(v)))];
  const [nameByUser, nameByProfile] = await Promise.all([
    negotiationsRepository.findUserNames(userIds),
    negotiationsRepository.findProfileNames(profileIds),
  ]);
  return messages.map((m) => ({
    ...m,
    senderName: m.senderProfileId ? (nameByProfile.get(m.senderProfileId) ?? nameByUser.get(m.senderUserId) ?? null) : (nameByUser.get(m.senderUserId) ?? null),
  }));
}

async function buildThreadView(thread: ThreadWithContext, viewerSide: SenderSide): Promise<ThreadView> {
  const [display, unread] = await Promise.all([
    negotiationsRepository.attachThreadDisplay([thread]),
    negotiationsRepository.unreadCounts([thread.id], viewerSide),
  ]);
  const d = display[0];
  if (!d) throw new AppError(404, "THREAD_NOT_FOUND", "Negociação não encontrada");
  return { ...thread, ...d, unreadCount: unread.get(thread.id) ?? 0 };
}

async function latestMessages(threadId: string, limit: number) {
  const { items, total } = await negotiationsRepository.listMessages(threadId, 1, limit);
  const maxPage = Math.max(1, Math.ceil(total / limit));
  return maxPage === 1 ? { items, total } : negotiationsRepository.listMessages(threadId, maxPage, limit);
}

export const negotiationsService = {
  // ── Abertura / consulta ───────────────────────────────────────────
  async openThread(user: AuthUser, input: CreateThreadInput): Promise<ThreadDetail> {
    const proposal = await tasksRepository.findProposalById(input.proposalId);
    if (!proposal) throw new AppError(404, "PROPOSAL_NOT_FOUND", "Proposta não encontrada");
    const taskRow = await tasksRepository.findById(proposal.taskId);
    if (!taskRow) throw new AppError(404, "TASK_NOT_FOUND", "Tarefa associada à proposta não encontrada");

    const template: ThreadWithContext = {
      id: "",
      taskProposalId: proposal.id,
      taskId: proposal.taskId,
      status: "open",
      messageCount: 0,
      lastMessageAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      proposalStatus: proposal.status,
      providerProfileId: proposal.providerProfileId,
      requesterUserId: taskRow.requesterUserId,
      requesterOrganizationId: taskRow.requesterOrganizationId,
      taskTitle: taskRow.title,
    };

    const existing = await negotiationsRepository.findThreadByProposal(proposal.id);
    if (existing) {
      const thread = await negotiationsRepository.findThreadById(existing.id);
      if (!thread) throw new AppError(404, "THREAD_NOT_FOUND", "Negociação não encontrada");
      const side = await mustResolveSide(user, thread);
      await negotiationsRepository.markSeen(thread.id, side);
      return this.getThreadDetail(thread, side);
    }

    const side = await mustResolveSide(user, template);
    const thread = await negotiationsRepository.createThread(proposal.id, proposal.taskId);
    await negotiationsRepository.insertMessage({
      threadId: thread.id,
      senderUserId: user.id,
      senderProfileId: side === "provider" ? proposal.providerProfileId : null,
      senderSide: side,
      kind: "system",
      body: "Negociação iniciada",
    });
    await negotiationsRepository.incrementThreadMessageCount(thread.id);

    const full = await negotiationsRepository.findThreadById(thread.id);
    if (!full) throw new AppError(404, "THREAD_NOT_FOUND", "Negociação não encontrada");
    return this.getThreadDetail(full, side);
  },

  async getThread(user: AuthUser, threadId: string): Promise<ThreadDetail> {
    const thread = await negotiationsRepository.findThreadById(threadId);
    if (!thread) throw new AppError(404, "THREAD_NOT_FOUND", "Negociação não encontrada");
    const side = await mustResolveSide(user, thread);
    await negotiationsRepository.markSeen(thread.id, side);
    return this.getThreadDetail(thread, side);
  },

  async getThreadDetail(thread: ThreadWithContext, side: SenderSide): Promise<ThreadDetail> {
    // uso interno — chamadores já resolveram `mustResolveSide`
    const { items, total } = await latestMessages(thread.id, 50);
    const view = await buildThreadView(thread, side);
    return {
      thread: { ...view, unreadCount: 0 },
      messages: await attachMessageSender(items),
      totalMessages: total,
    };
  },

  async listThreads(user: AuthUser, query: { role?: "requester" | "provider"; status?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const profileIds = await tasksRepository.getUserProfileIds(user.id);
    const orgIds = await negotiationsRepository.listManagerOrgIds(user.id);

    const role = query.role ?? (profileIds.length > 0 ? "provider" : "requester");
    const side: SenderSide = role === "requester" ? "requester" : "provider";

    const res =
      side === "requester"
        ? await negotiationsRepository.listThreadsForRequester(user.id, orgIds, query.status, page, limit)
        : await negotiationsRepository.listThreadsForProvider(profileIds, query.status, page, limit);

    const displayed = await negotiationsRepository.attachThreadDisplay(res.items);
    const unread = await negotiationsRepository.unreadCounts(displayed.map((t) => t.id), side);
    const requesterUserIds = [...new Set(displayed.map((t) => t.requesterUserId))];
    const nameByUser = await negotiationsRepository.findUserNames(requesterUserIds);
    const items = displayed.map((t) => ({
      ...t,
      requesterProfileName: t.requesterProfileName ?? nameByUser.get(t.requesterUserId) ?? null,
      providerProfileName: t.providerProfileName,
      providerProfileSlug: t.providerProfileSlug,
      providerProfileLogo: t.providerProfileLogo,
      unreadCount: unread.get(t.id) ?? 0,
    }));
    return { items, total: res.total, page, limit };
  },

  async listMessages(user: AuthUser, threadId: string, query: { page?: number; limit?: number }) {
    const thread = await negotiationsRepository.findThreadById(threadId);
    if (!thread) throw new AppError(404, "THREAD_NOT_FOUND", "Negociação não encontrada");
    const side = await mustResolveSide(user, thread);
    await negotiationsRepository.markSeen(thread.id, side);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const { items, total } = await negotiationsRepository.listMessages(thread.id, page, limit);
    return { items: await attachMessageSender(items), total, page, limit, viewerSide: side };
  },

  // ── Envio de mensagens ───────────────────────────────────────────
  async sendMessage(user: AuthUser, threadId: string, input: SendNegotiationMessageInput): Promise<MessageView> {
    const thread = await negotiationsRepository.findThreadById(threadId);
    if (!thread) throw new AppError(404, "THREAD_NOT_FOUND", "Negociação não encontrada");
    const side = await mustResolveSide(user, thread);
    if (thread.status !== "open") throw new AppError(409, "THREAD_CLOSED", "Negociação encerrada — já não é possível enviar mensagens");

    if (input.kind === "offer" && !NEGOTIABLE_PROPOSAL_STATUSES.has(thread.proposalStatus)) {
      throw new AppError(409, "PROPOSAL_NOT_NEGOTIABLE", "Esta proposta já não pode ser contra-negociada");
    }

    const senderProfileId =
      side === "provider" ? thread.providerProfileId : await negotiationsRepository.findPersonalProfileId(user.id);
    const message = await negotiationsRepository.insertMessage({
      threadId,
      senderUserId: user.id,
      senderProfileId,
      senderSide: side,
      kind: input.kind,
      body: input.kind === "text" ? input.body : (input.body ?? "").trim(),
      priceMzn: input.kind === "offer" ? input.priceMzn : null,
      estimatedDays: input.kind === "offer" ? (input.estimatedDays ?? null) : null,
    });
    await negotiationsRepository.incrementThreadMessageCount(threadId);

    const recipientSide: SenderSide = side === "requester" ? "provider" : "requester";
    void notifyNewNegotiationMessage({
      threadId,
      providerProfileId: thread.providerProfileId,
      requesterUserId: thread.requesterUserId,
      recipientSide,
      senderName: user.name,
      body: input.kind === "offer" ? input.body ?? "" : input.body,
      isOffer: input.kind === "offer",
    });

    const [view] = await attachMessageSender([message]);
    return view ?? { ...message, senderName: user.name };
  },

  // ── Encerramento (usado pelas acções de aceitar/recusar proposta) ──
  async closeByProposal(proposalId: string, actingUser: AuthUser, reason: "accepted" | "rejected"): Promise<void> {
    const existing = await negotiationsRepository.findThreadByProposal(proposalId);
    if (!existing || existing.status !== "open") return;
    const thread = await negotiationsRepository.findThreadById(existing.id);
    if (!thread) return;
    const side = await mustResolveSide(actingUser, thread);
    await negotiationsRepository.updateThreadStatus(thread.id, "closed");
    await negotiationsRepository.insertMessage({
      threadId: thread.id,
      senderUserId: actingUser.id,
      senderProfileId: null,
      senderSide: side,
      kind: "system",
      body: reason === "accepted" ? "Proposta aceite — negociação encerrada" : "Proposta recusada — negociação encerrada",
    });
    await negotiationsRepository.incrementThreadMessageCount(thread.id);
  },
};