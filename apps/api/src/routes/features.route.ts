import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { featuresController } from "../controllers/features.controller.js";
import { subscriptionScopeSchema } from "@workdeal/shared";

// Estado/controlo de features.
// - Público (sem auth): catálogo de flags e estado global.
// - /me (auth): features efectivas do utilizador no âmbito (pessoal ou org),
//   usado pelo portal para reflectir a UI. A autorização real é sempre no backend.
export const featuresRoute = new Hono<Env>();

featuresRoute.get("/", async (c) => {
  const { body, status } = await featuresController.listPublic();
  c.header("Cache-Control", "public, max-age=300");
  return c.json(body, status);
});

featuresRoute.get("/me", requireAuth, zValidator("query", subscriptionScopeSchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await featuresController.listMine(c.get("user"), q.organizationId ?? null);
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});