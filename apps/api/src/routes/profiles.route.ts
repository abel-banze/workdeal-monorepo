import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createMiddleware } from "hono/factory";
import { createProfileSchema, listProfilesQuerySchema, updateProfileSchema } from "@workdeal/shared";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { profilesController } from "../controllers/profiles.controller.js";
import { profilesRepository } from "../repositories/profiles.repository.js";
import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission, hasSelfPermission, hasSystemPermission } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";

const listLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });
const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
const publicLimiter = createRateLimiter({ windowMs: 60_000, max: 100 });

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

export const profilesRoute = new Hono<Env>();

// P0-2: RBAC em profundidade para PATCH/DELETE — defesa antes do service
const requireProfilePermission = (permission: "profile:edit" | "profile:delete") =>
  createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    if (hasSystemPermission(user.systemRole, permission)) {
      await next();
      return;
    }
    const slug = c.req.param("slug");
    if (!slug) throw new AppError(400, "BAD_REQUEST", "Slug em falta");
    const profile = await profilesRepository.findBySlug(slug, { includeDeleted: true });
    if (!profile || profile.deletedAt) throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
    if (profile.userId && profile.userId === user.id && hasSelfPermission(permission)) {
      await next();
      return;
    }
    if (profile.organizationId) {
      const role = await getOrgRole(user.id, profile.organizationId);
      if (role && hasOrgPermission(role, permission)) {
        await next();
        return;
      }
    }
    throw new AppError(403, "FORBIDDEN", "Sem permissão para esta acção");
  });

profilesRoute.get("/", rateLimit(listLimiter), zValidator("query", listProfilesQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await profilesController.list(q);
  // Cache: nearby (sensível a localização) não cachea; listagem geral cache 60s
  if (q.near) c.header("Cache-Control", "no-store");
  else c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return c.json(body, status);
});

profilesRoute.post("/", rateLimit(writeLimiter), requireAuth, zValidator("json", createProfileSchema), async (c) => {
  const { body, status } = await profilesController.create(c.get("user"), c.req.valid("json"));
  return c.json(body, status);
});

profilesRoute.get("/me", requireAuth, async (c) => {
  const { body, status } = await profilesController.getMe(c.get("user"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

profilesRoute.get("/:slug", rateLimit(publicLimiter), async (c) => {
  const { body, status } = await profilesController.getBySlug(c, c.req.param("slug"));
  c.header("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=600");
  return c.json(body, status);
});

profilesRoute.get("/:slug/public", rateLimit(publicLimiter), async (c) => {
  const { body, status } = await profilesController.getPublicBySlug(c, c.req.param("slug"));
  c.header("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=600");
  return c.json(body, status);
});

profilesRoute.patch(
  "/:slug",
  requireAuth,
  requireProfilePermission("profile:edit"),
  zValidator("json", updateProfileSchema),
  async (c) => {
    // Contactos verificados via OTP (tokens HMAC do cookie httpOnly da web).
    // Sem header → não altera o estado de verificação; com header → persiste
    // as verificações provadas. Mesma bind que o onboarding.
    const verifiedHeader = c.req.header("x-verified-contacts") ?? null;
    const { body, status } = await profilesController.update(c.get("user"), c.req.param("slug"), c.req.valid("json"), verifiedHeader);
    return c.json(body, status);
  },
);

profilesRoute.delete(
  "/:slug",
  requireAuth,
  requireProfilePermission("profile:delete"),
  async (c) => {
    const { body, status } = await profilesController.remove(c.get("user"), c.req.param("slug"));
    return c.json(body, status);
  },
);
