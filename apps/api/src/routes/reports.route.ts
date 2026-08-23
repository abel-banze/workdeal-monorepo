import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createReportSchema } from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware";
import type { Env } from "../middlewares/auth.middleware";
import { reportsController } from "../controllers/reports.controller";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { AppError } from "../lib/errors";

const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
function rateLimit(limiter: ReturnType<typeof createRateLimiter>) {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
    const r = limiter.check(key);
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições.");
    await next();
  };
}

export const reportsRoute = new Hono<Env>();

reportsRoute.post("/", rateLimit(writeLimiter), requireAuth, zValidator("json", createReportSchema), async (c) => {
  const { body, status } = await reportsController.create(c.get("user").id, c.req.valid("json"));
  return c.json(body, status);
});
