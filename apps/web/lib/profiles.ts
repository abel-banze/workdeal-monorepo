import type { ProfileView, CategoryView } from "@workdeal/shared";
import { apiFetch } from "@/lib/api";

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

export async function getCategories() {
  return apiFetch<CategoryView[]>(`/api/v1/categories`, {
    next: { revalidate: 3600, tags: ["categories"] },
  });
}
