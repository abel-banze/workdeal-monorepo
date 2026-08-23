import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware";
import type { Env } from "../middlewares/auth.middleware";
import { ok } from "../lib/api-response";
import { tagsRepository } from "../repositories/tags.repository";
import { profilesRepository } from "../repositories/profiles.repository";
import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission } from "@workdeal/shared";

export const tagsRoute = new Hono<Env>();

tagsRoute.get("/", async (c) => {
  const rows = await tagsRepository.listActive();
  return c.json(ok(rows), 200);
});

const setTagsSchema = z.object({
  profileId: z.string().min(1),
  tagSlugs: z.array(z.string().min(1).max(64)).max(20),
  organizationId: z.string().min(1).nullable().optional(),
});

tagsRoute.post("/profile", requireAuth, zValidator("json", setTagsSchema), async (c) => {
  const user = c.get("user");
  const { profileId, tagSlugs, organizationId } = c.req.valid("json");
  // verifica permissao
  const { db, profile } = await import("@workdeal/db");
  const { eq } = await import("drizzle-orm");
  const [row] = await db.select().from(profile).where(eq(profile.id, profileId)).limit(1);
  if (!row) return c.json(ok(null), 404);
  let allowed = row.userId === user.id;
  if (!allowed && organizationId) {
    const role = await getOrgRole(user.id, organizationId);
    if (role && hasOrgPermission(role, "profile:edit")) allowed = true;
  }
  if (!allowed) return c.json({ success: false, error: { code: "FORBIDDEN", message: "Sem permissão" } } as never, 403);

  const tags = await tagsRepository.findBySlugs(tagSlugs);
  // cria tags inexistentes on-the-fly
  const existingSlugs = new Set(tags.map((t) => t.slug));
  const missing = tagSlugs.filter((s) => !existingSlugs.has(s));
  if (missing.length > 0) {
    const { db: db2, tag } = await import("@workdeal/db");
    for (const slug of missing) {
      const id = `tag_${slug}`;
      await db2.insert(tag).values({ id, slug, name: slug.replace(/-/g, " ") }).onConflictDoNothing();
    }
  }
  const allTags = await tagsRepository.findBySlugs(tagSlugs);
  await tagsRepository.setProfileTags(profileId, allTags.map((t) => t.id));
  return c.json(ok(allTags), 200);
});

tagsRoute.get("/profile/:profileId", async (c) => {
  const profileId = c.req.param("profileId");
  const rows = await tagsRepository.getProfileTags(profileId);
  return c.json(ok(rows), 200);
});
