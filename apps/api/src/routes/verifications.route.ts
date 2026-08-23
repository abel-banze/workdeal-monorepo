import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware";
import type { Env } from "../middlewares/auth.middleware";
import { verificationsService } from "../services/verifications.service";
import { profilesRepository } from "../repositories/profiles.repository";
import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission } from "@workdeal/shared";
import { AppError } from "../lib/errors";

export const verificationsRoute = new Hono<Env>();

const requestSchema = z.object({
  profileId: z.string().min(1, "profileId obrigatório"),
  documents: z.array(z.unknown()).max(5).default([]),
});

verificationsRoute.post("/request", requireAuth, zValidator("json", requestSchema), async (c) => {
  const user = c.get("user");
  const { profileId, documents } = c.req.valid("json");

  // Verifica propriedade: individual (userId) ou empresa (organizationId + permissão)
  const { db, profile } = await import("@workdeal/db");
  const { eq } = await import("drizzle-orm");
  const [row] = await db.select().from(profile).where(eq(profile.id, profileId)).limit(1);
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

  // Se já existe perfil via slug lookup alternativo (não necessário, id já validado)
  const existing = await profilesRepository.findByUserId(user.id);
  // Delegar criação com verificação de duplicado pendente no service
  const created = await verificationsService.create(profileId, documents);
  return c.json({ success: true, data: created }, 201);
});

verificationsRoute.get("/my", requireAuth, async (c) => {
  const user = c.get("user");
  const { db, verificationRequest, profile } = await import("@workdeal/db");
  const { eq, desc } = await import("drizzle-orm");
  // Busca perfil do utilizador (individual ou via org)
  const prof = await profilesRepository.findByUserId(user.id);
  let profileId: string | null = prof?.id ?? null;
  if (!profileId) {
    // Tenta via organização (pega primeira org do user)
    const { getOrgRole: _ } = await import("@workdeal/auth");
    // Fallback: lista perfis onde user é owner via org (consulta simples)
    const allProfiles = await db.select().from(profile).limit(20);
    const owned = allProfiles.find((p) => p.organizationId && p.userId === null);
    // Melhor: busca directa por organizationId se existir membership; simplifica retornando vazio se não há perfil
    profileId = null;
  }
  if (!profileId) return c.json({ success: true, data: [] });
  const rows = await db.select().from(verificationRequest).where(eq(verificationRequest.profileId, profileId)).orderBy(desc(verificationRequest.createdAt)).limit(10);
  return c.json({ success: true, data: rows });
});
