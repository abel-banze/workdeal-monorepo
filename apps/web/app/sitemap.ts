import type { MetadataRoute } from "next";
import { getPublicEvents, getPublicTasks } from "@/lib/directory";
import { getInstitutions } from "@/lib/organizations";
import { getProfiles } from "@/lib/profiles";
import { getPublicTenders } from "@/lib/tenders";
import { getSiteUrl } from "@/lib/seo";

export const revalidate = 3600;

const MAX_PAGES = 8; // 8 páginas × 50 por tipo — cobertura ampla sem sitemap gigante
const LIMIT = 50;

async function paginate<T>(
  fetchPage: (page: number) => Promise<{ data: T[]; meta?: Record<string, unknown> }>,
  maxPages = MAX_PAGES,
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchPage(page);
    const items = res.data ?? [];
    out.push(...items);
    const total = typeof res.meta?.total === "number" ? (res.meta.total as number) : out.length + 1;
    if (items.length < LIMIT || out.length >= total || items.length === 0) break;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/companies`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/organizations`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/tasks`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/events`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/concursos`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/manifesto`, lastModified: now, priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: now, priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, priority: 0.3 },
  ];

  // Rotas dinâmicas — cada grupo falha isolado (try/catch) para nunca quebrar o sitemap.
  const [profiles, institutions, events, tenders, tasks]: (MetadataRoute.Sitemap | null)[] = await Promise.all([
    paginate(async (page) => getProfiles({ page: String(page), limit: String(LIMIT), status: "active" }))
      .then((items) => items.map((p) => ({ url: `${baseUrl}/profiles/${p.slug}`, lastModified: p.updatedAt ?? now, changeFrequency: "weekly" as const, priority: 0.7 })))
      .catch(() => null),
    paginate(async (page) => getInstitutions({ page: String(page), limit: String(LIMIT) }))
      .then((items) => items.map((i) => ({ url: `${baseUrl}/organizations/${i.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })))
      .catch(() => null),
    paginate(async (page) => getPublicEvents({ page: String(page), limit: String(LIMIT) }))
      .then((items) => items.map((e) => ({ url: `${baseUrl}/events/${e.slug}`, lastModified: e.updatedAt ?? now, changeFrequency: "daily" as const, priority: 0.6 })))
      .catch(() => null),
    paginate(async (page) => getPublicTenders({ page: String(page), limit: String(LIMIT), state: "open" }))
      .then((items) => items.map((t) => ({ url: `${baseUrl}/concursos/${t.id}`, lastModified: t.publishedAt ?? t.lastSeenAt ?? now, changeFrequency: "weekly" as const, priority: 0.6 })))
      .catch(() => null),
    paginate(async (page) => getPublicTasks({ page: String(page), limit: String(LIMIT) }), 4)
      .then((items) => items.map((t) => ({ url: `${baseUrl}/tasks/${t.id}`, lastModified: t.updatedAt ?? now, changeFrequency: "weekly" as const, priority: 0.6 })))
      .catch(() => null),
  ]);

  return [
    ...staticRoutes,
    ...(profiles ?? []),
    ...(institutions ?? []),
    ...(events ?? []),
    ...(tenders ?? []),
    ...(tasks ?? []),
  ];
}