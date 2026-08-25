import type { MetadataRoute } from "next";

export const revalidate = 3600;

function getBaseUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (site) return site;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "https://workdeal.co.mz";
}

type ProfilesResponse = {
  success: boolean;
  data: { items: { slug: string; updatedAt?: string | null; createdAt?: string | null }[] };
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/companies`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Perfis públicos — usa API_URL directo (SSR, evita VERCEL_URL protegido)
  const apiBase = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
  try {
    const res = await fetch(`${apiBase}/api/v1/profiles?limit=100&status=active`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = (await res.json()) as ProfilesResponse;
      const items = json.data?.items ?? [];
      const dynamic: MetadataRoute.Sitemap = items
        .filter((p) => typeof p.slug === "string" && p.slug.length > 0)
        .map((p) => ({
          url: `${base}/companies/${encodeURIComponent(p.slug)}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : p.createdAt ? new Date(p.createdAt) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }));
      return [...staticRoutes, ...dynamic];
    }
  } catch {
    // fallback: só estáticas se API offline
  }

  return staticRoutes;
}
