import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createReviewSchema } from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { reviewsController } from "../controllers/reviews.controller.js";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { AppError } from "../lib/errors.js";

const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

function rateLimit(limiter: ReturnType<typeof createRateLimiter>) {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
    const r = limiter.check(key);
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições.");
    await next();
  };
}

export const reviewsRoute = new Hono<Env>();

reviewsRoute.get("/:profileId", async (c) => {
  const { body, status } = await reviewsController.list(c.req.param("profileId"));
  c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return c.json(body, status);
});

reviewsRoute.post("/", rateLimit(writeLimiter), requireAuth, zValidator("json", createReviewSchema), async (c) => {
  const { body, status } = await reviewsController.create(c.get("user"), c.req.valid("json"));
  return c.json(body, status);
});

reviewsRoute.delete("/:id", requireAuth, async (c) => {
  const { body, status } = await reviewsController.remove(c.get("user"), c.req.param("id"));
  return c.json(body, status);
});
