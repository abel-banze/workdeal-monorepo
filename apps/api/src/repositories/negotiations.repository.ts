import { db, negotiationThread, negotiationMessage, taskProposal, task, profile, user, member } from "@workdeal/db";
import { and, asc, count, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";

type ThreadStatus = (typeof negotiationThread.status.enumValues)[number];
type MessageKind = (typeof negotiationMessage.kind.enumValues)[number];
type SenderSide = (typeof negotiationMessage.senderSide.enumValues)[number];
type ProposalStatus = (typeof taskProposal.status.enumValues)[number];

export const threadColumns = {
  id: negotiationThread.id,
  taskProposalId: negotiationThread.taskProposalId,
  taskId: negotiationThread.taskId,
  status: negotiationThread.status,
  messageCount: negotiationThread.messageCount,
  lastMessageAt: negotiationThread.lastMessageAt,
  createdAt: negotiationThread.createdAt,
  updatedAt: negotiationThread.updatedAt,
} as const;

export const messageColumns = {
  id: negotiationMessage.id,
  threadId: negotiationMessage.threadId,
  senderUserId: negotiationMessage.senderUserId,
  senderProfileId: negotiationMessage.senderProfileId,
  senderSide: negotiationMessage.senderSide,
  kind: negotiationMessage.kind,
  body: negotiationMessage.body,
  priceMzn: negotiationMessage.priceMzn,
  estimatedDays: negotiationMessage.estimatedDays,
  seenByRequester: negotiationMessage.seenByRequester,
  seenByProvider: negotiationMessage.seenByProvider,
  createdAt: negotiationMessage.createdAt,
} as const;

const asThreadStatus = (s: string): ThreadStatus => s as ThreadStatus;

export type ThreadRow = Omit<typeof negotiationThread.$inferSelect, never>;
export type MessageRow = Omit<typeof negotiationMessage.$inferSelect, never>;

/** Thread + contexto necessário para resolver as partes e enriquecer a UI. */
export type ThreadWithContext = ThreadRow & {
  proposalStatus: ProposalStatus;
  providerProfileId: string;
  requesterUserId: string;
  requesterOrganizationId: string | null;
  taskTitle: string | null;
};

export type ThreadListItem = ThreadWithContext & {
  providerProfileName: string | null;
  providerProfileSlug: string | null;
  providerProfileLogo: string | null;
  requesterProfileName: string | null;
};

async function attachThreadDisplay<T extends ThreadWithContext>(rows: T[]): Promise<Array<T & Pick<ThreadListItem, "providerProfileName" | "providerProfileSlug" | "providerProfileLogo" | "requesterProfileName">>> {
  if (rows.length === 0) return [];
  const profileIds = [...new Set(rows.map((r) => r.providerProfileId))];
  const userIds = [...new Set(rows.map((r) => r.requesterUserId))];
  const profileRows = profileIds.length
    ? await db.select({ id: profile.id, name: profile.name, slug: profile.slug, logoUrl: profile.logoUrl }).from(profile).where(inArray(profile.id, profileIds))
    : [];
  const userRows = userIds.length ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds)) : [];
  const profileMap = new Map(profileRows.map((p) => [p.id, p]));
  const userMap = new Map(userRows.map((u) => [u.id, u]));
  return rows.map((r) => ({
    ...r,
    providerProfileName: profileMap.get(r.providerProfileId)?.name ?? null,
    providerProfileSlug: profileMap.get(r.providerProfileId)?.slug ?? null,
    providerProfileLogo: profileMap.get(r.providerProfileId)?.logoUrl ?? null,
    requesterProfileName: userMap.get(r.requesterUserId)?.name ?? null,
  }));
}

export const negotiationsRepository = {
  // ── Threads ──────────────────────────────────────────────────────
  async createThread(taskProposalId: string, taskId: string): Promise<ThreadRow> {
    const [row] = await db.insert(negotiationThread).values({ taskProposalId, taskId }).returning(threadColumns);
    if (!row) throw new Error("Falha ao criar negociação");
    return row;
  },

  async findThreadByProposal(proposalId: string): Promise<ThreadRow | null> {
    const [row] = await db.select(threadColumns).from(negotiationThread).where(eq(negotiationThread.taskProposalId, proposalId)).limit(1);
    return row ?? null;
  },

  async findThreadById(id: string): Promise<ThreadWithContext | null> {
    const [row] = await db
      .select({
        ...threadColumns,
        proposalStatus: taskProposal.status,
        providerProfileId: taskProposal.providerProfileId,
        requesterUserId: task.requesterUserId,
        requesterOrganizationId: task.requesterOrganizationId,
        taskTitle: task.title,
      })
      .from(negotiationThread)
      .innerJoin(taskProposal, eq(taskProposal.id, negotiationThread.taskProposalId))
      .innerJoin(task, eq(task.id, negotiationThread.taskId))
      .where(eq(negotiationThread.id, id))
      .limit(1);
    return row ?? null;
  },

  async listThreadsForRequester(requesterUserId: string, requesterOrganizationIds: string[], status: string | undefined, page: number, limit: number): Promise<{ items: ThreadWithContext[]; total: number }> {
    const where: SQL | undefined =
      requesterOrganizationIds.length > 0
        ? (or(eq(task.requesterUserId, requesterUserId), inArray(task.requesterOrganizationId, requesterOrganizationIds)) as SQL)
        : eq(task.requesterUserId, requesterUserId);
    const finalWhere = status ? and(where, eq(negotiationThread.status, asThreadStatus(status))) : where;
    const [cntRow] = await db.select({ cnt: count() }).from(negotiationThread).innerJoin(task, eq(task.id, negotiationThread.taskId)).where(finalWhere);
    const items = await db
      .select({
        ...threadColumns,
        taskTitle: task.title,
        requesterUserId: task.requesterUserId,
        requesterOrganizationId: task.requesterOrganizationId,
        proposalStatus: taskProposal.status,
        providerProfileId: taskProposal.providerProfileId,
      })
      .from(negotiationThread)
      .innerJoin(taskProposal, eq(taskProposal.id, negotiationThread.taskProposalId))
      .innerJoin(task, eq(task.id, negotiationThread.taskId))
      .where(finalWhere)
      .orderBy(desc(negotiationThread.lastMessageAt), desc(negotiationThread.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async listThreadsForProvider(providerProfileIds: string[], status: string | undefined, page: number, limit: number): Promise<{ items: ThreadWithContext[]; total: number }> {
    if (providerProfileIds.length === 0) return { items: [], total: 0 };
    const where = status
      ? and(inArray(taskProposal.providerProfileId, providerProfileIds), eq(negotiationThread.status, asThreadStatus(status)))
      : inArray(taskProposal.providerProfileId, providerProfileIds);
    const [cntRow] = await db.select({ cnt: count() }).from(negotiationThread).innerJoin(taskProposal, eq(taskProposal.id, negotiationThread.taskProposalId)).where(where);
    const items = await db
      .select({
        ...threadColumns,
        taskTitle: task.title,
        requesterUserId: task.requesterUserId,
        requesterOrganizationId: task.requesterOrganizationId,
        proposalStatus: taskProposal.status,
        providerProfileId: taskProposal.providerProfileId,
      })
      .from(negotiationThread)
      .innerJoin(taskProposal, eq(taskProposal.id, negotiationThread.taskProposalId))
      .innerJoin(task, eq(task.id, negotiationThread.taskId))
      .where(where)
      .orderBy(desc(negotiationThread.lastMessageAt), desc(negotiationThread.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async attachThreadDisplay(rows: ThreadWithContext[]): Promise<ThreadListItem[]> {
    return attachThreadDisplay(rows);
  },

  async updateThreadStatus(id: string, status: ThreadStatus): Promise<ThreadRow | null> {
    const [row] = await db
      .update(negotiationThread)
      .set({ status, updatedAt: new Date() })
      .where(eq(negotiationThread.id, id))
      .returning(threadColumns);
    return row ?? null;
  },

  /** Contagem de não lidas por thread (vista do lado indicado). */
  async unreadCounts(threadIds: string[], viewerSide: SenderSide): Promise<Map<string, number>> {
    if (threadIds.length === 0) return new Map();
    const conds: SQL[] = [inArray(negotiationMessage.threadId, threadIds)];
    if (viewerSide === "requester") {
      conds.push(eq(negotiationMessage.senderSide, "provider"), eq(negotiationMessage.seenByRequester, false));
    } else {
      conds.push(eq(negotiationMessage.senderSide, "requester"), eq(negotiationMessage.seenByProvider, false));
    }
    const rows = await db
      .select({ threadId: negotiationMessage.threadId, cnt: count() })
      .from(negotiationMessage)
      .where(and(...conds))
      .groupBy(negotiationMessage.threadId);
    return new Map(rows.map((r) => [r.threadId, r.cnt]));
  },

  // ── Mensagens ────────────────────────────────────────────────────
  async insertMessage(data: Partial<typeof negotiationMessage.$inferInsert> & { threadId: string; senderUserId: string; senderSide: SenderSide; kind: MessageKind; body: string }): Promise<MessageRow> {
    const [row] = await db.insert(negotiationMessage).values(data).returning(messageColumns);
    if (!row) throw new Error("Falha ao guardar mensagem");
    return row;
  },

  async listMessages(threadId: string, page: number, limit: number): Promise<{ items: MessageRow[]; total: number }> {
    const [cntRow] = await db.select({ cnt: count() }).from(negotiationMessage).where(eq(negotiationMessage.threadId, threadId));
    const items = await db
      .select(messageColumns)
      .from(negotiationMessage)
      .where(eq(negotiationMessage.threadId, threadId))
      .orderBy(asc(negotiationMessage.createdAt), asc(negotiationMessage.id))
      .limit(limit)
      .offset((page - 1) * limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async markSeen(threadId: string, viewerSide: SenderSide): Promise<void> {
    if (viewerSide === "requester") {
      await db.update(negotiationMessage).set({ seenByRequester: true }).where(and(eq(negotiationMessage.threadId, threadId), eq(negotiationMessage.seenByRequester, false)));
    } else {
      await db.update(negotiationMessage).set({ seenByProvider: true }).where(and(eq(negotiationMessage.threadId, threadId), eq(negotiationMessage.seenByProvider, false)));
    }
  },

  async incrementThreadMessageCount(threadId: string): Promise<void> {
    await db
      .update(negotiationThread)
      .set({ messageCount: sql`${negotiationThread.messageCount} + 1`, lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(negotiationThread.id, threadId));
  },

  async setThreadLastMessage(threadId: string): Promise<void> {
    await db.update(negotiationThread).set({ lastMessageAt: new Date(), updatedAt: new Date() }).where(eq(negotiationThread.id, threadId));
  },

  /**
   * Destinatário de notificação do lado indicado (best effort).
   * provider → quem pediu a tarefa; requester → dono do perfil do fornecedor
   * (fallback para o email público do perfil se a conta não for resolvível).
   */
  async findNotificationRecipient(providerProfileId: string, requesterUserId: string, recipientSide: SenderSide): Promise<{ name: string | null; email: string | null } | null> {
    if (recipientSide === "provider") {
      const [u] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, requesterUserId)).limit(1);
      return u ? { name: u.name, email: u.email } : null;
    }
    const [p] = await db
      .select({ name: profile.name, email: profile.email, userId: profile.userId })
      .from(profile)
      .where(inArray(profile.id, [providerProfileId]))
      .limit(1);
    if (!p) return null;
    if (p.userId) {
      const [u] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, p.userId)).limit(1);
      if (u) return { name: u.name, email: u.email };
    }
    return p.email ? { name: p.name, email: p.email } : null;
  },

  /** Perfil pessoal do utilizador (profiles com userId, não os da organização). */
  async findPersonalProfileId(userId: string): Promise<string | null> {
    const [row] = await db
      .select({ id: profile.id })
      .from(profile)
      .where(and(eq(profile.userId, userId), isNull(profile.deletedAt)))
      .limit(1);
    return row?.id ?? null;
  },

  /** Organizações onde o utilizador tem permissão tasks:manage (owner/admin/editor). */
  async listManagerOrgIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(and(eq(member.userId, userId), inArray(member.role, ["owner", "admin", "editor"])));
    return rows.map((r) => r.organizationId);
  },

  /** Nomes de perfis (para mostrar quem enviou cada mensagem). */
  async findProfileNames(profileIds: string[]): Promise<Map<string, string>> {
    if (profileIds.length === 0) return new Map();
    const rows = await db.select({ id: profile.id, name: profile.name }).from(profile).where(inArray(profile.id, profileIds));
    return new Map(rows.map((r) => [r.id, r.name]));
  },

  async findUserNames(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const rows = await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds));
    return new Map(rows.map((r) => [r.id, r.name]));
  },
};