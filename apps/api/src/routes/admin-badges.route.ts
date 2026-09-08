import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import { adminBadgesController } from "../controllers/admin-badges.controller.js";
import { adminBadgesListQuerySchema, badgeAssignSchema, badgeCreateSchema, badgeUpdateSchema } from "@workdeal/shared";

export const adminBadgesRoute = new Hono<Env>();

// Anteposto por requireAuth + requireSystemRole no mount (admin.route).
adminBadgesRoute.use("*", requireSystemRole("admin", "moderator"));

// ── Catálogo ───────────────────────────────────────────────────────────────

adminBadgesRoute.get("/", zValidator("query", adminBadgesListQuerySchema), async (c) => {
  const { body, status } = await adminBadgesController.list(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminBadgesRoute.post("/", requireSystemRole("admin"), zValidator("json", badgeCreateSchema), async (c) => {
  const { body, status } = await adminBadgesController.create(c.req.valid("json"));
  return c.json(body, status);
});

adminBadgesRoute.get("/:id", async (c) => {
  const { body, status } = await adminBadgesController.getById(c.req.param("id"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminBadgesRoute.patch("/:id", requireSystemRole("admin"), zValidator("json", badgeUpdateSchema), async (c) => {
  const { body, status } = await adminBadgesController.update(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

adminBadgesRoute.delete("/:id", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminBadgesController.remove(c.req.param("id"));
  return c.json(body, status);
});

adminBadgesRoute.post("/:id/toggle", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminBadgesController.toggleActive(c.req.param("id"));
  return c.json(body, status);
});

// ── Atribuição manual em instituições ──────────────────────────────────────

adminBadgesRoute.get("/institutions/:institutionId", async (c) => {
  const { body, status } = await adminBadgesController.listInstitutionBadges(c.req.param("institutionId"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminBadgesRoute.post("/institutions/:institutionId", requireSystemRole("admin"), zValidator("json", badgeAssignSchema), async (c) => {
  const { body, status } = await adminBadgesController.assignBadge(c.req.param("institutionId"), c.req.valid("json"), c.get("user").id);
  return c.json(body, status);
});

adminBadgesRoute.delete("/institutions/:institutionId/:badgeId", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminBadgesController.revokeBadge(c.req.param("institutionId"), c.req.param("badgeId"));
  return c.json(body, status);
});