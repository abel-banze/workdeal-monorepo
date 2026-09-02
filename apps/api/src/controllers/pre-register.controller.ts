import { ok } from "../lib/api-response.js";
import { preRegisterService } from "../services/pre-register.service.js";
import type { AdminOrgListQuery, PreRegisterCompanyInput, PreRegisterUpdateInput } from "@workdeal/shared";

export const preRegisterController = {
  async create(actorUserId: string, input: PreRegisterCompanyInput) {
    const row = await preRegisterService.create(actorUserId, input);
    return { body: ok({ id: row.id, name: row.name, slug: row.slug, verificationStatus: row.verificationStatus }), status: 201 as const };
  },

  async list(query: AdminOrgListQuery) {
    const result = await preRegisterService.list(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },

  async regenerateToken(actorSystemRole: string, id: string) {
    const result = await preRegisterService.regenerateToken(id, actorSystemRole);
    return { body: ok(result), status: 200 as const };
  },

  async resendNotification(actorSystemRole: string, id: string) {
    const result = await preRegisterService.resendNotification(id, actorSystemRole);
    return { body: ok(result), status: 200 as const };
  },

  async update(id: string, input: PreRegisterUpdateInput) {
    const result = await preRegisterService.update(id, input);
    return { body: ok(result), status: 200 as const };
  },

  async remove(id: string) {
    const result = await preRegisterService.remove(id);
    return { body: ok(result), status: 200 as const };
  },

  async listPublic() {
    const items = await preRegisterService.listPublic();
    return { body: ok(items), status: 200 as const };
  },

  async getById(id: string) {
    const data = await preRegisterService.getById(id);
    return { body: ok(data), status: 200 as const };
  },

  async lookup(token: string) {
    const data = await preRegisterService.lookup(token);
    return { body: ok(data), status: 200 as const };
  },

  async claim(token: string, userId: string) {
    const result = await preRegisterService.claim(token, userId);
    return { body: ok(result), status: 200 as const };
  },
};
