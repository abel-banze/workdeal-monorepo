import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import {
  institutionsListQuerySchema,
  institutionMembershipRequestSchema,
  institutionCreateSchema,
  institutionUpdateSchema,
  institutionManagerInviteSchema,
  institutionManagerUpdateSchema,
  institutionsMineQuerySchema,
} from "@workdeal/shared";
import { requireAuth, type Env } from "../middlewares/auth.middleware.js";
import { requireInstitutionManager } from "../middlewares/institution-manager.middleware.js";
import { AppError } from "../lib/errors.js";
import { institutionsController } from "../controllers/institutions.controller.js";

const listLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });
const publicLimiter = createRateLimiter({ windowMs: 60_000, max: 100 });
const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

function rateLimit(limiter: ReturnType<typeof createRateLimiter>) {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
    const r = limiter.check(key);
    c.header("X-RateLimit-Remaining", String(r.remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(r.resetAt / 1000)));
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições. Tente novamente em breve.");
    await next();
  };
}

export const institutionsRoute = new Hono<Env>();

// Directório público
institutionsRoute.get("/", rateLimit(listLimiter), zValidator("query", institutionsListQuerySchema), async (c) => {
  const { body, status } = await institutionsController.list(c.req.valid("query"));
  c.header("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return c.json(body, status);
});

// Página pública de uma instituição
institutionsRoute.get("/:slug/public", rateLimit(publicLimiter), async (c) => {
  const { body, status } = await institutionsController.getBySlug(c.req.param("slug"));
  c.header("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=600");
  return c.json(body, status);
});

// Pedido de associação — empresa (autenticada) → instituição
institutionsRoute.post("/:id/memberships", rateLimit(writeLimiter), requireAuth, zValidator("json", institutionMembershipRequestSchema), async (c) => {
  const { body, status } = await institutionsController.requestMembership(c.get("user"), c.req.param("id"), c.req.valid("json"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// ── Autosserviço (instituições donas) ─────────────────────────────────────

// As minhas instituições (gestor da equipa)
institutionsRoute.get("/mine", rateLimit(listLimiter), requireAuth, zValidator("query", institutionsMineQuerySchema), async (c) => {
  const { body, status } = await institutionsController.listMine(c.get("user"), c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// Criar instituição (o criador torna-se owner)
institutionsRoute.post("/mine", rateLimit(writeLimiter), requireAuth, zValidator("json", institutionCreateSchema), async (c) => {
  const { body, status } = await institutionsController.createMine(c.get("user"), c.req.valid("json"));
  return c.json(body, status);
});

const manageRoute = new Hono<Env>();
manageRoute.use("/", requireAuth, requireInstitutionManager);

// Detalhe + equipa de gestão
manageRoute.get("/:institutionId", async (c) => {
  const { body, status } = await institutionsController.getMine(c.get("user"), c.req.param("institutionId"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

manageRoute.patch("/:institutionId", rateLimit(writeLimiter), zValidator("json", institutionUpdateSchema), async (c) => {
  const { body, status } = await institutionsController.updateMine(c.get("user"), c.req.param("institutionId"), c.req.valid("json"));
  return c.json(body, status);
});

// Publicar (draft → active) sob responsabilidade da equipa
manageRoute.post("/:institutionId/publish", rateLimit(writeLimiter), async (c) => {
  const { body, status } = await institutionsController.publishMine(c.get("user"), c.req.param("institutionId"));
  return c.json(body, status);
});

// Equipa de gestão
manageRoute.get("/:institutionId/managers", async (c) => {
  const { body, status } = await institutionsController.listManagers(c.get("user"), c.req.param("institutionId"));
  return c.json(body, status);
});

manageRoute.post("/:institutionId/managers", rateLimit(writeLimiter), zValidator("json", institutionManagerInviteSchema), async (c) => {
  const { body, status } = await institutionsController.addManager(c.get("user"), c.req.param("institutionId"), c.req.valid("json"));
  return c.json(body, status);
});

manageRoute.patch("/:institutionId/managers/:managerId", rateLimit(writeLimiter), zValidator("json", institutionManagerUpdateSchema), async (c) => {
  const { body, status } = await institutionsController.updateManagerRole(c.get("user"), c.req.param("institutionId"), c.req.param("managerId"), c.req.valid("json"));
  return c.json(body, status);
});

manageRoute.delete("/:institutionId/managers/:managerId", rateLimit(writeLimiter), async (c) => {
  const { body, status } = await institutionsController.removeManager(c.get("user"), c.req.param("institutionId"), c.req.param("managerId"));
  return c.json(body, status);
});

institutionsRoute.route("/manage", manageRoute);