import { ok } from "../lib/api-response.js";
import { adminUsersService } from "../services/admin-users.service.js";
import type { AdminUserListQuery, AdminUpdateUserRoleInput } from "@workdeal/shared";

export const adminUsersController = {
  async list(query: AdminUserListQuery) {
    const result = await adminUsersService.list(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },
  async updateRole(actorRole: string, userId: string, input: AdminUpdateUserRoleInput) {
    const row = await adminUsersService.updateRole(actorRole, userId, input.systemRole);
    return { body: ok(row), status: 200 as const };
  },
};
