import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { notificationListQuerySchema } from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { ok } from "../lib/api-response.js";
import { notificationsService } from "../services/notifications.service.js";

export const notificationsRoute = new Hono<Env>();

// Inbox próprio + empresas onde é membro (mais recentes primeiro)
notificationsRoute.get("/", requireAuth, zValidator("query", notificationListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const res = await notificationsService.list(c.get("user"), q);
  return c.json(ok(res.items, { total: res.total, page: res.page, limit: res.limit }), 200);
});

notificationsRoute.get("/unread-count", requireAuth, async (c) => {
  const res = await notificationsService.unreadCount(c.get("user"));
  return c.json(ok(res), 200);
});

notificationsRoute.patch("/:id/read", requireAuth, async (c) => {
  const row = await notificationsService.markRead(c.get("user"), c.req.param("id"));
  return c.json(ok(row), 200);
});

notificationsRoute.post("/read-all", requireAuth, async (c) => {
  const res = await notificationsService.markAllRead(c.get("user"));
  return c.json(ok(res), 200);
});
