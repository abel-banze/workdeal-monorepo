import { eq, inArray } from "drizzle-orm";
import { db, tag, profileTag, taskTag } from "@workdeal/db";

export class TagsRepository {
  async listActive() {
    return db.select().from(tag);
  }
  async findBySlugs(slugs: string[]) {
    if (slugs.length === 0) return [];
    return db.select().from(tag).where(inArray(tag.slug, slugs));
  }
  /** Cria tags inexistentes on-the-fly e devolve todas as tags para os slugs pedidos. */
  async ensureTagsBySlugs(slugs: string[]) {
    const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
    if (unique.length === 0) return [];
    const existing = await this.findBySlugs(unique);
    const existingSlugs = new Set(existing.map((t) => t.slug));
    const missing = unique.filter((s) => !existingSlugs.has(s));
    if (missing.length > 0) {
      await db
        .insert(tag)
        .values(missing.map((slug) => ({ id: `tag_${slug}`, slug, name: slug.replace(/-/g, " ") })))
        .onConflictDoNothing();
    }
    return this.findBySlugs(unique);
  }
  async setProfileTags(profileId: string, tagIds: string[]) {
    await db.delete(profileTag).where(eq(profileTag.profileId, profileId));
    if (tagIds.length === 0) return;
    await db.insert(profileTag).values(tagIds.map((tagId) => ({ profileId, tagId })));
  }
  async getProfileTags(profileId: string) {
    return db.select({ id: tag.id, slug: tag.slug, name: tag.name }).from(profileTag).innerJoin(tag, eq(profileTag.tagId, tag.id)).where(eq(profileTag.profileId, profileId));
  }
  async setTaskTags(taskId: string, tagIds: string[]) {
    await db.delete(taskTag).where(eq(taskTag.taskId, taskId));
    if (tagIds.length === 0) return;
    await db.insert(taskTag).values(tagIds.map((tagId) => ({ taskId, tagId })));
  }
  async getTaskTags(taskId: string) {
    return db.select({ id: tag.id, slug: tag.slug, name: tag.name }).from(taskTag).innerJoin(tag, eq(taskTag.tagId, tag.id)).where(eq(taskTag.taskId, taskId));
  }
  async getTaskTagsForTasks(taskIds: string[]): Promise<Map<string, { id: string; slug: string; name: string }[]>> {
    if (taskIds.length === 0) return new Map();
    const rows = await db
      .select({ taskId: taskTag.taskId, id: tag.id, slug: tag.slug, name: tag.name })
      .from(taskTag)
      .innerJoin(tag, eq(taskTag.tagId, tag.id))
      .where(inArray(taskTag.taskId, taskIds));
    const map = new Map<string, { id: string; slug: string; name: string }[]>();
    for (const r of rows) {
      const arr = map.get(r.taskId) ?? [];
      arr.push({ id: r.id, slug: r.slug, name: r.name });
      map.set(r.taskId, arr);
    }
    return map;
  }
}
export const tagsRepository = new TagsRepository();
