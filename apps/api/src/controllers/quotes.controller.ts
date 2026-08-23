import type { Context } from "hono";
import type { AuthUser } from "@workdeal/shared";
import type { Env } from "../middlewares/auth.middleware.js";
import type { OptionalUser } from "../middlewares/optional-auth.middleware.js";
import { ok } from "../lib/api-response.js";
import { quotesService } from "../services/quotes.service.js";

export const quotesController = {
  async create(user: OptionalUser, body: { targetProfileId: string; requesterOrganizationId?: string | null; serviceLabel: string; serviceTag?: string | null; portfolioItemId?: string | null; message: string; contactName: string; contactEmail: string; contactPhone?: string | null; fileIds?: string[] }) {
    const row = await quotesService.createQuote(user, body);
    return { body: ok(row), status: 201 as const };
  },
  async list(user: AuthUser, query: { role: "incoming" | "outgoing"; status?: string; page: number; limit: number }) {
    const res = await quotesService.listQuotes(user, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async get(user: AuthUser, id: string) {
    const row = await quotesService.getQuote(user, id);
    return { body: ok(row), status: 200 as const };
  },
  async updateStatus(user: AuthUser, id: string, status: string) {
    const row = await quotesService.updateStatus(user, id, status);
    return { body: ok(row), status: 200 as const };
  },
};
