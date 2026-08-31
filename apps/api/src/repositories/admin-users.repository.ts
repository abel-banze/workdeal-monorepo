import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, user } from "@workdeal/db";
import type { AdminUserListQuery } from "@workdeal/shared";

export type AdminUserRow = typeof user.$inferSelect;

export const adminUsersRepository = {
  async list(query: AdminUserListQuery): Promise<{ items: AdminUserRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.role) {
      conditions.push(eq(user.systemRole, query.role as never));
    }
    if (query.search) {
      const q = `%${query.search}%`;
      conditions.push(or(ilike(user.name, q), ilike(user.email, q)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, count] = await Promise.all([
      db
        .select()
        .from(user)
        .where(where)
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(user)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return { items: rows, total: count };
  },

  async updateRole(userId: string, systemRole: "user" | "moderator" | "admin"): Promise<AdminUserRow | null> {
    const [row] = await db
      .update(user)
      .set({ systemRole: systemRole as never, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();
    return row ?? null;
  },

  async findById(userId: string): Promise<AdminUserRow | null> {
    const [row] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    return row ?? null;
  },
};
