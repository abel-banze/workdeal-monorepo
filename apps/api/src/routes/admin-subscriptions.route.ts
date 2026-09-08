import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import { adminBillingController } from "../controllers/admin-billing.controller.js";
import {
  adminUpdateSubscriptionStatusSchema,
  cancelSubscriptionSchema,
  changeSubscriptionPlanSchema,
  pauseSubscriptionSchema,
  subscriptionListQuerySchema,
} from "@workdeal/shared";

export const adminSubscriptionsRoute = new Hono<Env>();

// Anteposto por requireAuth + requireSystemRole no mount (admin.route).
adminSubscriptionsRoute.use("*", requireSystemRole("admin", "moderator"));

adminSubscriptionsRoute.get("/", zValidator("query", subscriptionListQuerySchema), async (c) => {
  const { body, status } = await adminBillingController.listSubscriptions(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminSubscriptionsRoute.get("/:id", async (c) => {
  const { body, status } = await adminBillingController.getSubscription(c.req.param("id"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// Mutações restritas a admin (moderator só visualiza).
adminSubscriptionsRoute.patch("/:id/status", requireSystemRole("admin"), zValidator("json", adminUpdateSubscriptionStatusSchema), async (c) => {
  const { body, status } = await adminBillingController.setSubscriptionStatus(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

adminSubscriptionsRoute.post("/:id/change-plan", requireSystemRole("admin"), zValidator("json", changeSubscriptionPlanSchema), async (c) => {
  const { body, status } = await adminBillingController.changeSubscriptionPlan(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

adminSubscriptionsRoute.post("/:id/cancel", requireSystemRole("admin"), zValidator("json", cancelSubscriptionSchema), async (c) => {
  const { body, status } = await adminBillingController.cancelSubscription(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

adminSubscriptionsRoute.post("/:id/pause", requireSystemRole("admin"), zValidator("json", pauseSubscriptionSchema), async (c) => {
  const { body, status } = await adminBillingController.pauseSubscription(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

adminSubscriptionsRoute.post("/:id/resume", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminBillingController.resumeSubscription(c.req.param("id"));
  return c.json(body, status);
});