import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import { aiSettingsController } from "../controllers/ai-settings.controller.js";
import {
  aiCredentialUpsertSchema,
  aiSettingsUpdateSchema,
  aiUsageQuerySchema,
} from "@workdeal/shared";

export const aiSettingsRoute = new Hono<Env>();

// Anteposto por requireAuth + requireSystemRole no mount (admin.route).
aiSettingsRoute.use("*", requireSystemRole("admin", "moderator"));

// Overview consolidado (moderator e admin).
aiSettingsRoute.get("/", async (c) => {
  const { body, status } = await aiSettingsController.getOverview();
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// Mutações restritas a admin.
aiSettingsRoute.put("/settings", requireSystemRole("admin"), zValidator("json", aiSettingsUpdateSchema), async (c) => {
  const { body, status } = await aiSettingsController.updateSettings(c.req.valid("json"));
  return c.json(body, status);
});

aiSettingsRoute.post("/credentials", requireSystemRole("admin"), zValidator("json", aiCredentialUpsertSchema), async (c) => {
  const { body, status } = await aiSettingsController.upsertCredential(c.req.valid("json"));
  return c.json(body, status);
});

aiSettingsRoute.delete("/credentials/:provider", requireSystemRole("admin"), async (c) => {
  const { body, status } = await aiSettingsController.deleteCredential(c.req.param("provider"));
  return c.json(body, status);
});

aiSettingsRoute.post("/test-connection", requireSystemRole("admin"), async (c) => {
  const { body, status } = await aiSettingsController.testConnection();
  return c.json(body, status);
});

// Telemetria de uso (moderator e admin).
aiSettingsRoute.get("/usage", zValidator("query", aiUsageQuerySchema), async (c) => {
  const { body, status } = await aiSettingsController.getUsage(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});