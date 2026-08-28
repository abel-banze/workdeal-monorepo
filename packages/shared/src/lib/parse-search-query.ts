/**
 * parseSearchQuery — separa termo de localização casando tokens contra known_locations via trigram
 * Usado pela rota Hono /api/v1/search (human-way).
 * Fonte: materialized view known_locations (province/district/bairro) — sem hardcode.
 */

export interface KnownLocation {
  kind: "province" | "district" | "bairro";
  value: string;
  value_unaccent: string;
  province: string;
  district: string | null;
}

export interface ParsedSearchQuery {
  /** Texto livre residual para websearch_to_tsquery (sem locais) */
  text: string;
  /** Local detectado (null se nenhum) */
  location: { kind: KnownLocation["kind"]; value: string; province: string; district: string | null } | null;
  /** Tokens originais que casaram (para highlight/debug) */
  matchedTokens: string[];
  /** Similaridade do match (0-1) */
  similarity: number | null;
}

const STOPWORDS = new Set(["de","da","do","das","dos","em","na","no","nas","nos","para","com","e","a","o","as","os","um","uma","por","que","se","ao","aos","ou","no","onde","empresas","empresa"]);

function normalizeUnaccent(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function tokensOf(raw: string): string[] {
  return (raw.match(/[\p{L}\p{N}]+/gu) ?? []).map(t=>normalizeUnaccent(t)).filter(t=>t.length>=2 && !STOPWORDS.has(t));
}

/**
 * Versão pura (sem BD): recebe knownLocations já carregados em memória.
 * threshold padrão 0.3 (pg_trgm similarity). kind priority: bairro > district > province
 */
export function parseSearchQuery(raw: string, knownLocations: KnownLocation[], threshold = 0.3): ParsedSearchQuery {
  const norm = normalizeUnaccent(raw);
  if (!norm) return { text: "", location: null, matchedTokens: [], similarity: null };
  const rawTokens = tokensOf(raw);
  if (rawTokens.length === 0) return { text: "", location: null, matchedTokens: [], similarity: null };

  // Algoritmo: tenta casar n-grams (1-3 tokens) contra known_locations.value_unaccent via trigram similarity aproximada
  // Como não temos pg_trgm aqui, usamos Jaccard de trigramas + levenshtein curto para aproximar similaridade do Postgres.
  // A rota SQL fará o match definitivo com similarity(); este helper apenas separa texto residual de forma determinística.

  let best: { loc: KnownLocation; sim: number; ngram: string } | null = null;
  const ngrams: string[] = [];
  for (let n=1; n<=3; n++) for (let i=0; i+n<=rawTokens.length; i++) ngrams.push(rawTokens.slice(i,i+n).join(" "));

  for (const ng of ngrams) {
    for (const loc of knownLocations) {
      const sim = trigramSimilarity(ng, loc.value_unaccent);
      if (sim >= threshold && (!best || sim > best.sim || (sim===best.sim && rankKind(loc.kind)>rankKind(best.loc.kind)))) {
        best = { loc, sim, ngram: ng };
      }
    }
  }

  if (!best) {
    return { text: rawTokens.join(" "), location: null, matchedTokens: [], similarity: null };
  }

  // Remove ngram do texto residual
  const residual = rawTokens.filter(t => !best!.ngram.split(" ").includes(t)).join(" ");
  return {
    text: residual || best.ngram, // se sobrar vazio, usa o próprio termo para ts_rank (fallback)
    location: { kind: best.loc.kind, value: best.loc.value, province: best.loc.province, district: best.loc.district },
    matchedTokens: best.ngram.split(" "),
    similarity: best.sim,
  };
}

function rankKind(k: string): number { return k==="bairro"?3:k==="district"?2:1; }

/** Trigram Jaccard — aproximação de pg_trgm similarity */
function trigrams(s: string): Set<string> {
  const padded = `  ${s}  `;
  const set = new Set<string>();
  for (let i=0;i<padded.length-2;i++) set.add(padded.slice(i,i+3));
  return set;
}
function trigramSimilarity(a: string, b: string): number {
  if (a===b) return 1;
  // bonus exact substring
  if (b.includes(a) || a.includes(b)) return 0.9;
  const ta=trigrams(a), tb=trigrams(b);
  let inter=0; for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size+tb.size-inter;
  return union===0?0:inter/union;
}

/**
 * Query SQL que a rota deve usar para casar contra known_locations com pg_trgm real.
 * Exportado para ser referenciado na documentação e testes.
 */
export const KNOWN_LOCATION_SQL = `
  SELECT kind, value, province, district, similarity(value_unaccent, unaccent(lower($1))) AS sim
  FROM known_locations
  WHERE value_unaccent % unaccent(lower($1)) OR similarity(value_unaccent, unaccent(lower($1))) > 0.3
  ORDER BY sim DESC, kind DESC
  LIMIT 1
`;
