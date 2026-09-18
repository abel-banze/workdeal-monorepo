import { FACEBOOK_PAGE_URL, SITE_NAME, SITE_OG_IMAGE, SITE_TAGLINE, getSiteUrl } from "@/lib/seo";

function JsonLdSchema({ json }: { json: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }}
    />
  );
}

/** schema.org Organization — injetado no layout raiz para associar a marca à rede social. */
export function OrganizationJsonLd() {
  const url = getSiteUrl();
  return (
    <JsonLdSchema
      json={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        alternateName: SITE_TAGLINE,
        url,
        logo: `${url}${SITE_OG_IMAGE}`,
        sameAs: [FACEBOOK_PAGE_URL],
      }}
    />
  );
}

/** schema.org WebSite — ativa a "sitelinks search box" do Google na pesquisa. */
export function WebSiteJsonLd() {
  const url = getSiteUrl();
  return (
    <JsonLdSchema
      json={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url,
        inLanguage: "pt-MZ",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${url}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}