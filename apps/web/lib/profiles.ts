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
  return apiFetch<ProfileView[]>(`/api/v1/profiles${qs ? `?${qs}` : ""}`, {
    next: params.near ? { revalidate: 0 } : { revalidate: 3600, tags: ["profiles"] },
  });
}

export async function getProfileBySlug(slug: string) {
  return apiFetch<ProfileView>(`/api/v1/profiles/${slug}`, {
    next: { revalidate: 3600, tags: [`profile:${slug}`] },
  });
}

export async function getPublicProfile(slug: string) {
  return apiFetch<PublicProfileView>(`/api/v1/profiles/${slug}/public`, {
    next: { revalidate: 3600, tags: [`profile:${slug}`] },
  });
}

export async function getCategories() {
  return apiFetch<CategoryView[]>(`/api/v1/categories`, {
    next: { revalidate: 3600, tags: ["categories"] },
  });
}

export async function getPortfolioItems(profileId: string) {
  return apiFetch<PortfolioItem[]>(`/api/v1/portfolio/${profileId}`, {
    next: { revalidate: 3600, tags: [`portfolio:${profileId}`] },
  });
}
