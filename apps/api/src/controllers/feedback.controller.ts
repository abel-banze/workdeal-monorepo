import type { AuthUser } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { feedbackService } from "../services/feedback.service.js";

export const feedbackController = {
  async submit(user: AuthUser, body: Parameters<typeof feedbackService.submit>[1]) {
    const row = await feedbackService.submit(user, body);
    return { body: ok(row), status: 201 as const };
  },
  async mine(user: AuthUser, query: { page?: number; limit?: number }) {
    const res = await feedbackService.myFeedback(user, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async listAdmin(query: Parameters<typeof feedbackService.list>[0]) {
    const res = await feedbackService.list(query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async updateAdmin(id: string, body: Parameters<typeof feedbackService.update>[1]) {
    const row = await feedbackService.update(id, body);
    return { body: ok(row), status: 200 as const };
  },
};
