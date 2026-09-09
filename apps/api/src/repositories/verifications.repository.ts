import { eq, sql } from "drizzle-orm";
import { db, verificationRequest, profile, organization, user } from "@workdeal/db";
import type { AdminVerificationView } from "@workdeal/shared";

export type VerificationRow = typeof verificationRequest.$inferSelect;

function serialize(row: {
  id: string;
  profileId: string;
  profileName: string | null;
  profileType: string | null;
  profileSlug: string | null;
  organizationName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  status: VerificationRow["status"];
  level: VerificationRow["level"];
  documents: unknown;
  brNumber: string | null;
  paymentProof: unknown;
  reviewerUserId: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminVerificationView {
  return {
    id: row.id,
    profileId: row.profileId,
    profileName: row.profileName,
    profileType: row.profileType,
    profileSlug: row.profileSlug,
    organizationName: row.organizationName,
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
    status: row.status as AdminVerificationView["status"],
    level: row.level as AdminVerificationView["level"],
    documents: (row.documents ?? []) as AdminVerificationView["documents"],
    brNumber: row.brNumber,
    paymentProof: (row.paymentProof ?? null) as AdminVerificationView["paymentProof"],
    reviewerUserId: row.reviewerUserId,
    reviewedAt: row.reviewedAt ? new Date(row.reviewedAt).toISOString() : null,
    reviewNote: row.reviewNote,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export const verificationsRepository = {
  async listByStatus(status: string | undefined, page: number, limit: number): Promise<{ items: AdminVerificationView[]; total: number }> {
    const where = status ? eq(verificationRequest.status, status as never) : undefined;
    const offset = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      db
        .select({
          id: verificationRequest.id,
          profileId: verificationRequest.profileId,
          profileName: profile.name,
          profileType: profile.type,
          profileSlug: profile.slug,
          organizationName: organization.name,
          ownerName: user.name,
          ownerEmail: user.email,
          status: verificationRequest.status,
          level: verificationRequest.level,
          documents: verificationRequest.documents,
          brNumber: verificationRequest.brNumber,
          paymentProof: verificationRequest.paymentProof,
          reviewerUserId: verificationRequest.reviewerUserId,
          reviewedAt: verificationRequest.reviewedAt,
          reviewNote: verificationRequest.reviewNote,
          createdAt: verificationRequest.createdAt,
          updatedAt: verificationRequest.updatedAt,
        })
        .from(verificationRequest)
        .leftJoin(profile, eq(verificationRequest.profileId, profile.id))
        .leftJoin(organization, eq(profile.organizationId, organization.id))
        .leftJoin(user, eq(profile.userId, user.id))
        .where(where)
        .orderBy(verificationRequest.createdAt)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(verificationRequest)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);
    return { items: rows.map(serialize), total: count };
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
