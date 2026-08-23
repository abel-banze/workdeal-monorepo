import { asc, eq } from "drizzle-orm";
import { db, service } from "@workdeal/db";

export class ServicesRepository {
  async listByProfile(profileId: string) {
    return db.select().from(service).where(eq(service.profileId, profileId)).orderBy(asc(service.sortOrder), asc(service.createdAt));
  }
  async findById(id: string) {
    const [row] = await db.select().from(service).where(eq(service.id, id)).limit(1);
    return row ?? null;
  }
  async create(data: typeof service.$inferInsert) {
    const [row] = await db.insert(service).values(data).returning();
    return row;
  }
  async update(id: string, data: Partial<typeof service.$inferInsert>) {
    const [row] = await db.update(service).set(data).where(eq(service.id, id)).returning();
    return row ?? null;
  }
  async delete(id: string) {
    const [row] = await db.delete(service).where(eq(service.id, id)).returning();
    return row ?? null;
  }
  async countByProfile(profileId: string) {
    const rows = await db.select().from(service).where(eq(service.profileId, profileId));
    return rows.length;
  }
}
export const servicesRepository = new ServicesRepository();
