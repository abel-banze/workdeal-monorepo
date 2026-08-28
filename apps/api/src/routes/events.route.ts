import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import {
  createEventRegistrationSchema,
  createEventSchema,
  eventListQuerySchema,
  eventRegistrationListQuerySchema,
  updateEventRegistrationSchema,
  updateEventSchema,
} from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { optionalAuth, getUserOrNull } from "../middlewares/optional-auth.middleware.js";
import { eventsController } from "../controllers/events.controller.js";
import { AppError } from "../lib/errors.js";

const createLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
const registerLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

function rateLimit(limiter: ReturnType<typeof createRateLimiter>) {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
    const r = limiter.check(key);
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições. Tente dentro de minutos.");
    await next();
  };
}

export const eventsRoute = new Hono<Env>();

// ── Listagens (estáticas antes de /:id) ───────────────────────────
eventsRoute.get("/", zValidator("query", eventListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await eventsController.list({
    status: q.status,
    upcoming: q.upcoming,
    categoryId: q.categoryId,
    province: q.province,
    organizerSlug: q.organizerSlug,
    page: q.page,
    limit: q.limit,
  });
  c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return c.json(body, status);
});

eventsRoute.get("/my", requireAuth, zValidator("query", eventListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await eventsController.my(c.get("user"), { status: q.status, page: q.page, limit: q.limit });
  return c.json(body, status);
});

eventsRoute.get("/my-registrations", requireAuth, zValidator("query", eventRegistrationListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await eventsController.myRegistrations(c.get("user"), { status: q.status, page: q.page, limit: q.limit });
  return c.json(body, status);
});

eventsRoute.get("/by-slug/:slug", optionalAuth, async (c) => {
  const { body, status } = await eventsController.get(c.req.param("slug"), true, getUserOrNull(c));
  c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return c.json(body, status);
});

eventsRoute.patch("/registrations/:registrationId", requireAuth, zValidator("json", updateEventRegistrationSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await eventsController.patchRegistration(c.get("user"), c.req.param("registrationId"), body);
  return c.json(resBody, status);
});

// ── Evento individual ─────────────────────────────────────────────
eventsRoute.get("/:id", optionalAuth, async (c) => {
  const { body, status } = await eventsController.get(c.req.param("id"), false, getUserOrNull(c));
  return c.json(body, status);
});

eventsRoute.patch("/:id", requireAuth, zValidator("json", updateEventSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await eventsController.patch(c.get("user"), c.req.param("id"), body);
  return c.json(resBody, status);
});

// ── Inscrições ────────────────────────────────────────────────────
eventsRoute.post("/:id/registrations", requireAuth, rateLimit(registerLimiter), zValidator("json", createEventRegistrationSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await eventsController.register(c.get("user"), body);
  return c.json(resBody, status);
});

eventsRoute.get("/:id/registrations", requireAuth, zValidator("query", eventRegistrationListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await eventsController.listRegistrations(c.get("user"), c.req.param("id"), { status: q.status, page: q.page, limit: q.limit });
  return c.json(body, status);
});

eventsRoute.delete("/:id/registrations", requireAuth, async (c) => {
  const { body, status } = await eventsController.cancelMyRegistration(c.req.param("id"), c.get("user"));
  return c.json(body, status);
});

// ── Criação de evento ─────────────────────────────────────────────
eventsRoute.post("/", requireAuth, rateLimit(createLimiter), zValidator("json", createEventSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await eventsController.create(c.get("user"), body);
  return c.json(resBody, status);
});