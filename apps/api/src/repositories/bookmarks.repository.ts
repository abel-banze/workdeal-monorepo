import { and, desc, eq } from "drizzle-orm";
import { db, profileBookmark } from "@workdeal/db";

export const bookmarksRepository = {
  async bookmark(userId: string, profileId: string) {
    await db.insert(profileBookmark).values({ userId, profileId }).onConflictDoNothing();
  },
  async unbookmark(userId: string, profileId: string) {
    await db
      .delete(profileBookmark)
      .where(and(eq(profileBookmark.userId, userId), eq(profileBookmark.profileId, profileId)));
  },
  async toggle(userId: string, profileId: string): Promise<boolean> {
    const current = await this.isBookmarked(userId, profileId);
    if (current) {
      await this.unbookmark(userId, profileId);
    } else {
      await this.bookmark(userId, profileId);
    }
    return !current;
  },
  async isBookmarked(userId: string, profileId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(profileBookmark)
      .where(and(eq(profileBookmark.userId, userId), eq(profileBookmark.profileId, profileId)))
      .limit(1);
    return !!row;
  },
  async listByUser(userId: string) {
    return db
      .select()
      .from(profileBookmark)
      .where(eq(profileBookmark.userId, userId))
      .orderBy(desc(profileBookmark.createdAt));
  },
};