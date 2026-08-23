import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { onboardingCompleteSchema } from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { onboardingController } from "../controllers/onboarding.controller.js";
import { AppError } from "../lib/errors.js";

const completeLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

function rateLimit(limiter: ReturnType<typeof createRateLimiter>) {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
    const r = limiter.check(key);
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas tentativas. Aguarda um momento.");
    await next();
  };
}

export const onboardingRoute = new Hono<Env>();

// Orquestrador atómico do onboarding — perfil + categorias + qualificação +
// localização + tags numa única transação; idempotente em retry.
// Exige header x-verified-contacts com tokens HMAC dos contactos verificados via OTP.
onboardingRoute.post(
  "/complete",
  requireAuth,
  rateLimit(completeLimiter),
  zValidator("json", onboardingCompleteSchema),
  async (c) => {
    const body = c.req.valid("json");
    const verifiedHeader = c.req.header("x-verified-contacts") ?? null;
    const { body: resBody, status } = await onboardingController.complete(c.get("user"), body, verifiedHeader);
    return c.json(resBody, status);
  },
);
