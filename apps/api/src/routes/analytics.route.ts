import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import { ok } from "../lib/api-response.js";
import { AppError } from "../lib/errors.js";
import { analyticsService } from "../services/analytics.service.js";
import { onboardingAnalyticsService } from "../services/onboarding-analytics.service.js";
import { onboardingFunnelQuerySchema, trackOnboardingEventSchema, onboardingEventsQuerySchema } from "@workdeal/shared";
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

// ── Funil de onboarding ──────────────────────────────────────────
// POST /api/v1/analytics/onboarding/track — qualquer utilizador autenticado
// regista a sua própria acção (fire-and-forget, nunca bloqueia o fluxo).
analyticsRoute.post("/onboarding/track", requireAuth, async (c) => {
  const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
  const r = trackLimiter.check(key);
  c.header("X-RateLimit-Remaining", String(r.remaining));
  if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições");

  const body = await c.req.json().catch(() => ({}));
  const parsed = trackOnboardingEventSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Dados inválidos", parsed.error.flatten());
  }
  await onboardingAnalyticsService.track(c.get("user"), parsed.data);
  return c.json(ok({ tracked: true }), 201);
});

// GET /api/v1/analytics/onboarding/funnel — equipa Workdeal (admin/moderador)
analyticsRoute.get("/onboarding/funnel", requireAuth, requireSystemRole("admin", "moderator"), async (c) => {
  const parsed = onboardingFunnelQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Parâmetros inválidos", parsed.error.flatten());
  }
  const data = await onboardingAnalyticsService.funnel(parsed.data.days);
  return c.json(ok({ days: parsed.data.days, ...data }), 200);
});

// GET /api/v1/analytics/onboarding/events — drill-down por evento com
// identidade (utilizador, empresas) — equipa Workdeal (admin/moderador)
analyticsRoute.get("/onboarding/events", requireAuth, requireSystemRole("admin", "moderator"), async (c) => {
  const parsed = onboardingEventsQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Parâmetros inválidos", parsed.error.flatten());
  }
  const q = parsed.data;
  const data = await onboardingAnalyticsService.listEvents({ action: q.action, step: q.step, days: q.days, page: q.page, limit: q.limit });
  return c.json(ok(data.items, { total: data.total, page: q.page, limit: q.limit }), 200);
});
