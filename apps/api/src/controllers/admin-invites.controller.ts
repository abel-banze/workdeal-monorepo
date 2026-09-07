import { ok } from "../lib/api-response.js";
import type { AdminInviteCreateInput, AdminInviteListQuery } from "@workdeal/shared";
import { adminInvitesService } from "../services/admin-invites.service.js";

export const adminInvitesController = {
  async list(query: AdminInviteListQuery, actorRole: string) {
    const result = await adminInvitesService.list(query);
    return {
      body: ok(result.items, { total: result.total, page: result.page, limit: result.limit, actorRole }),
      status: 200 as const,
    };
  },
  async create(actorRole: string, actorUserId: string, input: AdminInviteCreateInput) {
    const invite = await adminInvitesService.create(actorRole, actorUserId, input);
    return { body: ok(invite), status: 201 as const };
  },
  async revoke(actorRole: string, id: string) {
    const invite = await adminInvitesService.revoke(actorRole, id);
    return { body: ok(invite), status: 200 as const };
  },
  async regenerate(actorRole: string, id: string) {
    const invite = await adminInvitesService.regenerate(actorRole, id);
    return { body: ok(invite), status: 200 as const };
  },
  async accept(token: string, session: { userId: string; email: string | null; role: string }) {
    const invite = await adminInvitesService.accept(token, session);
    return { body: ok(invite), status: 200 as const };
  },
};