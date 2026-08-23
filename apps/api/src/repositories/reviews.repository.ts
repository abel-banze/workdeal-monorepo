import { and, desc, eq } from "drizzle-orm";
import { db, profile, review } from "@workdeal/db";

export type ReviewRow = typeof review.$inferSelect;

class ReviewsRepository {
  async create(data: typeof review.$inferInsert): Promise<ReviewRow> {
    const [row] = await db.insert(review).values(data).returning();
    if (!row) throw new Error("Falha ao criar avaliação");
    return row;
  }

  async findByProfile(profileId: string): Promise<ReviewRow[]> {
    return db.select().from(review).where(eq(review.profileId, profileId)).orderBy(desc(review.createdAt));
  }

  async findByProfileAuthorOrigin(profileId: string, authorUserId: string, origin: string): Promise<ReviewRow | null> {
    const [row] = await db
      .select()
      .from(review)
      .where(and(eq(review.profileId, profileId), eq(review.authorUserId, authorUserId), eq(review.origin, origin as never)))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<ReviewRow | null> {
    const [row] = await db.select().from(review).where(eq(review.id, id)).limit(1);
    return row ?? null;
  }

  async deleteById(id: string): Promise<void> {
    await db.delete(review).where(eq(review.id, id));
  }

  async avgRating(profileId: string): Promise<{ avg: number; count: number }> {
    const rows = await db.select().from(review).where(eq(review.profileId, profileId));
    if (rows.length === 0) return { avg: 0, count: 0 };
    const sum = rows.reduce((a, r) => a + r.rating, 0);
    return { avg: sum / rows.length, count: rows.length };
  }

  async findProfileOwner(profileId: string): Promise<{ userId: string | null; organizationId: string | null } | null> {
    const [row] = await db
      .select({ userId: profile.userId, organizationId: profile.organizationId })
      .from(profile)
      .where(eq(profile.id, profileId))
      .limit(1);
    return row ?? null;
  }
}

export const reviewsRepository = new ReviewsRepository();
