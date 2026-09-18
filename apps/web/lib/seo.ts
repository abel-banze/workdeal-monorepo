/** Constantes partilhadas de SEO — canónicos, sitemap e JSON-LD bebem daqui. */

export const SITE_NAME = "Workdeal";
export const SITE_TAGLINE = "Onde os negócios se encontram";
export const SITE_DESCRIPTION =
  "O Workdeal é o ecossistema global de negócios onde empresas verificadas ganham visibilidade, constroem confiança e fecham negócios sem fronteiras — 100% digital.";

/** Imagem OG padrão (1200x630) em /public — usada em openGraph e twitter. */
export const SITE_OG_IMAGE = "/og-image.png";
export const SITE_OG_IMAGE_ABS = (url: string) => `${url.replace(/\/+$/, "")}${SITE_OG_IMAGE}`;

/** Redes sociais da marca (sameAs) — ajustar quando existir handle. */
export const SITE_SOCIAL_LINKS = ["https://www.facebook.com/61562593093118"];

export const FACEBOOK_PAGE_URL = SITE_SOCIAL_LINKS[0];

/** Base pública do site — canónicos, sitemap e JSON-LD bebem daqui. */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (url) return url;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "https://www.workdeal.co.mz";
}

/** Corta pelos espaços: nunca parte palavras a meio; "…" só quando corta. */
export function truncateWords(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const words = clean.slice(0, max).split(" ");
  words.pop();
  return `${words.join(" ")}…`;
}