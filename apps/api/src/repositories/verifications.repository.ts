import { and, desc, eq, sql } from "drizzle-orm";
import { db, verificationRequest } from "@workdeal/db";

export type VerificationRow = typeof verificationRequest.$inferSelect;

export const verificationsRepository = {
  async listByStatus(status: string | undefined, page: number, limit: number): Promise<{ items: VerificationRow[]; total: number }> {
    const where = status ? eq(verificationRequest.status, status as never) : undefined;
    const offset = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      db.select().from(verificationRequest).where(where).orderBy(verificationRequest.createdAt).limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(verificationRequest)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);
    return { items: rows, total: count };
  },

  async findById(id: string): Promise<VerificationRow | null> {
    const [row] = await db.select().from(verificationRequest).where(eq(verificationRequest.id, id)).limit(1);
    return row ?? null;
  },

  async updateStatus(id: string, status: "approved" | "rejected" | "in_review", reviewerUserId: string, reviewNote?: string): Promise<VerificationRow | null> {
    const [row] = await db
      .update(verificationRequest)
      .set({ status: status as never, reviewerUserId, reviewedAt: new Date(), reviewNote: reviewNote ?? null, updatedAt: new Date() })
      .where(eq(verificationRequest.id, id))
      .returning();
    return row ?? null;
  },

  async create(data: typeof verificationRequest.$inferInsert): Promise<VerificationRow> {
    const [row] = await db.insert(verificationRequest).values(data).returning();
    if (!row) throw new Error("Falha ao criar pedido de verificação");
    return row;
  },
};
