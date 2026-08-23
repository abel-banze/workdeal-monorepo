import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission, hasSelfPermission } from "@workdeal/shared";
import type { AuthUser } from "@workdeal/shared";
import { AppError } from "../lib/errors";
import { servicesRepository } from "../repositories/services.repository";
import { db, profile } from "@workdeal/db";
import { eq } from "drizzle-orm";

async function assertCanEditProfile(user: AuthUser, profileId: string) {
  const [row] = await db.select({ userId: profile.userId, organizationId: profile.organizationId }).from(profile).where(eq(profile.id, profileId)).limit(1);
  if (!row) throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
  if (row.userId && row.userId === user.id && hasSelfPermission("profile:edit")) return row;
  if (row.organizationId) {
    const role = await getOrgRole(user.id, row.organizationId);
    if (role && hasOrgPermission(role, "profile:edit")) return row;
  }
  if (user.systemRole === "admin" || user.systemRole === "moderator") return row;
  throw new AppError(403, "FORBIDDEN", "Sem permissão para gerir serviços");
}

export const servicesService = {
  async list(profileId: string) {
    return servicesRepository.listByProfile(profileId);
  },
  async create(user: AuthUser, input: { profileId: string; title: string; description?: string | null; priceMzn?: number | null; imageUrl?: string | null; categoryId?: string | null }) {
    await assertCanEditProfile(user, input.profileId);
    if (!input.title.trim() || input.title.trim().length < 2) throw new AppError(400, "INVALID_TITLE", "Título ≥2 caracteres");
    if (input.title.length > 80) throw new AppError(400, "TITLE_TOO_LONG", "Título máx 80");
    const count = await servicesRepository.countByProfile(input.profileId);
    if (count >= 20) throw new AppError(400, "LIMIT_REACHED", "Máximo 20 serviços");
    const row = await servicesRepository.create({
      id: `svc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      profileId: input.profileId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priceMzn: input.priceMzn ?? null,
      imageUrl: input.imageUrl?.trim() || null,
      categoryId: input.categoryId ?? null,
      sortOrder: count,
    });
    return row;
  },
  async update(user: AuthUser, id: string, input: { title?: string; description?: string | null; priceMzn?: number | null; imageUrl?: string | null; categoryId?: string | null }) {
    const existing = await servicesRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Serviço não encontrado");
    await assertCanEditProfile(user, existing.profileId);
    if (input.title !== undefined && (!input.title.trim() || input.title.trim().length < 2)) throw new AppError(400, "INVALID_TITLE", "Título ≥2");
    const row = await servicesRepository.update(id, {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.priceMzn !== undefined ? { priceMzn: input.priceMzn } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl?.trim() || null } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    });
    return row;
  },
  async remove(user: AuthUser, id: string) {
    const existing = await servicesRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Serviço não encontrado");
    await assertCanEditProfile(user, existing.profileId);
    await servicesRepository.delete(id);
    return { id };
  },
};
