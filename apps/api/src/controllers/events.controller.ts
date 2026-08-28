import type { AuthUser } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { eventsService } from "../services/events.service.js";

export const eventsController = {
  async create(user: AuthUser, body: Parameters<typeof eventsService.createEvent>[1]) {
    const row = await eventsService.createEvent(user, body);
    return { body: ok(row), status: 201 as const };
  },
  async list(query: Parameters<typeof eventsService.listEvents>[0]) {
    const res = await eventsService.listEvents(query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async my(user: AuthUser, query: Parameters<typeof eventsService.myEvents>[1]) {
    const res = await eventsService.myEvents(user, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async get(idOrSlug: string, isSlug: boolean, user?: AuthUser | null) {
    const row = await eventsService.getEvent(idOrSlug, isSlug, user);
    return { body: ok(row), status: 200 as const };
  },
  async patch(user: AuthUser, id: string, body: Parameters<typeof eventsService.updateEvent>[2]) {
    const row = await eventsService.updateEvent(user, id, body);
    return { body: ok(row), status: 200 as const };
  },
  async register(user: AuthUser, body: { eventId: string }) {
    const eventRow = await eventsService.getEvent(body.eventId, false);
    const row = await eventsService.register(eventRow, user);
    return { body: ok(row), status: 201 as const };
  },
  async myRegistrations(user: AuthUser, query: Parameters<typeof eventsService.myRegistrations>[1]) {
    const res = await eventsService.myRegistrations(user, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async listRegistrations(user: AuthUser, eventId: string, query: Parameters<typeof eventsService.listRegistrations>[2]) {
    const res = await eventsService.listRegistrations(user, eventId, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async patchRegistration(user: AuthUser, registrationId: string, body: { status: "cancelled" | "checked_in" }) {
    const row = await eventsService.updateRegistration(user, registrationId, body.status);
    return { body: ok(row), status: 200 as const };
  },
  async cancelMyRegistration(eventId: string, user: AuthUser) {
    const res = await eventsService.cancelMyRegistration(eventId, user);
    return { body: ok(res), status: 200 as const };
  },
};