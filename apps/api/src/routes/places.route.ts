import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { placeAutocompleteQuerySchema } from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { placesController } from "../controllers/places.controller.js";
import { AppError } from "../lib/errors.js";

const autocompleteLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
const detailsLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

function rateLimit(limiter: ReturnType<typeof createRateLimiter>) {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
    const r = limiter.check(key);
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas pesquisas. Aguarda um momento.");
    await next();
  };
}

export const placesRoute = new Hono<Env>();

// Pesquisa de lugares (empresas/endereços) — proxy autenticado para Google Places API (New)
placesRoute.get(
  "/autocomplete",
  requireAuth,
  rateLimit(autocompleteLimiter),
  zValidator("query", placeAutocompleteQuerySchema),
  async (c) => {
    const { input } = c.req.valid("query");
    const { body, status } = await placesController.autocomplete(input);
    return c.json(body, status);
  },
);

// Detalhes de um lugar — pré-preenche morada/contactos/horário no onboarding e edição
placesRoute.get("/details/:placeId", requireAuth, rateLimit(detailsLimiter), async (c) => {
  const placeId = c.req.param("placeId");
  const { body, status } = await placesController.details(placeId);
  return c.json(body, status);
});
