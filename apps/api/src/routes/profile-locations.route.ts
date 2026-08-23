import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { ok } from "../lib/api-response.js";
import { AppError } from "../lib/errors.js";
import { profileLocationRepository } from "../repositories/profile-location.repository.js";
import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission } from "@workdeal/shared";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { db, profile } from "@workdeal/db";
import { eq } from "drizzle-orm";

const createLocationSchema = z.object({
  profileId: z.string().min(1),
  organizationId: z.string().min(1).nullable().optional(),
  province: z.string().min(1),
  district: z.string().max(64).nullable().optional(),
  bairro: z.string().max(64).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  label: z.string().max(64).nullable().optional(),
  isPrimary: z.boolean().optional(),
  visibility: z.enum(["exact", "zone"]).optional(),
});

const updateLocationSchema = z.object({
  province: z.string().min(1).max(64).optional(),
  district: z.string().max(64).nullable().optional(),
  bairro: z.string().max(64).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  label: z.string().max(64).nullable().optional(),
  isPrimary: z.boolean().optional(),
  visibility: z.enum(["exact", "zone"]).optional(),
});

const locLimiter = createRateLimiter({ windowMs: 60_000, max: 100 });

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

export const profileLocationsRoute = new Hono<Env>();

profileLocationsRoute.post("/", requireAuth, zValidator("json", createLocationSchema), async (c) => {
  const user = c.get("user");
  const input = c.req.valid("json");
  const [row] = await db.select().from(profile).where(eq(profile.id, input.profileId)).limit(1);
  if (!row) throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
  // P0-2: valida vínculo profile ↔ organization para evitar cross-org write
  if (row.organizationId) {
    if (!input.organizationId || input.organizationId !== row.organizationId) {
      throw new AppError(403, "FORBIDDEN", "Organização não corresponde ao perfil");
    }
    const role = await getOrgRole(user.id, input.organizationId);
    if (!role || !hasOrgPermission(role, "profile:edit")) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para adicionar localização");
    }
  } else if (row.userId) {
    if (row.userId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem permissão para adicionar localização");
    // perfil pessoal não deve receber organizationId
    if (input.organizationId) throw new AppError(403, "FORBIDDEN", "Perfil pessoal não pertence a organização");
  } else {
    throw new AppError(403, "FORBIDDEN", "Sem permissão para adicionar localização");
  }

  const id = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const created = await profileLocationRepository.create({
    id,
    profileId: input.profileId,
    organizationId: input.organizationId ?? null,
    province: input.province,
    district: input.district ?? null,
    bairro: input.bairro ?? null,
    address: input.address ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    label: input.label ?? null,
    isPrimary: input.isPrimary ?? false,
    visibility: input.visibility ?? "zone",
  });
  return c.json(ok(created), 201);
});

profileLocationsRoute.get("/:profileId", rateLimit(locLimiter), async (c) => {
  const profileId = c.req.param("profileId");
  const rows = await profileLocationRepository.listByProfile(profileId);
  c.header("Cache-Control", "no-store");
  return c.json(ok(rows), 200);
});

profileLocationsRoute.patch("/:id", requireAuth, rateLimit(locLimiter), zValidator("json", updateLocationSchema), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const input = c.req.valid("json");
  const existing = await profileLocationRepository.findById(id);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Localização não encontrada");
  const [profileRow] = await db.select().from(profile).where(eq(profile.id, existing.profileId)).limit(1);
  if (!profileRow) throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
  // RBAC — mesmo critério do POST
  if (profileRow.organizationId) {
    if (!existing.organizationId || existing.organizationId !== profileRow.organizationId) {
      throw new AppError(403, "FORBIDDEN", "Organização não corresponde ao perfil");
    }
    const role = await getOrgRole(user.id, existing.organizationId);
    if (!role || !hasOrgPermission(role, "profile:edit")) throw new AppError(403, "FORBIDDEN", "Sem permissão para editar localização");
  } else if (profileRow.userId) {
    if (profileRow.userId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem permissão para editar localização");
  } else {
    throw new AppError(403, "FORBIDDEN", "Sem permissão");
  }
  const updated = await profileLocationRepository.update(id, {
    ...(input.province !== undefined ? { province: input.province } : {}),
    ...(input.district !== undefined ? { district: input.district } : {}),
    ...(input.bairro !== undefined ? { bairro: input.bairro } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
    ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
  });
  return c.json(ok(updated), 200);
});

profileLocationsRoute.delete("/:id", requireAuth, rateLimit(locLimiter), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const existing = await profileLocationRepository.findById(id);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Localização não encontrada");
  const [profileRow] = await db.select().from(profile).where(eq(profile.id, existing.profileId)).limit(1);
  if (!profileRow) throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
  if (profileRow.organizationId) {
    if (!existing.organizationId || existing.organizationId !== profileRow.organizationId) {
      throw new AppError(403, "FORBIDDEN", "Organização não corresponde ao perfil");
    }
    const role = await getOrgRole(user.id, existing.organizationId);
    if (!role || !hasOrgPermission(role, "profile:edit")) throw new AppError(403, "FORBIDDEN", "Sem permissão para remover localização");
  } else if (profileRow.userId) {
    if (profileRow.userId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem permissão para remover localização");
  } else {
    throw new AppError(403, "FORBIDDEN", "Sem permissão");
  }
  await profileLocationRepository.delete(id);
  return c.json(ok({ id }), 200);
});
