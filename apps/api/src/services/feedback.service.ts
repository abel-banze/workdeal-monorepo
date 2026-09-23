import type { AuthUser, CreateFeedbackInput, FeedbackListQuery, UpdateFeedbackInput } from "@workdeal/shared";
import { getOrgRole } from "@workdeal/auth";
import { AppError } from "../lib/errors.js";
import { feedbackRepository } from "../repositories/feedback.repository.js";

export const feedbackService = {
  async submit(user: AuthUser, input: CreateFeedbackInput) {
    if (input.organizationId) {
      const role = await getOrgRole(user.id, input.organizationId);
      if (!role) throw new AppError(403, "FORBIDDEN", "Sem acesso a esta organização");
    }
    const row = await feedbackRepository.create({
      userId: user.id,
      organizationId: input.organizationId ?? null,
      kind: input.kind ?? "suggestion",
      message: input.message,
      page: input.page ?? null,
    });
    if (!row) throw new AppError(500, "FEEDBACK_CREATE_FAILED", "Falha ao enviar feedback");
    return row;
  },

  async myFeedback(user: AuthUser, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await feedbackRepository.listForUser(user.id, { page, limit });
    return { items, total, page, limit };
  },

  async list(query: FeedbackListQuery) {
    const { items, total } = await feedbackRepository.listAdmin({
      status: query.status,
      kind: query.kind,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 20 };
  },

  async update(id: string, input: UpdateFeedbackInput) {
    const row = await feedbackRepository.update(id, { status: input.status, adminNote: input.adminNote ?? null });
    if (!row) throw new AppError(404, "FEEDBACK_NOT_FOUND", "Feedback não encontrado");
    return row;
  },
};
