import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware";
import type { Env } from "../middlewares/auth.middleware";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { servicesController } from "../controllers/services.controller";
import { AppError } from "../lib/errors";

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });
function rateLimit() {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? "anon";
    const r = limiter.check(key);
    c.header("X-RateLimit-Remaining", String(r.remaining));
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições");
    await next();
  };
}

export const servicesRoute = new Hono<Env>();

const createSchema = z.object({
  profileId: z.string().min(1),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  priceMzn: z.number().int().min(0).max(100_000_000).nullable().optional(),
  imageUrl: z.string().trim().url().max(512).nullable().optional(),
  categoryId: z.string().min(1).nullable().optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  priceMzn: z.number().int().min(0).max(100_000_000).nullable().optional(),
  imageUrl: z.string().trim().url().max(512).nullable().optional(),
  categoryId: z.string().min(1).nullable().optional(),
});

servicesRoute.get("/:profileId", rateLimit(), async (c) => {
  const { body, status } = await servicesController.list(c.req.param("profileId"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

servicesRoute.post("/", requireAuth, rateLimit(), zValidator("json", createSchema), async (c) => {
  const { body, status } = await servicesController.create(c.get("user"), c.req.valid("json"));
  return c.json(body, status);
});

servicesRoute.patch("/:id", requireAuth, rateLimit(), zValidator("json", updateSchema), async (c) => {
  const { body, status } = await servicesController.update(c.get("user"), c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

servicesRoute.delete("/:id", requireAuth, rateLimit(), async (c) => {
  const { body, status } = await servicesController.remove(c.get("user"), c.req.param("id"));
  return c.json(body, status);
});
