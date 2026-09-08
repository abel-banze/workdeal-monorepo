import { randomUUID } from "node:crypto";
import type { AdminBadgesListQuery, BadgeAssignInput, BadgeCreateInput, BadgeUpdateInput, BadgesListQuery } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { badgesRepository } from "../repositories/badges.repository.js";

function isPgUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

class BadgesService {
  async listPublic(query: BadgesListQuery) {
    const result = await badgesRepository.listPublic(query);
    return { ...result, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  async listAdmin(query: AdminBadgesListQuery) {
    const result = await badgesRepository.listAdmin(query);
    return { ...result, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  async getById(id: string) {
    const row = await badgesRepository.findById(id);
    if (!row) throw new AppError(404, "NOT_FOUND", "Selo não encontrado");
    return row;
  }

  async create(input: BadgeCreateInput) {
    if (await badgesRepository.findBySlug(input.slug)) {
      throw new AppError(409, "SLUG_CONFLICT", "Já existe um selo com este slug");
    }
    try {
      return await badgesRepository.create({ ...input, id: randomUUID() });
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new AppError(409, "SLUG_CONFLICT", "Já existe um selo com este slug");
      }
      throw err;
    }
  }

  async update(id: string, input: BadgeUpdateInput) {
    const existing = await badgesRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Selo não encontrado");

    const updated = await badgesRepository.update(id, input);
    if (!updated) throw new AppError(404, "NOT_FOUND", "Selo não encontrado");
    return updated;
  }

  async remove(id: string) {
    const existing = await badgesRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Selo não encontrado");

    const inUse = await badgesRepository.countAssignments(id);
    if (inUse > 0) {
      throw new AppError(409, "BADGE_IN_USE", "Este selo já está atribuído a perfis. Desactive-o em vez de o eliminar para preservar o histórico.");
    }

    return badgesRepository.remove(id);
  }

  async toggleActive(id: string) {
    const existing = await badgesRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Selo não encontrado");
    const updated = await badgesRepository.update(id, { isActive: !existing.isActive });
    if (!updated) throw new AppError(404, "NOT_FOUND", "Selo não encontrado");
    return updated;
  }

  // ── Atribuição em instituições ───────────────────────────────────────────

  async listInstitutionBadges(institutionId: string) {
    const exists = await badgesRepository.findInstitutionProfileId(institutionId);
    if (!exists) throw new AppError(404, "INSTITUTION_NOT_FOUND", "Instituição não encontrada");
    return badgesRepository.listInstitutionBadges(institutionId);
  }

  async assignToInstitution(institutionId: string, input: BadgeAssignInput, actorId: string) {
    const profileId = await badgesRepository.findInstitutionProfileId(institutionId);
    if (!profileId) throw new AppError(404, "INSTITUTION_NOT_FOUND", "Instituição não encontrada");

    const badgeRow = await badgesRepository.findById(input.badgeId);
    if (!badgeRow) throw new AppError(404, "BADGE_NOT_FOUND", "Selo não encontrado");
    if (!badgeRow.isActive) {
      throw new AppError(409, "BADGE_INACTIVE", "Não é possível atribuir um selo desactivado");
    }

    return badgesRepository.assignBadge(profileId, badgeRow.id, actorId);
  }

  async revokeFromInstitution(institutionId: string, badgeId: string) {
    const profileId = await badgesRepository.findInstitutionProfileId(institutionId);
    if (!profileId) throw new AppError(404, "INSTITUTION_NOT_FOUND", "Instituição não encontrada");

    const row = await badgesRepository.revokeBadge(profileId, badgeId);
    if (!row) throw new AppError(404, "BADGE_NOT_ASSIGNED", "Esta instituição não tem este selo atribuído");
    return row;
  }
}

export const badgesService = new BadgesService();