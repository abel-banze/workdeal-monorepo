/**
 * Smart search — pesquisa por linguagem natural para o directório.
 *
 * Converte frases como "empresas de construção civil em maputo" em filtros
 * estruturados (província + categoria) com texto livre residual apenas para
 * ordenação por relevância (ts_rank_cd no backend).
 *
 * Fonte de verdade única para as províncias e para as sinónimos de categoria
 * reconhecidos — reutilizado pelo frontend (formulários) e pelo backend.
 */

export const PROVINCES = [
  "Cidade de Maputo",
  "Matola",
  "Gaza",
  "Inhambane",
  "Sofala",
  "Manica",
  "Tete",
  "Zambézia",
  "Nampula",
  "Niassa",
  "Cabo Delgado",
] as const;

export type Province = (typeof PROVINCES)[number];

/**
 * Aliases (normalizados: sem acentos, minúsculas) que mapeiam para a
 * província canónica tal como é gravada em `profile_location.province`.
 * Inclui as capitais provinciais para pesquisa natural ("empresas na beira").
 */
const PROVINCE_ALIASES: Record<Province, string[]> = {
  "Cidade de Maputo": ["cidade de maputo", "maputo", "maputo cidade"],
  Matola: ["matola"],
  Gaza: ["gaza", "xai-xai"],
  Inhambane: ["inhambane", "vilankulo", "vilanculos"],
  Sofala: ["sofala", "beira"],
  Manica: ["manica", "chimoio"],
  Tete: ["tete", "moatize"],
  Zambézia: ["zambezia", "quelimane"],
  Nampula: ["nampula"],
  Niassa: ["niassa", "lichinga"],
  "Cabo Delgado": ["cabo delgado", "pemba"],
};

/**
 * Sinónimos de intenção de categoria (chaves normalizadas) → slug de
 * categoria do seed. Permite resolver termos do dia-a-dia ("electricidade")
 * para a categoria correspondente ("electrica") antes de recorrer ao full-text.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  // Construção e Obras
  "construcao civil": "construcao",
  construcao: "construcao",
  obras: "construcao",
  pedreiro: "construcao",
  electricidade: "electrica",
  electricista: "electrica",
  eletrica: "electrica",
  eletricidade: "electrica",
  canalizacao: "canalizacao",
  canalizador: "canalizacao",
  carpintaria: "carpintaria",
  marceneiro: "carpintaria",
  serralharia: "serralharia",
  serralheiro: "serralharia",
  soldadura: "serralharia",
  pintura: "pintura",
  pintor: "pintura",
  alvenaria: "alvenaria",
  avac: "avac",
  "ar condicionado": "avac",
  // Energia e Água
  "energia solar": "energia-solar",
  solar: "energia-solar",
  "painel solar": "energia-solar",
  geradores: "geradores",
  gerador: "geradores",
  "furos de agua": "furos-agua",
  "bombas de agua": "furos-agua",
  energia: "energia-agua",
  agua: "energia-agua",
  // Indústria e Manufatura
  industria: "industria",
  metalurgia: "metalurgia",
  metalomecanica: "metalurgia",
  // Agronegócio
  agronegocio: "agronegocio",
  agricultura: "agronegocio",
  "insumos agricolas": "insumos-agricolas",
  // Transporte e Logística
  transporte: "transporte",
  logistica: "transporte",
  "transporte de carga": "transporte-carga",
  mudancas: "transporte-carga",
  "transporte de passageiros": "transporte-passageiros",
  machimbombo: "transporte-passageiros",
  // Tecnologia e Telecom
  tecnologia: "tecnologia",
  informatica: "tecnologia",
  software: "desenvolvimento-software",
  redes: "redes-telecom",
  telecomunicacoes: "redes-telecom",
  "suporte informatico": "suporte-informatico",
  informatico: "suporte-informatico",
  // Serviços Empresariais
  contabilidade: "contabilidade",
  contabilista: "contabilidade",
  fiscalidade: "fiscalidade",
  juridico: "juridico",
  advogado: "juridico",
  "recursos humanos": "recursos-humanos",
  rh: "recursos-humanos",
  seguranca: "seguranca",
  vigilancia: "seguranca",
  // Marketing, Design e Eventos
  marketing: "marketing",
  design: "marketing",
  "marketing digital": "marketing-digital",
  eventos: "eventos",
  catering: "catering",
  "som e iluminacao": "som-luz",
  som: "som-luz",
  iluminacao: "som-luz",
  // Limpeza e Higiene
  limpeza: "limpeza",
  higiene: "limpeza",
  "limpeza industrial": "limpeza-industrial",
  // Saúde e Bem-estar
  saude: "saude",
  clinica: "clinica-medica",
  medico: "clinica-medica",
  // Educação e Formação
  educacao: "educacao",
  formacao: "educacao",
  "formacao tecnica": "formacao-tecnica",
  explicacoes: "educacao",
  // Automóvel e Máquinas
  automovel: "automovel",
  mecanica: "automovel",
  mecanico: "automovel",
  mecanizacao: "mecanizacao",
};

/**
 * Palavras sem valor semântico para o directório — removidas do texto livre
 * que sobra depois de extrair província/categoria. Não inclui "servicos"
 * porque pode ser a própria categoria pretendida.
 */
const STOPWORDS_PT = new Set([
  "a", "as", "o", "os", "um", "uma", "uns", "umas",
  "de", "da", "do", "das", "dos",
  "em", "na", "no", "nas", "nos",
  "para", "por", "com", "e", "que", "se", "ao", "aos", "ou",
  "perto", "mim",
  "empresa", "empresas", "companhia", "companhias", "firma", "firmas",
  "procuro", "procuramos", "procurar", "preciso", "precisamos", "precisar",
  "onde", "sao", "ser", "esta", "estao", "existir",
  "toda", "todo", "todas", "todos", "qualquer", "melhor",
  "bom", "boa", "boas", "bons",
]);

export interface SmartSearchCategory {
  slug: string;
  name: string;
}

export interface SmartSearchResult {
  /** Texto livre residual para ranking por relevância (ts_rank_cd). */
  text: string;
  /** Província canónica detectada (valor de `profile_location.province`). */
  province: Province | null;
  /** Nome de exibição da província detectada. */
  matchedProvince: string | null;
  /** Slug da categoria detectada (filtro directo). */
  categorySlug: string | null;
  /** Nome de exibição da categoria detectada. */
  matchedCategory: string | null;
  /** true quando a query foi resolvida para filtros estruturados. */
  structured: boolean;
}

interface Candidate {
  phrase: string;
  slug: string;
  label: string;
}

export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function boundaryRegExp(phrase: string): RegExp {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(phrase)}(?:$|[^\\p{L}\\p{N}])`, "iu");
}

function countsAsWord(phrase: string): boolean {
  const withoutStopwords = phrase.split(/\s+/).filter((t) => !STOPWORDS_PT.has(t));
  return withoutStopwords.some((t) => t.length >= 2);
}

function removePhrase(normalizedText: string, phrase: string): string {
  return normalizedText.replace(boundaryRegExp(phrase), " ");
}

function phraseContainsToken(phrase: string, token: string): boolean {
  return boundaryRegExp(token).test(phrase);
}

function matchProvince(normalizedQuery: string): { province: Province | null; phrase: string | null; remaining: string } {
  const entries = (Object.entries(PROVINCE_ALIASES) as [Province, string[]][])
    .flatMap(([province, aliases]) => aliases.map((phrase) => ({ province, phrase })))
    .sort((a, b) => b.phrase.length - a.phrase.length);

  let remaining = normalizedQuery;
  for (const { province, phrase } of entries) {
    if (boundaryRegExp(phrase).test(remaining)) {
      remaining = removePhrase(remaining, phrase);
      return { province, phrase, remaining };
    }
  }
  return { province: null, phrase: null, remaining };
}

function buildCategoryCandidates(categories: SmartSearchCategory[]): Candidate[] {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const candidates: Candidate[] = [];

  for (const c of categories) {
    const name = normalizeForMatch(c.name);
    const slug = normalizeForMatch(c.slug);
    if (name.length >= 3) candidates.push({ phrase: name, slug: c.slug, label: c.name });
    if (slug.length >= 3) candidates.push({ phrase: slug, slug: c.slug, label: c.name });
  }

  for (const [alias, slug] of Object.entries(CATEGORY_ALIASES)) {
    const category = bySlug.get(slug);
    if (!category) continue; // alias aponta para categoria que não existe — ignora
    candidates.push({ phrase: alias, slug, label: category.name });
  }

  return candidates.sort((a, b) => b.phrase.length - a.phrase.length);
}

function matchCategory(
  normalizedText: string,
  categories: SmartSearchCategory[],
): { candidate: Candidate | null; remaining: string } {
  let remaining = normalizedText;
  for (const candidate of buildCategoryCandidates(categories)) {
    if (!countsAsWord(candidate.phrase)) continue;
    if (boundaryRegExp(candidate.phrase).test(remaining)) {
      remaining = removePhrase(remaining, candidate.phrase);
      return { candidate, remaining };
    }
  }
  return { candidate: null, remaining };
}

function buildResidualText(raw: string, matchedPhrases: string[]): string {
  const tokens = (raw.match(/[\p{L}\p{N}]+/gu) ?? []).filter((token) => {
    const norm = normalizeForMatch(token);
    if (!norm || STOPWORDS_PT.has(norm)) return false;
    if (matchedPhrases.some((phrase) => phraseContainsToken(phrase, norm))) return false;
    return true;
  });
  return tokens.join(" ");
}

/**
 * Interpreta a query de pesquisa natural, extraindo província e categoria.
 * Retorna o texto residual para o backend usar em ts_rank_cd (relevância).
 */
export function parseSmartSearch(raw: string, categories: SmartSearchCategory[]): SmartSearchResult {
  const normalized = normalizeForMatch(raw);
  if (!normalized) {
    return { text: "", province: null, matchedProvince: null, categorySlug: null, matchedCategory: null, structured: false };
  }

  const provinceMatch = matchProvince(normalized);
  const categoryMatch = matchCategory(provinceMatch.remaining, categories);

  const matchedProvince = provinceMatch.province;
  const matchedCategory = categoryMatch.candidate;
  const text = buildResidualText(raw, [provinceMatch.phrase, matchedCategory?.phrase ?? null].filter((p): p is string => p !== null));

  return {
    text,
    province: matchedProvince,
    matchedProvince: matchedProvince,
    categorySlug: matchedCategory?.slug ?? null,
    matchedCategory: matchedCategory?.label ?? null,
    structured: matchedProvince !== null || matchedCategory !== null,
  };
}