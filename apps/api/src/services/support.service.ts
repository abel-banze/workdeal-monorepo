import type { AuthUser, CreateSupportTicketInput, ReplySupportTicketInput, SupportTicketListQuery } from "@workdeal/shared";
import { getOrgRole } from "@workdeal/auth";
import { AppError } from "../lib/errors.js";
import { supportRepository } from "../repositories/support.repository.js";
import { notificationsRepository } from "../repositories/notifications.repository.js";
import { notificationsService } from "./notifications.service.js";
import type { SupportTicketStatus } from "@workdeal/shared";

const TERMINAL = ["resolved", "closed"] as const;

export const supportService = {
  async createTicket(user: AuthUser, input: CreateSupportTicketInput) {
    if (input.organizationId) {
      const role = await getOrgRole(user.id, input.organizationId);
      if (!role) throw new AppError(403, "FORBIDDEN", "Sem acesso a esta organização");
    }
    const ticket = await supportRepository.createTicket({
      userId: user.id,
      organizationId: input.organizationId ?? null,
      subject: input.subject,
      category: input.category ?? "outro",
    });
    if (!ticket) throw new AppError(500, "TICKET_CREATE_FAILED", "Falha ao criar pedido");
    await supportRepository.addMessage({ ticketId: ticket.id, senderUserId: user.id, body: input.message });
    return this.getTicket(user, ticket.id);
  },

  async myTickets(user: AuthUser, query: SupportTicketListQuery) {
    const { items, total } = await supportRepository.listTicketsForUser(user.id, {
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 20 };
  },

  async getTicket(user: AuthUser, id: string) {
    const ticket = await supportRepository.findTicketById(id);
    if (!ticket) throw new AppError(404, "TICKET_NOT_FOUND", "Pedido não encontrado");
    if (ticket.userId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem acesso a este pedido");
    const messages = await supportRepository.listMessages(id, false);
    return { ...ticket, messages };
  },

  async reply(user: AuthUser, id: string, input: ReplySupportTicketInput) {
    const ticket = await supportRepository.findTicketById(id);
    if (!ticket) throw new AppError(404, "TICKET_NOT_FOUND", "Pedido não encontrado");
    if (ticket.userId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem acesso a este pedido");
    if ((TERMINAL as readonly string[]).includes(ticket.status)) {
      throw new AppError(409, "TICKET_CLOSED", "Pedido encerrado — abre um novo pedido");
    }
    const message = await supportRepository.addMessage({ ticketId: id, senderUserId: user.id, body: input.message });
    // Resposta do utilizador reabre o atendimento
    if (ticket.status === "waiting_user" || ticket.status === "resolved") {
      await supportRepository.updateStatus(id, "open");
    }
    return message;
  },

  async closeTicket(user: AuthUser, id: string) {
    const ticket = await supportRepository.findTicketById(id);
    if (!ticket) throw new AppError(404, "TICKET_NOT_FOUND", "Pedido não encontrado");
    if (ticket.userId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem acesso a este pedido");
    return supportRepository.updateStatus(id, "closed");
  },

  // ── Equipa Workdeal ────────────────────────────────────────────
  async listTickets(query: SupportTicketListQuery & { category?: string; q?: string }) {
    const { items, total } = await supportRepository.listTicketsAdmin({
      status: query.status,
      category: query.category,
      q: query.q,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 20 };
  },

  async getTicketAdmin(id: string) {
    const ticket = await supportRepository.findTicketById(id);
    if (!ticket) throw new AppError(404, "TICKET_NOT_FOUND", "Pedido não encontrado");
    const messages = await supportRepository.listMessages(id, true);
    return { ...ticket, messages };
  },

  async replyAdmin(staff: AuthUser, id: string, input: ReplySupportTicketInput, internal = false) {
    const ticket = await supportRepository.findTicketById(id);
    if (!ticket) throw new AppError(404, "TICKET_NOT_FOUND", "Pedido não encontrado");
    const message = await supportRepository.addMessage({ ticketId: id, senderUserId: staff.id, body: input.message, isInternal: internal });
    if (!internal) {
      await supportRepository.updateStatus(id, (TERMINAL as readonly string[]).includes(ticket.status) ? "in_progress" : "waiting_user");
      void notifyTicketReply(ticket).catch((e) => console.error("[support] reply notify falhou", (e as Error).message?.slice(0, 500)));
    }
    return message;
  },

  async setStatus(id: string, status: SupportTicketStatus) {
    const ticket = await supportRepository.findTicketById(id);
    if (!ticket) throw new AppError(404, "TICKET_NOT_FOUND", "Pedido não encontrado");
    return supportRepository.updateStatus(id, status);
  },
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function notifyTicketReply(ticket: { id: string; userId: string; organizationId: string | null; subject: string }) {
  const contact = await notificationsRepository.findUserContact(ticket.userId).catch(() => null);
  if (!contact) return;
  const link = `/dashboard/${ticket.organizationId ?? "personal"}/support?ticket=${ticket.id}`;
  const subject = `Resposta ao teu pedido: ${ticket.subject}`;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0F1A2E">
    <h2 style="margin:0 0 8px;font-size:20px">A equipa respondeu ao teu pedido</h2>
    <p style="color:#5B6B83;margin:0 0 16px"><strong>${escapeHtml(ticket.subject)}</strong> — vê a resposta no teu painel.</p>
    <a href="https://workdeal.co.mz${link}" style="display:inline-block;background:#0B5E56;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">Ver resposta</a>
  </div>`;
  await notificationsService.dispatch({
    organizationId: ticket.organizationId,
    userIds: [ticket.userId],
    type: "support_reply",
    title: "Resposta do suporte",
    body: `«${ticket.subject}» — a equipa respondeu.`,
    link,
    email: { to: contact.email, subject, html },
    metadata: { ticketId: ticket.id },
  });
}
