import { ok } from "../lib/api-response.js";
import { tendersService } from "../services/tenders.service.js";

export const tendersController = {
  async list(query: Parameters<typeof tendersService.list>[0]) {
    const res = await tendersService.list(query);
    return {
      body: ok(res.items, {
        total: res.total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        facets: res.facets,
      }),
      status: 200 as const,
    };
  },
  async get(idOrReference: string) {
    const row = await tendersService.getByIdOrReference(idOrReference);
    return { body: ok(row), status: 200 as const };
  },
};