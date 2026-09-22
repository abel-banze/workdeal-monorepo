import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { ok } from "../lib/api-response.js";
import { AppError } from "../lib/errors.js";
import { analyticsService } from "../services/analytics.service.js";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";

const trackLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });
const dashboardLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

export const analyticsRoute = new Hono<Env>();

const trackSchema = z.object({
  profileId: z.string().min(1),
  eventType: z.enum([
    "page_view",
    "contact_click",
    "whatsapp_click",
    "phone_click",
    "email_click",
    "website_click",
    "save",
    "quote_request",
    "search_impression",
  ]),
  visitorId: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  referrer: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/v1/analytics/track — public endpoint, rate-limited
analyticsRoute.post("/track", async (c) => {
  const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
  const r = trackLimiter.check(key);
  c.header("X-RateLimit-Remaining", String(r.remaining));
  if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições");

  const body = await c.req.json().catch(() => ({}));
  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Dados inválidos", parsed.error.flatten());
  }

  const { profileId, eventType, visitorId, province, district, referrer, metadata } = parsed.data;
  await analyticsService.track(
    {
      profileId,
      eventType,
      visitorId: visitorId ?? null,
      province: province ?? null,
      district: district ?? null,
      referrer: referrer ?? null,
      metadata: metadata ?? null,
    },
    { authorization: c.req.header("Authorization"), cookie: c.req.header("Cookie") },
  );

  return c.json(ok({ tracked: true }), 201);
});

// GET /api/v1/analytics/:profileId/dashboard — auth + RBAC + feature gate
analyticsRoute.get("/:profileId/dashboard", requireAuth, async (c) => {
  const user = c.get("user");
  const profileId = c.req.param("profileId");
  const r = dashboardLimiter.check(c.req.header("x-forwarded-for") ?? "anon");
  if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições");

  const data = await analyticsService.getDashboard(user, profileId);
  return c.json(ok(data), 200);
});
