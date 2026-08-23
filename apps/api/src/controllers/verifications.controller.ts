import { ok } from "../lib/api-response";
import { verificationsService } from "../services/verifications.service";
import type { VerificationListQuery } from "@workdeal/shared";

export const verificationsController = {
  async list(query: VerificationListQuery) {
    const result = await verificationsService.list(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },
  async approve(id: string, reviewerUserId: string, reviewNote?: string) {
    const row = await verificationsService.review(id, "approved", reviewerUserId, reviewNote);
    return { body: ok(row), status: 200 as const };
  },
  async reject(id: string, reviewerUserId: string, reviewNote?: string) {
    const row = await verificationsService.review(id, "rejected", reviewerUserId, reviewNote);
    return { body: ok(row), status: 200 as const };
  },
};
