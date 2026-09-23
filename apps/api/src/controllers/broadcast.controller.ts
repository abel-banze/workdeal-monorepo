import type { AuthUser } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { broadcastService } from "../services/broadcast.service.js";

export const broadcastController = {
  async create(staff: AuthUser, body: Parameters<typeof broadcastService.createCampaign>[1]) {
    const row = await broadcastService.createCampaign(staff, body);
    return { body: ok(row), status: 201 as const };
  },
  async list(query: { page?: number; limit?: number }) {
    const res = await broadcastService.listCampaigns(query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async get(id: string) {
    const row = await broadcastService.getCampaign(id);
    return { body: ok(row), status: 200 as const };
  },
  async prepare(id: string) {
    const row = await broadcastService.prepare(id);
    return { body: ok(row), status: 200 as const };
  },
  async sendBatch(id: string, query: { limit?: number }) {
    const res = await broadcastService.sendBatch(id, query.limit ?? 25);
    return { body: ok(res), status: 200 as const };
  },
  async sendIndividual(staff: AuthUser, body: Parameters<typeof broadcastService.sendIndividual>[1]) {
    const res = await broadcastService.sendIndividual(staff, body);
    return { body: ok(res), status: 200 as const };
  },
};
