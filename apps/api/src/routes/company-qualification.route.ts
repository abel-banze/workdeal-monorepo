import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { companyQualificationSchema } from "@workdeal/shared/schemas/company";
import { classifyCompanySize } from "@workdeal/shared/lib/company-size";
import { requireAuth } from "../middlewares/auth.middleware";
import type { Env } from "../middlewares/auth.middleware";
import { ok } from "../lib/api-response";
import { AppError } from "../lib/errors";
import { companyQualificationRepository } from "../repositories/company-qualification.repository";
import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission } from "@workdeal/shared";
import { z } from "zod";

const upsertSchema = companyQualificationSchema.extend({
  organizationId: z.string().min(1),
  profileId: z.string().min(1).nullable().optional(),
});

export const companyQualificationRoute = new Hono<Env>();

companyQualificationRoute.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const { db, member } = await import("@workdeal/db");
  const { eq } = await import("drizzle-orm");
  const memberships = await db.select({ organizationId: member.organizationId }).from(member).where(eq(member.userId, user.id)).limit(5);
  for (const m of memberships) {
    const row = await companyQualificationRepository.findByOrganizationId(m.organizationId);
    if (row) return c.json(ok(row), 200);
  }
  return c.json(ok(null), 200);
});

companyQualificationRoute.post("/", requireAuth, zValidator("json", upsertSchema), async (c) => {
  const user = c.get("user");
  const input = c.req.valid("json");

  const role = await getOrgRole(user.id, input.organizationId);
  if (!role || !hasOrgPermission(role, "profile:edit")) {
    throw new AppError(403, "FORBIDDEN", "Sem permissão para qualificar esta organização");
  }

  const companySize = classifyCompanySize({ workers: input.workers, turnoverMzn: input.turnoverMzn ?? null });

  const id = `cq_${input.organizationId}`;
  const row = await companyQualificationRepository.upsert({
    id,
    organizationId: input.organizationId,
    profileId: input.profileId ?? null,
    companySize,
    workers: input.workers,
    turnoverMzn: input.turnoverMzn ?? null,
    foundedYear: input.foundedYear ?? null,
    legalForm: input.legalForm ?? null,
    nuit: input.nuit?.trim() ? input.nuit.trim() : null,
    alvara: input.alvara?.trim() ? input.alvara.trim() : null,
    capitalSocialMzn: input.capitalSocialMzn ?? null,
    licenses: input.licenses ?? null,
  });

  return c.json(ok({ ...row, classifiedAs: companySize }), 201);
});

companyQualificationRoute.get("/:organizationId", requireAuth, async (c) => {
  const organizationId = c.req.param("organizationId");
  const row = await companyQualificationRepository.findByOrganizationId(organizationId);
  if (!row) throw new AppError(404, "NOT_FOUND", "Qualificação não encontrada");
  return c.json(ok(row), 200);
});
