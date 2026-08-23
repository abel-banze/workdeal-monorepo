import { eq, inArray } from "drizzle-orm";
import { db, tag, profileTag } from "@workdeal/db";

export class TagsRepository {
  async listActive() {
    return db.select().from(tag);
  }
  async findBySlugs(slugs: string[]) {
    if (slugs.length === 0) return [];
    return db.select().from(tag).where(inArray(tag.slug, slugs));
  }
  async setProfileTags(profileId: string, tagIds: string[]) {
    await db.delete(profileTag).where(eq(profileTag.profileId, profileId));
    if (tagIds.length === 0) return;
    await db.insert(profileTag).values(tagIds.map((tagId) => ({ profileId, tagId })));
  }
  async getProfileTags(profileId: string) {
    return db.select({ id: tag.id, slug: tag.slug, name: tag.name }).from(profileTag).innerJoin(tag, eq(profileTag.tagId, tag.id)).where(eq(profileTag.profileId, profileId));
  }
}
export const tagsRepository = new TagsRepository();
