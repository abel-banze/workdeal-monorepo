import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import { adminBillingController } from "../controllers/admin-billing.controller.js";
import {
  planCreateSchema,
  planFeatureUpsertSchema,
  planListQuerySchema,
  planUpdateSchema,
} from "@workdeal/shared";

export const adminPlansRoute = new Hono<Env>();

// Anteposto por requireAuth + requireSystemRole no mount (admin.route).
adminPlansRoute.use("*", requireSystemRole("admin", "moderator"));

// Listagem (moderator e admin) — inclui inactivos com includeInactive=true.
adminPlansRoute.get("/", zValidator("query", planListQuerySchema), async (c) => {
  const { body, status } = await adminBillingController.listPlans(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// Mutações restritas a admin.
adminPlansRoute.post("/", requireSystemRole("admin"), zValidator("json", planCreateSchema), async (c) => {
  const { body, status } = await adminBillingController.createPlan(c.req.valid("json"));
  return c.json(body, status);
});

adminPlansRoute.get("/:id", async (c) => {
  const { body, status } = await adminBillingController.getPlan(c.req.param("id"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminPlansRoute.patch("/:id", requireSystemRole("admin"), zValidator("json", planUpdateSchema), async (c) => {
  const { body, status } = await adminBillingController.updatePlan(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

adminPlansRoute.delete("/:id", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminBillingController.removePlan(c.req.param("id"));
  return c.json(body, status);
});

adminPlansRoute.post("/:id/toggle", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminBillingController.togglePlanActive(c.req.param("id"));
  return c.json(body, status);
});

// Substituição completa das features próprias do plano.
adminPlansRoute.put("/:id/features", requireSystemRole("admin"), zValidator("json", planFeatureUpsertSchema), async (c) => {
  const { body, status } = await adminBillingController.upsertPlanFeatures(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});