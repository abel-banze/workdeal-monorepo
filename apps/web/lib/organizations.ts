import type { InstitutionListItem, InstitutionPublicView } from "@workdeal/shared";
import { apiFetch } from "@/lib/api";

export async function getInstitutions(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const qs = search.toString();
  // Pesquisa e "nearby" são voláteis — nunca cachear. Listagem geral cache 5m.
  const volatile = params.near !== undefined || params.q !== undefined;
  return apiFetch<InstitutionListItem[]>(`/api/v1/institutions${qs ? `?${qs}` : ""}`, {
    next: volatile ? { revalidate: 0 } : { revalidate: 300, tags: ["institutions"] },
  });
}

export async function getPublicInstitution(slug: string) {
  return apiFetch<InstitutionPublicView>(`/api/v1/institutions/${slug}/public`, {
    next: { revalidate: 3600, tags: [`institution:${slug}`] },
  });
}