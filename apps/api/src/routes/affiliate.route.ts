import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { affiliateController } from "../controllers/affiliate.controller.js";
import { affiliateAttributionInputSchema, affiliateValidateInputSchema } from "@workdeal/shared";

export const affiliateRoute = new Hono<Env>();

// Validação pública de um código (cupom/link) — usado nos formulários de
// registo/onboarding para dar feedback imediato.
affiliateRoute.post("/validate", zValidator("json", affiliateValidateInputSchema), async (c) => {
  const { body, status } = await affiliateController.validate(c.req.valid("json"));
  return c.json(body, status);
});

// Painel do afiliado (código, link, referrals, earnings)
affiliateRoute.get("/me", requireAuth, async (c) => {
  const { body, status } = await affiliateController.me(c.get("user").id);
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// Atribui a empresa convidada ao afiliado (no onboarding / registo)
affiliateRoute.post("/attach", requireAuth, zValidator("json", affiliateAttributionInputSchema), async (c) => {
  const { body, status } = await affiliateController.attach(c.get("user").id, c.req.valid("json"));
  return c.json(body, status);
});