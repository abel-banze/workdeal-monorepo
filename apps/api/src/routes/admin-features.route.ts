import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import { adminFeaturesController } from "../controllers/admin-features.controller.js";
import {
  featureFlagCreateSchema,
  featureFlagListQuerySchema,
  featureFlagOverrideUpsertSchema,
  featureFlagUpdateSchema,
} from "@workdeal/shared";

export const adminFeaturesRoute = new Hono<Env>();

// Anteposto por requireAuth + requireSystemRole no mount (admin.route).
adminFeaturesRoute.use("*", requireSystemRole("admin", "moderator"));

// Listagem (moderator e admin) — opcionalmente filtrada por grupo.
adminFeaturesRoute.get("/", zValidator("query", featureFlagListQuerySchema), async (c) => {
  const { body, status } = await adminFeaturesController.listFlags(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// Auditoria de integridade — entitlements bloqueados por flags (admin only).
adminFeaturesRoute.get("/integrity", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminFeaturesController.assertIntegrity();
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// Mutações restritas a admin.
adminFeaturesRoute.post("/", requireSystemRole("admin"), zValidator("json", featureFlagCreateSchema), async (c) => {
  const { body, status } = await adminFeaturesController.createFlag(c.req.valid("json"));
  return c.json(body, status);
});

adminFeaturesRoute.get("/:key", async (c) => {
  const { body, status } = await adminFeaturesController.getFlag(c.req.param("key"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminFeaturesRoute.patch("/:key", requireSystemRole("admin"), zValidator("json", featureFlagUpdateSchema), async (c) => {
  const { body, status } = await adminFeaturesController.updateFlag(c.req.param("key"), c.req.valid("json"));
  return c.json(body, status);
});

adminFeaturesRoute.delete("/:key", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminFeaturesController.removeFlag(c.req.param("key"));
  return c.json(body, status);
});

adminFeaturesRoute.post("/:key/toggle", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminFeaturesController.toggleFlag(c.req.param("key"));
  return c.json(body, status);
});

adminFeaturesRoute.post("/:key/emergency", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminFeaturesController.toggleEmergency(c.req.param("key"));
  return c.json(body, status);
});

// ── Sobreposições por organização ─────────────────────────────────────────
adminFeaturesRoute.get("/:key/overrides", async (c) => {
  const { body, status } = await adminFeaturesController.getFlagOverrides(c.req.param("key"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminFeaturesRoute.put("/:key/overrides/:organizationId", requireSystemRole("admin"), zValidator("json", featureFlagOverrideUpsertSchema), async (c) => {
  const { body, status } = await adminFeaturesController.setOverride(
    c.req.param("key"),
    c.req.param("organizationId"),
    c.req.valid("json"),
    c.get("user").id,
  );
  return c.json(body, status);
});

adminFeaturesRoute.delete("/:key/overrides/:organizationId", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminFeaturesController.removeOverride(c.req.param("key"), c.req.param("organizationId"));
  return c.json(body, status);
});