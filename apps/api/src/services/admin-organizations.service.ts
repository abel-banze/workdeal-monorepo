import type { AdminOrgListQuery } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { adminOrganizationsRepository } from "../repositories/admin-organizations.repository.js";

class AdminOrganizationsService {
  async list(query: AdminOrgListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await adminOrganizationsRepository.list(query);
    return { items, total, page, limit };
  }

  async updateStatus(actorRole: string, id: string, verificationStatus: "pending" | "in_review" | "verified" | "suspended") {
    if (actorRole !== "admin") {
      throw new AppError(403, "FORBIDDEN", "Só administradores podem alterar o estado de verificação");
    }
    const target = await adminOrganizationsRepository.findById(id);
    if (!target) throw new AppError(404, "NOT_FOUND", "Organização não encontrada");
    if (target.verificationStatus === verificationStatus) {
      throw new AppError(409, "NO_CHANGE", "A organização já está neste estado");
    }
    const updated = await adminOrganizationsRepository.updateStatus(id, verificationStatus);
    if (!updated) throw new AppError(404, "NOT_FOUND", "Organização não encontrada");
    return updated;
  }
}

export const adminOrganizationsService = new AdminOrganizationsService();
