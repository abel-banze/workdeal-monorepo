import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createFeedbackSchema, feedbackListQuerySchema, updateFeedbackSchema } from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import { feedbackController } from "../controllers/feedback.controller.js";

export const feedbackRoute = new Hono<Env>();

const myQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ── Utilizador ───────────────────────────────────────────────────
feedbackRoute.post("/", requireAuth, zValidator("json", createFeedbackSchema), async (c) => {
  const { body, status } = await feedbackController.submit(c.get("user"), c.req.valid("json"));
  return c.json(body, status);
});

feedbackRoute.get("/my", requireAuth, zValidator("query", myQuerySchema), async (c) => {
  const { body, status } = await feedbackController.mine(c.get("user"), c.req.valid("query"));
  return c.json(body, status);
});

// ── Equipa Workdeal ──────────────────────────────────────────────
feedbackRoute.get("/admin", requireAuth, requireSystemRole("admin", "moderator"), zValidator("query", feedbackListQuerySchema), async (c) => {
  const { body, status } = await feedbackController.listAdmin(c.req.valid("query"));
  return c.json(body, status);
});

feedbackRoute.patch("/admin/:id", requireAuth, requireSystemRole("admin", "moderator"), zValidator("json", updateFeedbackSchema), async (c) => {
  const { body, status } = await feedbackController.updateAdmin(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});
