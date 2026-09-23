import { db, organization, supportMessage, supportTicket, user } from "@workdeal/db";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

export const supportRepository = {
  async createTicket(data: { userId: string; organizationId: string | null; subject: string; category: string }) {
    const [row] = await db
      .insert(supportTicket)
      .values({ ...data, category: data.category as typeof supportTicket.category.enumValues[number], status: "open" })
      .returning();
    return row ?? null;
  },

  async addMessage(data: { ticketId: string; senderUserId: string; body: string; isInternal?: boolean }) {
    return db.transaction(async (tx) => {
      const [msg] = await tx
        .insert(supportMessage)
        .values({ ticketId: data.ticketId, senderUserId: data.senderUserId, body: data.body, isInternal: data.isInternal ?? false })
        .returning();
      await tx.update(supportTicket).set({ updatedAt: new Date() }).where(eq(supportTicket.id, data.ticketId));
      return msg ?? null;
    });
  },

  async findTicketById(id: string) {
    const [row] = await db
      .select({
        id: supportTicket.id,
        userId: supportTicket.userId,
        organizationId: supportTicket.organizationId,
        subject: supportTicket.subject,
        category: supportTicket.category,
        status: supportTicket.status,
        createdAt: supportTicket.createdAt,
        updatedAt: supportTicket.updatedAt,
        userName: user.name,
        userEmail: user.email,
        orgName: organization.name,
      })
      .from(supportTicket)
      .leftJoin(user, eq(user.id, supportTicket.userId))
      .leftJoin(organization, eq(organization.id, supportTicket.organizationId))
      .where(eq(supportTicket.id, id))
      .limit(1);
    return row ?? null;
  },

  async listMessages(ticketId: string, includeInternal: boolean) {
    const conds = [eq(supportMessage.ticketId, ticketId)];
    if (!includeInternal) conds.push(eq(supportMessage.isInternal, false));
    const rows = await db
      .select({
        id: supportMessage.id,
        senderUserId: supportMessage.senderUserId,
        body: supportMessage.body,
        isInternal: supportMessage.isInternal,
        createdAt: supportMessage.createdAt,
        senderName: user.name,
      })
      .from(supportMessage)
      .leftJoin(user, eq(user.id, supportMessage.senderUserId))
      .where(and(...conds))
      .orderBy(supportMessage.createdAt);
    return rows;
  },

  async listTicketsForUser(userId: string, query: { status?: string; page: number; limit: number }) {
    const conds = [eq(supportTicket.userId, userId)];
    if (query.status) conds.push(eq(supportTicket.status, query.status as typeof supportTicket.status.enumValues[number]));
    const where = and(...conds);
    const [cntRow] = await db.select({ cnt: count() }).from(supportTicket).where(where);
    const items = await db.select().from(supportTicket).where(where).orderBy(desc(supportTicket.updatedAt)).limit(query.limit).offset((query.page - 1) * query.limit);
    const counts = await this.countMessages(items.map((t) => t.id));
    return { items: items.map((t) => ({ ...t, messageCount: counts.get(t.id) ?? 0 })), total: cntRow?.cnt ?? 0 };
  },

  async listTicketsAdmin(query: { status?: string; category?: string; q?: string; page: number; limit: number }) {
    const conds = [];
    if (query.status) conds.push(eq(supportTicket.status, query.status as typeof supportTicket.status.enumValues[number]));
    if (query.category) conds.push(eq(supportTicket.category, query.category as typeof supportTicket.category.enumValues[number]));
    if (query.q) conds.push(or(ilike(supportTicket.subject, `%${query.q}%`), ilike(user.email, `%${query.q}%`))!);
    const where = conds.length > 0 ? and(...conds) : undefined;
    const [cntRow] = await db
      .select({ cnt: count() })
      .from(supportTicket)
      .leftJoin(user, eq(user.id, supportTicket.userId))
      .where(where);
    const items = await db
      .select({
        id: supportTicket.id,
        userId: supportTicket.userId,
        organizationId: supportTicket.organizationId,
        subject: supportTicket.subject,
        category: supportTicket.category,
        status: supportTicket.status,
        createdAt: supportTicket.createdAt,
        updatedAt: supportTicket.updatedAt,
        userName: user.name,
        userEmail: user.email,
        orgName: organization.name,
      })
      .from(supportTicket)
      .leftJoin(user, eq(user.id, supportTicket.userId))
      .leftJoin(organization, eq(organization.id, supportTicket.organizationId))
      .where(where)
      .orderBy(desc(supportTicket.updatedAt))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);
    const counts = await this.countMessages(items.map((t) => t.id));
    return { items: items.map((t) => ({ ...t, messageCount: counts.get(t.id) ?? 0 })), total: cntRow?.cnt ?? 0 };
  },

  async countMessages(ticketIds: string[]): Promise<Map<string, number>> {
    if (ticketIds.length === 0) return new Map();
    const rows = await db
      .select({ ticketId: supportMessage.ticketId, cnt: count() })
      .from(supportMessage)
      .where(inArray(supportMessage.ticketId, ticketIds))
      .groupBy(supportMessage.ticketId);
    return new Map(rows.map((r) => [r.ticketId, r.cnt]));
  },

  async updateStatus(id: string, status: string) {
    const [row] = await db
      .update(supportTicket)
      .set({ status: status as typeof supportTicket.status.enumValues[number], updatedAt: new Date() })
      .where(eq(supportTicket.id, id))
      .returning();
    return row ?? null;
  },
};
