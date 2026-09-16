import type { AuthUser } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { negotiationsService } from "../services/negotiations.service.js";

export const negotiationsController = {
  async open(user: AuthUser, body: Parameters<typeof negotiationsService.openThread>[1]) {
    const detail = await negotiationsService.openThread(user, body);
    return { body: ok(detail), status: 201 as const };
  },
  async get(user: AuthUser, threadId: string) {
    const detail = await negotiationsService.getThread(user, threadId);
    return { body: ok(detail), status: 200 as const };
  },
  async list(user: AuthUser, query: Parameters<typeof negotiationsService.listThreads>[1]) {
    const res = await negotiationsService.listThreads(user, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async listMessages(user: AuthUser, threadId: string, query: Parameters<typeof negotiationsService.listMessages>[2]) {
    const res = await negotiationsService.listMessages(user, threadId, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit, viewerSide: res.viewerSide }), status: 200 as const };
  },
  async send(user: AuthUser, threadId: string, body: Parameters<typeof negotiationsService.sendMessage>[2]) {
    const message = await negotiationsService.sendMessage(user, threadId, body);
    return { body: ok(message), status: 201 as const };
  },
  async respondToOffer(user: AuthUser, threadId: string, messageId: string, decision: "accepted" | "rejected") {
    const message = await negotiationsService.respondToOffer(user, threadId, messageId, decision);
    return { body: ok(message), status: 200 as const };
  },
};