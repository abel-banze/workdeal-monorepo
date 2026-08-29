import { searchService } from "../services/search.service.js";
import type { SearchInput } from "../services/search.service.js";
import { ok } from "../lib/api-response.js";

type SearchQuery = Pick<SearchInput, "q" | "page" | "limit"> &
  Partial<Pick<SearchInput, "categoryId" | "categorySlug" | "near" | "radiusKm" | "sort" | "status">>;

export class SearchController {
  async search(query: SearchQuery) {
    const result = await searchService.search(query);
    return {
      body: ok(result.items, {
        total: result.total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        parsed: result.parsed,
        fallback: result.fallback,
      }),
      status: 200 as const,
    };
  }
}
export const searchController = new SearchController();