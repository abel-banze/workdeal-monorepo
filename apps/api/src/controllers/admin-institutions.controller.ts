import { ok } from "../lib/api-response.js";
import type { AdminInstitutionsListQuery, AdminInstitutionMembershipsQuery, InstitutionCreateInput, InstitutionUpdateInput, SystemRole } from "@workdeal/shared";
import { institutionsService } from "../services/institutions.service.js";

export const adminInstitutionsController = {
  async list(query: AdminInstitutionsListQuery) {
    const result = await institutionsService.listAdmin(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },

  async get(id: string) {
    const row = await institutionsService.getAdmin(id);
    return { body: ok(row), status: 200 as const };
  },

  async create(actorRole: SystemRole, actorUserId: string, input: InstitutionCreateInput) {
    const row = await institutionsService.createAdmin(actorRole, actorUserId, input);
    return { body: ok(row), status: 201 as const };
  },

  async update(actorRole: SystemRole, id: string, input: InstitutionUpdateInput) {
    const row = await institutionsService.updateAdmin(actorRole, id, input);
    return { body: ok(row), status: 200 as const };
  },

  async verify(actorRole: SystemRole, id: string) {
    const row = await institutionsService.verify(actorRole, id);
    return { body: ok(row), status: 200 as const };
  },

  async unverify(actorRole: SystemRole, id: string) {
    const row = await institutionsService.unverify(actorRole, id);
    return { body: ok(row), status: 200 as const };
  },

  async listMemberships(institutionId: string, query: AdminInstitutionMembershipsQuery) {
    const result = await institutionsService.listMemberships(institutionId, query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },

  async approveMembership(actorRole: SystemRole, membershipId: string) {
    const row = await institutionsService.approveMembership(actorRole, membershipId);
    return { body: ok(row), status: 200 as const };
  },

  async rejectMembership(actorRole: SystemRole, membershipId: string) {
    const row = await institutionsService.rejectMembership(actorRole, membershipId);
    return { body: ok(row), status: 200 as const };
  },

  async verifyMembership(actorRole: SystemRole, membershipId: string) {
    const row = await institutionsService.verifyMembership(actorRole, membershipId);
    return { body: ok(row), status: 200 as const };
  },

  async revokeMembership(actorRole: SystemRole, membershipId: string) {
    const row = await institutionsService.revokeMembership(actorRole, membershipId);
    return { body: ok(row), status: 200 as const };
  },
};