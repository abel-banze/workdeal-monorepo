import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db, adminInvite, user } from "@workdeal/db";
import type { AdminInviteListQuery, AdminInviteStatus } from "@workdeal/shared";

export interface AdminInviteRow {
  id: string;
  email: string;
  role: "user" | "moderator" | "admin";
  status: AdminInviteStatus;
  token: string;
  expiresAt: Date | null;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  invitedByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const inviteSelect = {
  id: adminInvite.id,
  email: adminInvite.email,
  role: adminInvite.role,
  status: adminInvite.status,
  token: adminInvite.token,
  expiresAt: adminInvite.expiresAt,
  acceptedAt: adminInvite.acceptedAt,
  revokedAt: adminInvite.revokedAt,
  createdAt: adminInvite.createdAt,
  updatedAt: adminInvite.updatedAt,
  invitedByEmail: user.email,
};

export const adminInvitesRepository = {
  async list(query: AdminInviteListQuery): Promise<{ items: AdminInviteRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    // Expira convites pendentes cujo prazo já passou — mantém a BD consistente.
    await db
      .update(adminInvite)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(adminInvite.status, "pending"), lt(adminInvite.expiresAt, new Date())));

    const conditions: SQL<unknown>[] = [];
    if (query.status) conditions.push(eq(adminInvite.status, query.status));
    if (query.search) {
      const q = `%${query.search}%`;
      const searchCond = or(ilike(adminInvite.email, q), ilike(user.email, q), ilike(adminInvite.token, q));
      if (searchCond) conditions.push(searchCond);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select(inviteSelect)
        .from(adminInvite)
        .leftJoin(user, eq(adminInvite.invitedBy, user.id))
        .where(where)
        .orderBy(desc(adminInvite.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(adminInvite)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return { items: rows, total: totalRows };
  },

  async findPendingByEmail(email: string): Promise<AdminInviteRow | null> {
    await this.expireOverdue();
    const [row] = await db
      .select(inviteSelect)
      .from(adminInvite)
      .leftJoin(user, eq(adminInvite.invitedBy, user.id))
      .where(and(eq(adminInvite.email, email), eq(adminInvite.status, "pending")))
      .limit(1);
    return (row as AdminInviteRow | undefined) ?? null;
  },

  async findById(id: string): Promise<AdminInviteRow | null> {
    const [row] = await db
      .select(inviteSelect)
      .from(adminInvite)
      .leftJoin(user, eq(adminInvite.invitedBy, user.id))
      .where(eq(adminInvite.id, id))
      .limit(1);
    return (row as AdminInviteRow | undefined) ?? null;
  },

  async findByToken(token: string): Promise<AdminInviteRow | null> {
    await this.expireOverdue();
    const [row] = await db
      .select(inviteSelect)
      .from(adminInvite)
      .leftJoin(user, eq(adminInvite.invitedBy, user.id))
      .where(eq(adminInvite.token, token))
      .limit(1);
    return (row as AdminInviteRow | undefined) ?? null;
  },

  async create(input: {
    id: string;
    email: string;
    role: "moderator" | "admin";
    token: string;
    expiresAt: Date;
    invitedBy: string;
  }): Promise<AdminInviteRow> {
    const [row] = await db
      .insert(adminInvite)
      .values({
        id: input.id,
        email: input.email,
        role: input.role,
        token: input.token,
        expiresAt: input.expiresAt,
        invitedBy: input.invitedBy,
      })
      .returning();
    return row as unknown as AdminInviteRow;
  },

  async revoke(id: string): Promise<AdminInviteRow | null> {
    const [row] = await db
      .update(adminInvite)
      .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(adminInvite.id, id))
      .returning();
    return (row as unknown as AdminInviteRow | undefined) ?? null;
  },

  async regenerate(id: string, token: string, expiresAt: Date): Promise<AdminInviteRow | null> {
    const [row] = await db
      .update(adminInvite)
      .set({ status: "pending", token, expiresAt, revokedAt: null, acceptedAt: null, updatedAt: new Date() })
      .where(eq(adminInvite.id, id))
      .returning();
    return (row as unknown as AdminInviteRow | undefined) ?? null;
  },

  async accept(id: string, userId: string): Promise<AdminInviteRow | null> {
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(adminInvite)
        .set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() })
        .where(eq(adminInvite.id, id))
        .returning();
      if (!updated) return null;
      await tx
        .update(user)
        .set({ systemRole: updated.role as never, updatedAt: new Date() })
        .where(eq(user.id, userId));
      return updated as unknown as AdminInviteRow;
    });
  },

  async expireOverdue(): Promise<void> {
    await db
      .update(adminInvite)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(adminInvite.status, "pending"), lt(adminInvite.expiresAt, new Date())));
  },
};