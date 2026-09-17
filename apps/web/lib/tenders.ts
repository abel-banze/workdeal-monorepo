import type { TenderView } from "@workdeal/shared";
import { formatMzn } from "@/lib/dates";
import { apiFetch } from "@/lib/api";

function buildQs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export { PROVINCES } from "@workdeal/shared";

export async function getPublicTenders(params: Record<string, string | undefined> = {}) {
  return apiFetch<TenderView[]>(`/api/v1/tenders${buildQs(params)}`, {
    next: { revalidate: 300, tags: ["tenders"] },
  });
}

export async function getPublicTender(id: string) {
  return apiFetch<TenderView>(`/api/v1/tenders/${encodeURIComponent(id)}`, {
    next: { revalidate: 300, tags: [`tenders:${id}`] },
  });
}

/** `estimatedValue`/`provisionalGuarantee` chegam como string (numeric no Postgres). */
export function formatTenderMoney(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return formatMzn(n);
}

// ── Labels PT-MZ para a listagem (valores crus vêm da scraper UFSA) ──
export const TENDER_CATEGORY_LABELS: Record<string, string> = {
  BENS: "Bens",
  "BENS E SERVICOS": "Bens e serviços",
  EMPREITADAS: "Empreitadas",
  SERVICO: "Serviços",
  SERVICOS: "Serviços",
  CONSULTORIAS: "Consultorias",
  "SERVICOS DE CONSULTORIA": "Serviços de consultoria",
};

export const TENDER_TYPE_LABELS: Record<string, string> = {
  "AJUSTE DIRECTO": "Ajuste directo",
  "CONCURSO DE PEQUENA DIMENSAO": "Concurso de pequena dimensão",
  "CONCURSO EM DUAS ETAPAS": "Concurso em duas etapas",
  "CONCURSO LIMITADO": "Concurso limitado",
  "CONCURSO POR COTACOES": "Concurso por cotações",
  "CONCURSO POR LANCES": "Concurso por lances",
  "CONCURSO PUBLICO": "Concurso público",
  "SELECCAO BASEADA NA QUALIDADE": "Selecção baseada na qualidade",
  "SELECCAO BASEADA NA QUALIDADE E NO PRECO": "Selecção por qualidade e preço",
  "SELECCAO BASEADA NAS QUALIFICACOES DO CONSULTOR": "Selecção por qualificações do consultor",
  "SELECCAO DE PESSOA SINGULAR": "Selecção de pessoa singular",
};

export function tenderFacetLabel(maps: Record<string, string>, value: string): string {
  return maps[value] ?? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}