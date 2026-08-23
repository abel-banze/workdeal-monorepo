import { and, desc, eq, sql } from "drizzle-orm";
import { db, report } from "@workdeal/db";
import type { ReportListQuery } from "@workdeal/shared";

export const reportsRepository = {
  async listByStatus(status: string | undefined, page: number, limit: number) {
    const where = status ? eq(report.status, status as never) : undefined;
    const offset = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      db.select().from(report).where(where).orderBy(desc(report.createdAt)).limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(report)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);
    return { items: rows, total: count };
  },
  async findById(id: string) {
    const [row] = await db.select().from(report).where(eq(report.id, id)).limit(1);
    return row ?? null;
  },
  async create(data: typeof report.$inferInsert) {
    const [row] = await db.insert(report).values(data).returning();
    return row;
  },
  async updateStatus(id: string, status: "resolved" | "dismissed") {
    const [row] = await db.update(report).set({ status: status as never, updatedAt: new Date() }).where(eq(report.id, id)).returning();
    return row ?? null;
  },
};
