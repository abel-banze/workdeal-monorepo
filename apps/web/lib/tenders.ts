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