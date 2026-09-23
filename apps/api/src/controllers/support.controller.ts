import type { AuthUser } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { supportService } from "../services/support.service.js";

export const supportController = {
  async create(user: AuthUser, body: Parameters<typeof supportService.createTicket>[1]) {
    const row = await supportService.createTicket(user, body);
    return { body: ok(row), status: 201 as const };
  },
  async mine(user: AuthUser, query: Parameters<typeof supportService.myTickets>[1]) {
    const res = await supportService.myTickets(user, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async get(user: AuthUser, id: string) {
    const row = await supportService.getTicket(user, id);
    return { body: ok(row), status: 200 as const };
  },
  async reply(user: AuthUser, id: string, body: { message: string }) {
    const row = await supportService.reply(user, id, body);
    return { body: ok(row), status: 201 as const };
  },
  async close(user: AuthUser, id: string) {
    const row = await supportService.closeTicket(user, id);
    return { body: ok(row), status: 200 as const };
  },
  async listAdmin(query: Parameters<typeof supportService.listTickets>[0]) {
    const res = await supportService.listTickets(query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async getAdmin(id: string) {
    const row = await supportService.getTicketAdmin(id);
    return { body: ok(row), status: 200 as const };
  },
  async replyAdmin(staff: AuthUser, id: string, body: { message: string; internal?: boolean }) {
    const row = await supportService.replyAdmin(staff, id, { message: body.message }, body.internal ?? false);
    return { body: ok(row), status: 201 as const };
  },
  async setStatus(id: string, body: { status: "in_progress" | "waiting_user" | "resolved" | "closed" }) {
    const row = await supportService.setStatus(id, body.status);
    return { body: ok(row), status: 200 as const };
  },
};
