import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { tenantBillingController } from "../controllers/tenant-billing.controller.js";
import {
  cancelMySubscriptionSchema,
  changeMySubscriptionPlanSchema,
  pauseMySubscriptionSchema,
  resumeMySubscriptionSchema,
  subscriptionScopeSchema,
} from "@workdeal/shared";

// Subscrição do utilizador/empresa (dashboard). Toda a rota exige auth;
// o ownership (membro da org ou pessoal) é validado no service.
export const subscriptionsRoute = new Hono<Env>();

// âmbito: `organizationId` opcional na query (ausente = pessoal).
subscriptionsRoute.get("/current", requireAuth, zValidator("query", subscriptionScopeSchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await tenantBillingController.getCurrentSubscription(c.get("user"), q.organizationId ?? null);
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

subscriptionsRoute.post("/current/change-plan", requireAuth, zValidator("json", changeMySubscriptionPlanSchema), async (c) => {
  const input = c.req.valid("json");
  const { body, status } = await tenantBillingController.changePlan(c.get("user"), input.organizationId ?? null, input);
  return c.json(body, status);
});

subscriptionsRoute.post("/current/cancel", requireAuth, zValidator("json", cancelMySubscriptionSchema), async (c) => {
  const input = c.req.valid("json");
  const { body, status } = await tenantBillingController.cancelSubscription(c.get("user"), input.organizationId ?? null, input);
  return c.json(body, status);
});

subscriptionsRoute.post("/current/pause", requireAuth, zValidator("json", pauseMySubscriptionSchema), async (c) => {
  const input = c.req.valid("json");
  const { body, status } = await tenantBillingController.pauseSubscription(c.get("user"), input.organizationId ?? null, input);
  return c.json(body, status);
});

subscriptionsRoute.post("/current/resume", requireAuth, zValidator("json", resumeMySubscriptionSchema), async (c) => {
  const input = c.req.valid("json");
  const { body, status } = await tenantBillingController.resumeSubscription(c.get("user"), input.organizationId ?? null);
  return c.json(body, status);
});