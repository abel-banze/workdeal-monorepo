import type { MetadataRoute } from "next";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://workdeal.co.mz");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date() },
    { url: `${baseUrl}/companies`, lastModified: new Date() },
    { url: `${baseUrl}/tasks`, lastModified: new Date() },
    { url: `${baseUrl}/events`, lastModified: new Date() },
  ];

  // TODO: fetch dynamic routes via env.API_URL (profiles, tasks, events) when DB is reachable
  return staticRoutes;
}
