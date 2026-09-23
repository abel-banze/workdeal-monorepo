import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  createSupportTicketSchema,
  replySupportTicketSchema,
  supportTicketListQuerySchema,
  supportTicketCategorySchema,
  updateSupportTicketStatusSchema,
} from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import { supportController } from "../controllers/support.controller.js";

export const supportRoute = new Hono<Env>();

const adminListQuerySchema = supportTicketListQuerySchema.extend({
  category: supportTicketCategorySchema.optional(),
  q: z.string().trim().max(100).optional(),
});

const adminReplySchema = replySupportTicketSchema.extend({
  internal: z.boolean().optional().default(false),
});

// ── Utilizador ───────────────────────────────────────────────────
supportRoute.post("/", requireAuth, zValidator("json", createSupportTicketSchema), async (c) => {
  const { body, status } = await supportController.create(c.get("user"), c.req.valid("json"));
  return c.json(body, status);
});

supportRoute.get("/my", requireAuth, zValidator("query", supportTicketListQuerySchema), async (c) => {
  const { body, status } = await supportController.mine(c.get("user"), c.req.valid("query"));
  return c.json(body, status);
});

supportRoute.get("/my/:id", requireAuth, async (c) => {
  const { body, status } = await supportController.get(c.get("user"), c.req.param("id"));
  return c.json(body, status);
});

supportRoute.post("/my/:id/replies", requireAuth, zValidator("json", replySupportTicketSchema), async (c) => {
  const { body, status } = await supportController.reply(c.get("user"), c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

supportRoute.post("/my/:id/close", requireAuth, async (c) => {
  const { body, status } = await supportController.close(c.get("user"), c.req.param("id"));
  return c.json(body, status);
});

// ── Equipa Workdeal ──────────────────────────────────────────────
supportRoute.get("/admin", requireAuth, requireSystemRole("admin", "moderator"), zValidator("query", adminListQuerySchema), async (c) => {
  const { body, status } = await supportController.listAdmin(c.req.valid("query"));
  return c.json(body, status);
});

supportRoute.get("/admin/:id", requireAuth, requireSystemRole("admin", "moderator"), async (c) => {
  const { body, status } = await supportController.getAdmin(c.req.param("id"));
  return c.json(body, status);
});

supportRoute.post("/admin/:id/replies", requireAuth, requireSystemRole("admin", "moderator"), zValidator("json", adminReplySchema), async (c) => {
  const { body, status } = await supportController.replyAdmin(c.get("user"), c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

supportRoute.patch("/admin/:id/status", requireAuth, requireSystemRole("admin", "moderator"), zValidator("json", updateSupportTicketStatusSchema), async (c) => {
  const { body, status } = await supportController.setStatus(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});
