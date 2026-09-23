import { db, feedback, organization, user } from "@workdeal/db";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

export const feedbackRepository = {
  async create(data: { userId: string; organizationId: string | null; kind: string; message: string; page: string | null }) {
    const [row] = await db
      .insert(feedback)
      .values({ ...data, kind: data.kind as typeof feedback.kind.enumValues[number], status: "open" })
      .returning();
    return row ?? null;
  },

  async listForUser(userId: string, query: { page: number; limit: number }) {
    const where = eq(feedback.userId, userId);
    const [cntRow] = await db.select({ cnt: count() }).from(feedback).where(where);
    const items = await db.select().from(feedback).where(where).orderBy(desc(feedback.createdAt)).limit(query.limit).offset((query.page - 1) * query.limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async listAdmin(query: { status?: string; kind?: string; q?: string; page: number; limit: number }) {
    const conds = [];
    if (query.status) conds.push(eq(feedback.status, query.status as typeof feedback.status.enumValues[number]));
    if (query.kind) conds.push(eq(feedback.kind, query.kind as typeof feedback.kind.enumValues[number]));
    if (query.q) conds.push(or(ilike(feedback.message, `%${query.q}%`), ilike(user.email, `%${query.q}%`))!);
    const where = conds.length > 0 ? and(...conds) : undefined;
    const [cntRow] = await db
      .select({ cnt: count() })
      .from(feedback)
      .leftJoin(user, eq(user.id, feedback.userId))
      .where(where);
    const items = await db
      .select({
        id: feedback.id,
        userId: feedback.userId,
        organizationId: feedback.organizationId,
        kind: feedback.kind,
        message: feedback.message,
        page: feedback.page,
        status: feedback.status,
        adminNote: feedback.adminNote,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        userName: user.name,
        userEmail: user.email,
        orgName: organization.name,
      })
      .from(feedback)
      .leftJoin(user, eq(user.id, feedback.userId))
      .leftJoin(organization, eq(organization.id, feedback.organizationId))
      .where(where)
      .orderBy(desc(feedback.createdAt))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async update(id: string, data: { status: string; adminNote?: string | null }) {
    const [row] = await db
      .update(feedback)
      .set({
        status: data.status as typeof feedback.status.enumValues[number],
        ...(data.adminNote !== undefined ? { adminNote: data.adminNote } : {}),
        updatedAt: new Date(),
      })
      .where(eq(feedback.id, id))
      .returning();
    return row ?? null;
  },
};
