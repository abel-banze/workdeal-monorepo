import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { ok } from "../lib/api-response.js";
import { AppError } from "../lib/errors.js";
import { analyticsRepository } from "../repositories/analytics.repository.js";
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
  await analyticsRepository.trackEvent({
    profileId,
    eventType,
    visitorId: visitorId ?? null,
    province: province ?? null,
    district: district ?? null,
    referrer: referrer ?? null,
    metadata: metadata ?? null,
  });

  return c.json(ok({ tracked: true }), 201);
});

// GET /api/v1/analytics/:profileId/dashboard — auth required, returns aggregated dashboard data
analyticsRoute.get("/:profileId/dashboard", requireAuth, async (c) => {
  const profileId = c.req.param("profileId");
  const r = dashboardLimiter.check(c.req.header("x-forwarded-for") ?? "anon");
  if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições");

  const [days, stats, origins, provinces, actions, contacts, quotesCount] = await Promise.all([
    analyticsRepository.getDailyVisits(profileId, 90),
    analyticsRepository.getTotalStats(profileId, 30),
    analyticsRepository.getOrigins(profileId, 30),
    analyticsRepository.getProvinceDistribution(profileId, 30),
    analyticsRepository.getVisitorActions(profileId, 30),
    analyticsRepository.getContactClicks(profileId, 30),
    analyticsRepository.getQuotesCount(profileId, 30),
  ]);

  // Compute sizes from profile badges/qualification if available, else empty
  const sizes = [
    { size: "Micro", value: 0, fill: "#0F1A2E" },
    { size: "Pequena", value: 0, fill: "#0B5E56" },
    { size: "Média", value: 0, fill: "#4A6B7C" },
    { size: "Grande", value: 0, fill: "#FF3B1F" },
  ];

  // Format actions for visitors table
  const actionLabels: Record<string, string> = {
    page_view: "viu perfil",
    whatsapp_click: "clicou WhatsApp",
    phone_click: "clicou telefone",
    email_click: "clicou email",
    website_click: "clicou website",
    save: "guardou",
    quote_request: "pediu contacto",
    search_impression: "apareceu na pesquisa",
  };

  const recentVisitors = await analyticsRepository.getRecentVisitors(profileId, 20);
  const visitors = recentVisitors.map((v) => ({
    id: v.id,
    name: (v.metadata as { contactName?: string })?.contactName ?? "Anónimo",
    company: actionLabels[v.eventType] ?? v.eventType,
    size: "—",
    origin: v.referrer ?? "Directo",
    province: v.province ?? "—",
    action: actionLabels[v.eventType] ?? v.eventType,
    time: formatTimeAgo(v.createdAt),
    avatar: "A",
  }));

  return c.json(
    ok({
      days,
      origins,
      sizes,
      provinces,
      visitors,
      total30: stats.total30,
      unicos30: stats.unicos30,
      growth: stats.growth,
      actions,
      contacts,
      quotesCount,
      realQuotesCount: quotesCount,
    }),
    200,
  );
});

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}
