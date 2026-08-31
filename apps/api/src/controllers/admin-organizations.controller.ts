import { ok } from "../lib/api-response.js";
import { adminOrganizationsService } from "../services/admin-organizations.service.js";
import type { AdminOrgListQuery, AdminUpdateOrgStatusInput } from "@workdeal/shared";

export const adminOrganizationsController = {
  async list(query: AdminOrgListQuery) {
    const result = await adminOrganizationsService.list(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },
  async updateStatus(actorRole: string, id: string, input: AdminUpdateOrgStatusInput) {
    const row = await adminOrganizationsService.updateStatus(actorRole, id, input.verificationStatus);
    return { body: ok(row), status: 200 as const };
  },
};
