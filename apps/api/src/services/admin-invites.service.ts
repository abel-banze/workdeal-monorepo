import { randomBytes } from "node:crypto";
import { randomUUID } from "node:crypto";
import type { AdminInviteCreateInput, AdminInviteListQuery } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { adminInvitesRepository } from "../repositories/admin-invites.repository.js";

class AdminInvitesService {
  async list(query: AdminInviteListQuery) {
    const result = await adminInvitesRepository.list(query);
    return { items: result.items, total: result.total, page: query.page ?? 1, limit: query.limit ?? 20 };
  }

  async create(actorRole: string, actorUserId: string, input: AdminInviteCreateInput) {
    this.requireAdmin(actorRole);
    const email = input.email.trim().toLowerCase();

    const existing = await adminInvitesRepository.findPendingByEmail(email);
    if (existing) {
      throw new AppError(409, "INVITE_EXISTS", "Já existe um convite pendente para este email");
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000);
    const invite = await adminInvitesRepository.create({
      id: randomUUID(),
      email,
      role: input.role,
      token,
      expiresAt,
      invitedBy: actorUserId,
    });
    return invite;
  }

  async revoke(actorRole: string, id: string) {
    this.requireAdmin(actorRole);
    const invite = await adminInvitesRepository.findById(id);
    if (!invite) throw new AppError(404, "NOT_FOUND", "Convite não encontrado");
    if (invite.status === "accepted") throw new AppError(409, "ALREADY_ACCEPTED", "O convite já foi aceite");
    const revoked = await adminInvitesRepository.revoke(id);
    if (!revoked) throw new AppError(404, "NOT_FOUND", "Convite não encontrado");
    return revoked;
  }

  async regenerate(actorRole: string, id: string, expiresInDays = 7) {
    this.requireAdmin(actorRole);
    const invite = await adminInvitesRepository.findById(id);
    if (!invite) throw new AppError(404, "NOT_FOUND", "Convite não encontrado");
    if (invite.status === "accepted") throw new AppError(409, "ALREADY_ACCEPTED", "O convite já foi aceite");
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const regenerated = await adminInvitesRepository.regenerate(id, token, expiresAt);
    if (!regenerated) throw new AppError(404, "NOT_FOUND", "Convite não encontrado");
    return regenerated;
  }

  async accept(token: string, session: { userId: string; email: string | null; role: string }) {
    const invite = await adminInvitesRepository.findByToken(token);
    if (!invite) throw new AppError(404, "INVITE_NOT_FOUND", "Convite inválido ou já utilizado");

    if (invite.status === "accepted") throw new AppError(409, "ALREADY_ACCEPTED", "Este convite já foi aceite");
    if (invite.status === "revoked" || invite.status === "expired") {
      throw new AppError(410, "INVITE_CANCELED", "Este convite já não está activo");
    }

    if (!session.email || session.email.trim().toLowerCase() !== invite.email.toLowerCase()) {
      throw new AppError(403, "EMAIL_MISMATCH", "Este convite é para outro email. Entra com a conta Workdeal do email convidado.");
    }

    const accepted = await adminInvitesRepository.accept(invite.id, session.userId);
    if (!accepted) throw new AppError(404, "NOT_FOUND", "Convite não encontrado");
    return accepted;
  }

  private requireAdmin(actorRole: string) {
    if (actorRole !== "admin") {
      throw new AppError(403, "FORBIDDEN", "Só administradores podem gerir convites");
    }
  }
}

export const adminInvitesService = new AdminInvitesService();