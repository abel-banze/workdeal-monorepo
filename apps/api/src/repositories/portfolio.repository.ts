import { asc, eq } from "drizzle-orm";
import { db, portfolioItem } from "@workdeal/db";

export class PortfolioRepository {
  async listByProfile(profileId: string) {
    return db.select().from(portfolioItem).where(eq(portfolioItem.profileId, profileId)).orderBy(asc(portfolioItem.sortOrder), asc(portfolioItem.createdAt));
  }
  async findById(id: string) {
    const [row] = await db.select().from(portfolioItem).where(eq(portfolioItem.id, id)).limit(1);
    return row ?? null;
  }
  async create(data: typeof portfolioItem.$inferInsert) {
    const [row] = await db.insert(portfolioItem).values(data).returning();
    return row;
  }
  async update(id: string, data: Partial<typeof portfolioItem.$inferInsert>) {
    const [row] = await db.update(portfolioItem).set(data).where(eq(portfolioItem.id, id)).returning();
    return row ?? null;
  }
  async delete(id: string) {
    const [row] = await db.delete(portfolioItem).where(eq(portfolioItem.id, id)).returning();
    return row ?? null;
  }
  async countByProfile(profileId: string) {
    const rows = await db.select().from(portfolioItem).where(eq(portfolioItem.profileId, profileId));
    return rows.length;
  }
}
export const portfolioRepository = new PortfolioRepository();
