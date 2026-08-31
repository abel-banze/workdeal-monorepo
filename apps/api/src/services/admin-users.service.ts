import type { AdminUserListQuery } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { adminUsersRepository } from "../repositories/admin-users.repository.js";

class AdminUsersService {
  async list(query: AdminUserListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await adminUsersRepository.list(query);
    return { items, total, page, limit };
  }

  async updateRole(actorRole: string, userId: string, systemRole: "user" | "moderator" | "admin") {
    // Só admin pode mudar papéis de sistema
    if (actorRole !== "admin") {
      throw new AppError(403, "FORBIDDEN", "Só administradores podem alterar papéis de sistema");
    }
    const target = await adminUsersRepository.findById(userId);
    if (!target) throw new AppError(404, "NOT_FOUND", "Utilizador não encontrado");
    if (target.deletedAt) throw new AppError(409, "ACCOUNT_DELETED", "Conta desactivada");
    // Não permite auto-rebaixar o último admin nem rebaixar outros admins por segurança simples:
    const updated = await adminUsersRepository.updateRole(userId, systemRole);
    if (!updated) throw new AppError(404, "NOT_FOUND", "Utilizador não encontrado");
    return updated;
  }
}

export const adminUsersService = new AdminUsersService();
