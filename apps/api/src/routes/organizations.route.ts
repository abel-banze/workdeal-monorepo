import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { notificationPrefsSchema } from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireOrgPermission } from "../middlewares/rbac.middleware.js";
import { organizationsController } from "../controllers/organizations.controller.js";

export const organizationsRoute = new Hono<Env>();

// Preferências de notificação da empresa (Definições). Leitura: qualquer
// membro; escrita: quem pode editar o perfil (owner/admin/editor).
organizationsRoute.get("/:organizationId/notification-prefs", requireAuth, async (c) => {
  const { body, status } = await organizationsController.getNotificationPrefs(c.get("user"), c.req.param("organizationId"));
  return c.json(body, status);
});

organizationsRoute.patch(
  "/:organizationId/notification-prefs",
  requireAuth,
  requireOrgPermission("profile:edit"),
  zValidator("json", notificationPrefsSchema),
  async (c) => {
    const body = c.req.valid("json");
    const { body: resBody, status } = await organizationsController.patchNotificationPrefs(c.get("user"), c.req.param("organizationId"), body);
    return c.json(resBody, status);
  },
);
