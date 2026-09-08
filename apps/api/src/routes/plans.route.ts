import { Hono } from "hono";
import type { Env } from "../middlewares/auth.middleware.js";
import { tenantBillingController } from "../controllers/tenant-billing.controller.js";

// Catálogo público de planos (activos e isPublic) — usado pela página de
// planos e pelo checkout. Sem auth.
export const plansRoute = new Hono<Env>();

plansRoute.get("/", async (c) => {
  const { body, status } = await tenantBillingController.listPublicPlans();
  c.header("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return c.json(body, status);
});