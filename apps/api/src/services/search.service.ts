import { parseSmartSearch, isValidCoordinates } from "@workdeal/shared";
import type { Province, SmartSearchResult, SmartSearchCategory } from "@workdeal/shared";
import { searchRepository } from "../repositories/search.repository.js";
import type { SearchLocation } from "../repositories/search.repository.js";
import { profilesRepository } from "../repositories/profiles.repository.js";

export interface SearchInput {
  q: string;
  categoryId?: string;
  categorySlug?: string;
  near?: string | null; // "lat,lng"
  radiusKm?: number;
  sort?: "recent" | "name" | "distance";
  page?: number;
  limit?: number;
  status?: string;
}

export type SearchParsed = SmartSearchResult & { location: SearchLocation | null };
export interface SearchOutput {
  items: any[];
  total: number;
  parsed: SearchParsed;
  fallback: boolean;
}

/**
 * Remove do texto residual os tokens que já pertenceram à localização
 * detectada (ex: "empresas em polana" → polana fica só como filtro
 * estruturado, não re-filtra o FTS).
 */
function stripLocationTokens(text: string, location: SearchLocation | null): string {
  if (!location) return text;
  const drop = new Set(
    location.value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\s+/)
      .filter(Boolean),
  );
  return (text.match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((t) => {
      const norm = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return !drop.has(norm);
    })
    .join(" ")
    .trim();
}

function parseNear(near: string | null | undefined): { latitude: number; longitude: number } | null {
  if (!near) return null;
  const [latStr, lngStr] = near.split(",");
  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  return isValidCoordinates(latitude, longitude) ? { latitude, longitude } : null;
}

export class SearchService {
  /**
   * Motor único de pesquisa (human-way). Interpreta a query natural em
   * filtros estruturados (localização via `known_locations` + categoria via
   * aliases) e usa o texto residual no FTS (websearch_to_tsquery) com
   * fallback trigram. É o mesmo motor usado por `/api/v1/profiles?q=` e
   * `/api/v1/search`.
   */
  async search(input: SearchInput): Promise<SearchOutput> {
    const raw = (input.q || "").trim();
    if (!raw) {
      return {
        items: [],
        total: 0,
        parsed: { text: "", province: null, matchedProvince: null, categorySlug: null, matchedCategory: null, structured: false, location: null },
        fallback: false,
      };
    }

    const cats = await profilesRepository.listActiveCategories();
    const smartCats: SmartSearchCategory[] = cats.map((c) => ({ slug: c.slug, name: c.name }));
    const smart = parseSmartSearch(raw, smartCats);

    // Categoria: filtro explícito (dropdown/chip) tem prioridade; senão
    // resolve o slug detectado no texto para o id (filtro `exists` no repo).
    const catSlug = input.categorySlug ?? smart.categorySlug;
    const finalCatId = input.categoryId ?? (catSlug ? cats.find((c) => c.slug === catSlug)?.id : undefined);
    let categoryIds: string[] | undefined;
    let categorySlug: string | null = null;
    let matchedCategory: string | null = null;
    if (finalCatId) {
      const cat = cats.find((c) => c.id === finalCatId);
      categorySlug = cat?.slug ?? null;
      matchedCategory = cat?.name ?? null;
      // Uma categoria L1 (pai) inclui também os perfis das suas subcategorias.
      // Ex: filtrar por "Eventos" retorna também quem está em "Decoração" ou
      // "Catering" — senão a pesquisa natural "empresa de eventos" perdia
      // empresas cujo perfil aponta para a categoria filha.
      const descendants = new Set<string>([finalCatId]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const c of cats) {
          if (c.parentId && descendants.has(c.parentId) && !descendants.has(c.id)) {
            descendants.add(c.id);
            grew = true;
          }
        }
      }
      categoryIds = [...descendants];
    } else {
      categorySlug = smart.categorySlug;
      matchedCategory = smart.matchedCategory;
    }

    // Localização: SQL real sobre a MV known_locations (autoritativo, corrige
    // o threshold de pg_trgm) — nunca carrega a MV inteira em memória.
    // Fallback: quando a MV não devolve nada mas o smart-search já detectou a
    // província (ex: "empresa em nampula" com known_locations sem nampula),
    // usamos essa província como filtro estruturado — evita devolver perfis de
    // outra região por o filtro de localização nunca ser aplicado.
    const location =
      (await searchRepository.matchLocation(raw)) ??
      (smart.province ? { kind: "province" as const, value: smart.province, province: smart.province, district: null } : null);

    // Texto residual: smart-search já removeu categoria + aliases de província
    // + stopwords; retiramos ainda os tokens da localização detectada.
    const text = stripLocationTokens(smart.text, location);

    const near = parseNear(input.near);

    const res = await searchRepository.search({
      text,
      location,
      categoryIds,
      near,
      radiusKm: input.radiusKm,
      sort: input.sort,
      page: input.page,
      limit: input.limit,
      status: input.status,
    });

    const parsed: SearchParsed = {
      text,
      province: location ? (location.province as Province) : (smart.province ?? null),
      matchedProvince: location?.value ?? smart.matchedProvince,
      categorySlug: categoryIds ? categorySlug : null,
      matchedCategory,
      structured: location !== null || (categoryIds?.length ?? 0) > 0,
      location,
    };

    return { items: res.items, total: res.total, parsed, fallback: res.fallback ?? false };
  }
}
export const searchService = new SearchService();