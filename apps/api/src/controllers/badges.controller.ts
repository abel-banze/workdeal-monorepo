import { ok } from "../lib/api-response.js";
import type { BadgesListQuery } from "@workdeal/shared";
import { badgesService } from "../services/badges.service.js";

export const badgesController = {
  async list(query: BadgesListQuery) {
    const result = await badgesService.listPublic(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },
};