import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import type { Env } from "../middlewares/auth.middleware.js";
import { badgesController } from "../controllers/badges.controller.js";
import { AppError } from "../lib/errors.js";
import { badgesListQuerySchema } from "@workdeal/shared";

const listLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });

export const badgesRoute = new Hono<Env>();

// Catálogo público de selos — fonte para filtros de UI e selos activos.
badgesRoute.get("/", (c, next) => {
  const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
  const r = listLimiter.check(key);
  c.header("X-RateLimit-Remaining", String(r.remaining));
  c.header("X-RateLimit-Reset", String(Math.ceil(r.resetAt / 1000)));
  if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições. Tente novamente em breve.");
  return next();
}, zValidator("query", badgesListQuerySchema), async (c) => {
  const { body, status } = await badgesController.list(c.req.valid("query"));
  c.header("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return c.json(body, status);
});