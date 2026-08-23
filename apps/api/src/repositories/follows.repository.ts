import { and, eq } from "drizzle-orm";
import { db, follow } from "@workdeal/db";

export const followsRepository = {
  async follow(followerUserId: string, profileId: string) {
    await db.insert(follow).values({ followerUserId, profileId }).onConflictDoNothing();
  },
  async unfollow(followerUserId: string, profileId: string) {
    await db.delete(follow).where(and(eq(follow.followerUserId, followerUserId), eq(follow.profileId, profileId)));
  },
  async listByProfile(profileId: string) {
    return db.select().from(follow).where(eq(follow.profileId, profileId));
  },
  async isFollowing(followerUserId: string, profileId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(follow)
      .where(and(eq(follow.followerUserId, followerUserId), eq(follow.profileId, profileId)))
      .limit(1);
    return !!row;
  },
};
