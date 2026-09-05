import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { db, category } from "@workdeal/db";
import type { CategoryListQuery } from "@workdeal/shared";

export interface CategoryRow {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const categoriesRepository = {
  async findById(id: string): Promise<CategoryRow | null> {
    const [row] = await db.select().from(category).where(eq(category.id, id)).limit(1);
    return (row as CategoryRow) ?? null;
  },

  async findBySlug(slug: string): Promise<CategoryRow | null> {
    const [row] = await db.select().from(category).where(eq(category.slug, slug)).limit(1);
    return (row as CategoryRow) ?? null;
  },

  async list(query: CategoryListQuery): Promise<{ items: CategoryRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.search) {
      conditions.push(ilike(category.name, `%${query.search}%`));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(category.isActive, query.isActive));
    }
    if (query.parentId !== undefined) {
      conditions.push(eq(category.parentId, query.parentId));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(category)
        .where(where)
        .orderBy(asc(category.name))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(category).where(where).then((r) => r[0]?.count ?? 0),
    ]);

    return { items: rows as CategoryRow[], total: totalRows };
  },

  async listAll(): Promise<CategoryRow[]> {
    return db.select().from(category).orderBy(asc(category.name)) as Promise<CategoryRow[]>;
  },

  async create(data: { id: string; name: string; slug: string; description?: string | null; parentId?: string | null; isActive?: boolean }): Promise<CategoryRow> {
    const [row] = await db
      .insert(category)
      .values({
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        parentId: data.parentId ?? null,
        isActive: data.isActive ?? true,
      })
      .returning();
    return row as CategoryRow;
  },

  async update(id: string, data: { name?: string; slug?: string; description?: string | null; parentId?: string | null; isActive?: boolean }): Promise<CategoryRow | null> {
    const [row] = await db
      .update(category)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(category.id, id))
      .returning();
    return (row as CategoryRow) ?? null;
  },

  async remove(id: string): Promise<boolean> {
    const [row] = await db.delete(category).where(eq(category.id, id)).returning();
    return !!row;
  },

  async hasChildren(id: string): Promise<boolean> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(category)
      .where(eq(category.parentId, id));
    return (row?.count ?? 0) > 0;
  },

  async hasProfiles(id: string): Promise<boolean> {
    const { profileCategory } = await import("@workdeal/db");
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(profileCategory)
      .where(eq(profileCategory.categoryId, id));
    return (row?.count ?? 0) > 0;
  },
};
