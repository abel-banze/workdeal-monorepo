import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { verificationsService } from "../services/verifications.service.js";
import { profilesRepository, profileColumns } from "../repositories/profiles.repository.js";
import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission } from "@workdeal/shared";
import { verificationRequestSchema } from "@workdeal/shared";
import { db, member, profile, verificationRequest } from "@workdeal/db";
import { AppError } from "../lib/errors.js";

export const verificationsRoute = new Hono<Env>();

verificationsRoute.post("/request", requireAuth, zValidator("json", verificationRequestSchema), async (c) => {
  const user = c.get("user");
  const { profileId, documents, level } = c.req.valid("json");

  // Verifica propriedade: individual (userId) ou empresa (organizationId + permissão)
  const [row] = await db.select(profileColumns).from(profile).where(eq(profile.id, profileId)).limit(1);
  if (!row) throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");

  if (row.userId) {
    if (row.userId !== user.id) throw new AppError(403, "FORBIDDEN", "Só o dono pode pedir verificação");
  } else if (row.organizationId) {
    const role = await getOrgRole(user.id, row.organizationId);
    if (!role || !hasOrgPermission(role, "profile:edit")) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão nesta organização");
    }
  } else {
    throw new AppError(400, "INVALID_PROFILE", "Perfil sem dono");
  }

  // Delegar criação com verificação de duplicado pendente no service
  const created = await verificationsService.create(profileId, documents, level);
  return c.json({ success: true, data: created }, 201);
});

verificationsRoute.get("/my", requireAuth, async (c) => {
  const user = c.get("user");
  // Perfis do utilizador: individual + os das organizações a que pertence
  const memberships = await db.select({ organizationId: member.organizationId }).from(member).where(eq(member.userId, user.id));
  const orgIds = memberships.map((m) => m.organizationId).filter(Boolean);
  const orgProfiles = orgIds.length
    ? await db.select({ id: profile.id }).from(profile).where(inArray(profile.organizationId, orgIds))
    : [];
  const individual = await profilesRepository.findByUserId(user.id);
  const profileIds = [...(individual ? [individual.id] : []), ...orgProfiles.map((p) => p.id)];
  if (profileIds.length === 0) return c.json({ success: true, data: [] });
  const rows = await db
    .select()
    .from(verificationRequest)
    .where(inArray(verificationRequest.profileId, profileIds))
    .orderBy(desc(verificationRequest.createdAt))
    .limit(10);
  return c.json({ success: true, data: rows });
});
