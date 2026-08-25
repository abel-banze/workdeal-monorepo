import type { MetadataRoute } from "next";

function getBaseUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (site) return site;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "https://workdeal.co.mz";
}

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl();

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
        disallow: ["/dashboard", "/api/", "/admin", "/onboarding", "/auth"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
