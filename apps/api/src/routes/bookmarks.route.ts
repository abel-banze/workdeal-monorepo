import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { bookmarksRepository } from "../repositories/bookmarks.repository.js";
import { ok } from "../lib/api-response.js";

export const bookmarksRoute = new Hono<Env>();

bookmarksRoute.get("/me", requireAuth, async (c) => {
  const rows = await bookmarksRepository.listByUser(c.get("user").id);
  return c.json(ok(rows), 200);
});

bookmarksRoute.get("/:profileId/status", requireAuth, async (c) => {
  const bookmarked = await bookmarksRepository.isBookmarked(c.get("user").id, c.req.param("profileId"));
  return c.json(ok({ bookmarked }), 200);
});

bookmarksRoute.post("/:profileId/toggle", requireAuth, async (c) => {
  const bookmarked = await bookmarksRepository.toggle(c.get("user").id, c.req.param("profileId"));
  return c.json(ok({ bookmarked }), 200);
});

bookmarksRoute.post("/:profileId", requireAuth, async (c) => {
  await bookmarksRepository.bookmark(c.get("user").id, c.req.param("profileId"));
  return c.json(ok(null), 201);
});

bookmarksRoute.delete("/:profileId", requireAuth, async (c) => {
  await bookmarksRepository.unbookmark(c.get("user").id, c.req.param("profileId"));
  return c.json(ok(null), 200);
});