import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission, hasSelfPermission } from "@workdeal/shared";
import type { AuthUser } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { portfolioRepository } from "../repositories/portfolio.repository.js";
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
  throw new AppError(403, "FORBIDDEN", "Sem permissão para gerir portfólio");
}

export const portfolioService = {
  async list(profileId: string) {
    return portfolioRepository.listByProfile(profileId);
  },
  async create(user: AuthUser, input: { profileId: string; title: string; description?: string | null; imageUrl?: string | null; sortOrder?: number }) {
    await assertCanEditProfile(user, input.profileId);
    if (!input.title.trim() || input.title.trim().length < 2) throw new AppError(400, "INVALID_TITLE", "Título ≥2 caracteres");
    if (input.title.length > 80) throw new AppError(400, "TITLE_TOO_LONG", "Título máx 80");
    const count = await portfolioRepository.countByProfile(input.profileId);
    if (count >= 12) throw new AppError(400, "LIMIT_REACHED", "Máximo 12 itens no portfólio");
    const row = await portfolioRepository.create({
      id: `pf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      profileId: input.profileId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      sortOrder: input.sortOrder ?? count,
    });
    // tenta selo perfil-completo
    try {
      const { ensureProfileCompleteForProfile } = await import("./badges.job");
      await ensureProfileCompleteForProfile(input.profileId);
    } catch {}
    return row;
  },
  async update(user: AuthUser, id: string, input: { title?: string; description?: string | null; imageUrl?: string | null; sortOrder?: number }) {
    const existing = await portfolioRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Item não encontrado");
    await assertCanEditProfile(user, existing.profileId);
    if (input.title !== undefined && (!input.title.trim() || input.title.trim().length < 2)) throw new AppError(400, "INVALID_TITLE", "Título ≥2");
    const row = await portfolioRepository.update(id, {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl?.trim() || null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    });
    try {
      const { ensureProfileCompleteForProfile } = await import("./badges.job");
      await ensureProfileCompleteForProfile(existing.profileId);
    } catch {}
    return row;
  },
  async remove(user: AuthUser, id: string) {
    const existing = await portfolioRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Item não encontrado");
    await assertCanEditProfile(user, existing.profileId);
    await portfolioRepository.delete(id);
    try {
      const { ensureProfileCompleteForProfile } = await import("./badges.job");
      await ensureProfileCompleteForProfile(existing.profileId);
    } catch {}
    return { id };
  },
};
