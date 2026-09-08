import { ok } from "../lib/api-response.js";
import type { AdminBadgesListQuery, BadgeAssignInput, BadgeCreateInput, BadgeUpdateInput } from "@workdeal/shared";
import { badgesService } from "../services/badges.service.js";

export const adminBadgesController = {
  async list(query: AdminBadgesListQuery) {
    const result = await badgesService.listAdmin(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },

  async getById(id: string) {
    const row = await badgesService.getById(id);
    return { body: ok(row), status: 200 as const };
  },

  async create(input: BadgeCreateInput) {
    const row = await badgesService.create(input);
    return { body: ok(row), status: 201 as const };
  },

  async update(id: string, input: BadgeUpdateInput) {
    const row = await badgesService.update(id, input);
    return { body: ok(row), status: 200 as const };
  },

  async remove(id: string) {
    const result = await badgesService.remove(id);
    return { body: ok({ removed: result }), status: 200 as const };
  },

  async toggleActive(id: string) {
    const row = await badgesService.toggleActive(id);
    return { body: ok(row), status: 200 as const };
  },

  async listInstitutionBadges(institutionId: string) {
    const rows = await badgesService.listInstitutionBadges(institutionId);
    return { body: ok(rows), status: 200 as const };
  },

  async assignBadge(institutionId: string, input: BadgeAssignInput, actorId: string) {
    const row = await badgesService.assignToInstitution(institutionId, input, actorId);
    return { body: ok(row), status: 200 as const };
  },

  async revokeBadge(institutionId: string, badgeId: string) {
    const row = await badgesService.revokeFromInstitution(institutionId, badgeId);
    return { body: ok(row), status: 200 as const };
  },
};