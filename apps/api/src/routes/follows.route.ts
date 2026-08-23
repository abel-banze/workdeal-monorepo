import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import type { Env } from "../middlewares/auth.middleware";
import { followsRepository } from "../repositories/follows.repository";
import { ok } from "../lib/api-response";

export const followsRoute = new Hono<Env>();

followsRoute.post("/:profileId", requireAuth, async (c) => {
  await followsRepository.follow(c.get("user").id, c.req.param("profileId"));
  return c.json(ok(null), 201);
});

followsRoute.delete("/:profileId", requireAuth, async (c) => {
  await followsRepository.unfollow(c.get("user").id, c.req.param("profileId"));
  return c.json(ok(null), 200);
});

followsRoute.get("/:profileId", async (c) => {
  const rows = await followsRepository.listByProfile(c.req.param("profileId"));
  return c.json(ok(rows), 200);
});
