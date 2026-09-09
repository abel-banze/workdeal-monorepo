import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import { adminAffiliatesController } from "../controllers/admin-affiliates.controller.js";
import { affiliateCreateInputSchema, affiliateListQuerySchema, affiliateReferralListQuerySchema, affiliateUpdateInputSchema } from "@workdeal/shared";

export const adminAffiliatesRoute = new Hono<Env>();

adminAffiliatesRoute.use("*", requireSystemRole("admin", "moderator"));

adminAffiliatesRoute.get("/", zValidator("query", affiliateListQuerySchema), async (c) => {
  const { body, status } = await adminAffiliatesController.list(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminAffiliatesRoute.post("/", requireSystemRole("admin"), zValidator("json", affiliateCreateInputSchema), async (c) => {
  const { body, status } = await adminAffiliatesController.create(c.req.valid("json"));
  return c.json(body, status);
});

adminAffiliatesRoute.patch("/:id", requireSystemRole("admin"), zValidator("json", affiliateUpdateInputSchema), async (c) => {
  const { body, status } = await adminAffiliatesController.update(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

adminAffiliatesRoute.get("/:id/referrals", zValidator("query", affiliateReferralListQuerySchema), async (c) => {
  const { body, status } = await adminAffiliatesController.referrals(c.req.param("id"), c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});