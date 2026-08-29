import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { searchController } from "../controllers/search.controller.js";
import { AppError } from "../lib/errors.js";
import type { Env } from "../middlewares/auth.middleware.js";

const limiter = createRateLimiter({ windowMs: 60_000, max: 60 });
function rateLimit(c: any, next: any) {
  const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
  const r = limiter.check(key);
  c.header("X-RateLimit-Remaining", String(r.remaining));
  if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas pesquisas. Tenta novamente.");
  return next();
}

const querySchema = z.object({
  q: z.string().trim().min(1).max(200),
  categoryId: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  near: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "near deve ser 'lat,lng'").optional(),
  radiusKm: z.coerce.number().min(0.5).max(500).default(25).optional(),
  sort: z.enum(["recent", "name", "distance"]).default("recent").optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export const searchRoute = new Hono<Env>();

// GET /api/v1/search?q=canalizador em matola&page=&limit=
// Motor único (human-way): known_locations (trigram) + websearch_to_tsquery + fallback trigram.
// Mesmo motor que /api/v1/profiles?q= — partilha searchService.
searchRoute.get("/", rateLimit as any, zValidator("query", querySchema), async (c) => {
  const query = c.req.valid("query");
  const { body, status } = await searchController.search(query);
  // Cache curto (resultados mudam com novas empresas)
  c.header("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
  return c.json(body, status);
});

// GET /api/v1/search/locations?q=mat — sugestões do dicionário dinâmico
searchRoute.get("/locations", rateLimit as any, async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  if (!q || q.length < 2) return c.json({ success: true, data: [] });
  const { db, sql } = await import("@workdeal/db");
  try {
    const rows = await db.execute(sql`SELECT kind, value, province, district FROM known_locations WHERE value_unaccent % unaccent(lower(${q})) OR value_unaccent ILIKE '%' || unaccent(lower(${q})) || '%' ORDER BY similarity(value_unaccent, unaccent(lower(${q}))) DESC LIMIT 8`) as unknown as any[];
    const data = Array.isArray(rows) ? rows : (rows as any).rows ?? [];
    return c.json({ success: true, data });
  } catch {
    return c.json({ success: true, data: [] });
  }
});
