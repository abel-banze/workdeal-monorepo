import type { CreateReportInput, ReportListQuery } from "@workdeal/shared";
import { AppError } from "../lib/errors";
import { reportsRepository } from "../repositories/reports.repository";
import { db, profile, review } from "@workdeal/db";
import { eq } from "drizzle-orm";

function newId(): string {
  return `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

class ReportsService {
  async create(userId: string, input: CreateReportInput) {
    // Valida alvo existe para profile|review (task|event validado quando existirem)
    if (input.targetType === "profile") {
      const [row] = await db.select().from(profile).where(eq(profile.id, input.targetId)).limit(1);
      if (!row) throw new AppError(404, "NOT_FOUND", "Perfil alvo não encontrado");
    } else if (input.targetType === "review") {
      const [row] = await db.select().from(review).where(eq(review.id, input.targetId)).limit(1);
      if (!row) throw new AppError(404, "NOT_FOUND", "Avaliação alvo não encontrada");
    }
    return reportsRepository.create({
      id: newId(),
      reporterUserId: userId,
      targetType: input.targetType as never,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details ?? null,
      status: "pending" as never,
    });
  }

  async list(query: ReportListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await reportsRepository.listByStatus(query.status, page, limit);
    return { items, total, page, limit };
  }

  async updateStatus(id: string, status: "resolved" | "dismissed") {
    const existing = await reportsRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Denúncia não encontrada");
    if (existing.status !== "pending") throw new AppError(409, "INVALID_TRANSITION", `Transição inválida de ${existing.status}`);
    const updated = await reportsRepository.updateStatus(id, status);
    return updated!;
  }
}

export const reportsService = new ReportsService();
