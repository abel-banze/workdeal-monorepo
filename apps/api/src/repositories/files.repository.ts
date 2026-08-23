import { db, file } from "@workdeal/db";
import { eq, inArray } from "drizzle-orm";

export const filesRepository = {
  async create(data: typeof file.$inferInsert) {
    const [row] = await db.insert(file).values(data).returning();
    return row;
  },

  async findById(id: string) {
    const [row] = await db.select().from(file).where(eq(file.id, id)).limit(1);
    return row ?? null;
  },

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await db.select().from(file).where(inArray(file.id, ids));
    return rows;
  },

  async remove(id: string) {
    await db.delete(file).where(eq(file.id, id));
  },
};
