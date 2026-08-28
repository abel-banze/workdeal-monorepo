import { searchService } from "../services/search.service.js";
import { ok } from "../lib/api-response.js";

export class SearchController {
  async search(q: string, page?: number, limit?: number) {
    const result = await searchService.search({ q, page, limit });
    return { body: ok(result.items, { total: result.total, page: page ?? 1, limit: limit ?? 20, parsed: result.parsed, fallback: result.fallback }), status: 200 as const };
  }
}
export const searchController = new SearchController();
