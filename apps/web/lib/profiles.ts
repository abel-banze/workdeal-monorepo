import type { ProfileView, CategoryView, PublicProfileView } from "@workdeal/shared";
import { apiFetch } from "@/lib/api";

export type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

export async function getProfiles(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const qs = search.toString();
  // Pesquisa e "nearby" são dados voláteis — nunca cachear. Listagem geral cache 1h.
  const volatile = params.near !== undefined || params.q !== undefined;
  return apiFetch<ProfileView[]>(`/api/v1/profiles${qs ? `?${qs}` : ""}`, {
    next: volatile ? { revalidate: 0 } : { revalidate: 300, tags: ["profiles"] },
  });
}

export async function getProfileBySlug(slug: string) {
  return apiFetch<ProfileView>(`/api/v1/profiles/${slug}`, {
    next: { revalidate: 300, tags: [`profile:${slug}`] },
  });
}

export async function getPublicProfile(slug: string) {
  return apiFetch<PublicProfileView>(`/api/v1/profiles/${slug}/public`, {
    next: { revalidate: 300, tags: [`profile:${slug}`] },
  });
}

export async function getCategories() {
  return apiFetch<CategoryView[]>(`/api/v1/categories`, {
    next: { revalidate: 300, tags: ["categories"] },
  });
}

export async function getPortfolioItems(profileId: string) {
  return apiFetch<PortfolioItem[]>(`/api/v1/portfolio/${profileId}`, {
    next: { revalidate: 300, tags: [`portfolio:${profileId}`] },
  });
}

export interface PreRegisteredCompany {
  id: string;
  name: string;
  slug: string;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  province: string | null;
  city: string | null;
  logoUrl: string | null;
  categorySlugs: string[];
  preRegisteredAt: string;
}

export async function getPreRegisteredCompanies() {
  return apiFetch<PreRegisteredCompany[]>(`/api/v1/pre-register`, {
    // Dados voláteis (empresas que vão surgindo) — cache curta
    next: { revalidate: 60 },
  });
}
