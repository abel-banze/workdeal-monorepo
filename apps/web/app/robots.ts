import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  // Bloqueia preview protegido da Vercel de ser indexado — só prod deve indexar
  const isVercelPreview = !!process.env.VERCEL_URL && process.env.VERCEL_ENV !== "production";

  if (isVercelPreview) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap: `${base}/sitemap.xml`,
      host: base,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/admin", "/onboarding", "/auth", "/pre-register"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}