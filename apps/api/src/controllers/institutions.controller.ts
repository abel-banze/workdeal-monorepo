import { ok } from "../lib/api-response.js";
import type { AuthUser, InstitutionsListQuery, InstitutionMembershipRequestInput, InstitutionCreateInput, InstitutionUpdateInput, InstitutionManagerInviteInput, InstitutionManagerUpdateInput, InstitutionsMineQuery } from "@workdeal/shared";
import { institutionsService } from "../services/institutions.service.js";

export const institutionsController = {
  async list(query: InstitutionsListQuery) {
    const result = await institutionsService.listPublic(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },

  async getBySlug(slug: string) {
    const view = await institutionsService.getPublicBySlug(slug);
    return { body: ok(view), status: 200 as const };
  },

  async requestMembership(user: AuthUser, institutionId: string, input: InstitutionMembershipRequestInput) {
    const row = await institutionsService.requestMembership(user.id, institutionId, input);
    return { body: ok(row), status: 201 as const };
  },

  // ── Autosserviço ─────────────────────────────────────────────────────────

  async createMine(user: AuthUser, input: InstitutionCreateInput) {
    const row = await institutionsService.createMine(user.id, input);
    return { body: ok(row), status: 201 as const };
  },

  async listMine(user: AuthUser, query: InstitutionsMineQuery) {
    const result = await institutionsService.listMine(user.id, query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },

  async getMine(user: AuthUser, institutionId: string) {
    const row = await institutionsService.getMine(user.id, institutionId);
    return { body: ok(row), status: 200 as const };
  },

  async updateMine(user: AuthUser, institutionId: string, input: InstitutionUpdateInput) {
    const row = await institutionsService.updateMine(user.id, institutionId, input);
    return { body: ok(row), status: 200 as const };
  },

  async publishMine(user: AuthUser, institutionId: string) {
    const row = await institutionsService.publishMine(user.id, institutionId);
    return { body: ok(row), status: 200 as const };
  },

  async listManagers(user: AuthUser, institutionId: string) {
    const rows = await institutionsService.listManagers(user.id, institutionId);
    return { body: ok(rows), status: 200 as const };
  },

  async addManager(user: AuthUser, institutionId: string, input: InstitutionManagerInviteInput) {
    const rows = await institutionsService.addManager(user.id, institutionId, input);
    return { body: ok(rows), status: 200 as const };
  },

  async updateManagerRole(user: AuthUser, institutionId: string, managerId: string, input: InstitutionManagerUpdateInput) {
    const rows = await institutionsService.updateManagerRole(user.id, institutionId, managerId, input);
    return { body: ok(rows), status: 200 as const };
  },

  async removeManager(user: AuthUser, institutionId: string, managerId: string) {
    const rows = await institutionsService.removeManager(user.id, institutionId, managerId);
    return { body: ok(rows), status: 200 as const };
  },
};