import { searchRepository } from "../repositories/search.repository.js";
import { parseSearchQuery } from "@workdeal/shared/lib/parse-search-query";
import { db, sql } from "@workdeal/db";

export interface SearchInput { q: string; page?: number; limit?: number; }
export interface SearchOutput { items: any[]; total: number; parsed: ReturnType<typeof parseSearchQuery>; fallback: boolean; }

export class SearchService {
  async search(input: SearchInput): Promise<SearchOutput> {
    const raw = (input.q||"").trim();
    if (!raw) return { items: [], total: 0, parsed: { text:"", location:null, matchedTokens:[], similarity:null }, fallback:false };

    // 1) Carrega known_locations para parse puro (fallback se MV não existir)
    let known: any[] = [];
    try {
      const rows = await db.execute(sql`SELECT kind, value, value_unaccent, province, district FROM known_locations`) as unknown as any[];
      known = Array.isArray(rows)? rows : (rows as any).rows ?? [];
    } catch { known=[]; }

    // 2) Tenta match SQL real com pg_trgm (mais preciso), fallback para helper puro
    let location: { kind:any; value:string; province:string; district:string|null } | null = null;
    let parsed: ReturnType<typeof parseSearchQuery> | null = null;
    if (known.length) {
      parsed = parseSearchQuery(raw, known);
      location = parsed.location;
      // Valida com SQL real se houver (corrige threshold PG)
      try {
        const sqlLoc = await searchRepository.matchLocation(raw);
        if (sqlLoc) location = sqlLoc as any;
      } catch {}
      const text = parsed.text || raw;
      const res = await searchRepository.search({ text, location, page: input.page, limit: input.limit });
      return { items: res.items, total: res.total, parsed: parsed!, fallback: (res as any).fallback ?? false };
    } else {
      // Sem MV (dev vazio) — busca sem filtro location
      const text = raw;
      const res = await searchRepository.search({ text, location:null, page: input.page, limit: input.limit });
      return { items: res.items, total: res.total, parsed: { text, location:null, matchedTokens:[], similarity:null }, fallback: (res as any).fallback ?? false };
    }
  }
}
export const searchService = new SearchService();
