/** Constantes partilhadas de SEO — canónicos, sitemap e JSON-LD bebem daqui. */

export const SITE_NAME = "Workdeal";
export const SITE_TAGLINE = "Onde os negócios se encontram";
export const SITE_DESCRIPTION =
  "O Workdeal é o ecossistema global de negócios onde empresas verificadas ganham visibilidade, constroem confiança e fecham negócios sem fronteiras — 100% digital.";

/** Keywords globais — quem procura o Workdeal pelo que ele faz. */
export const SITE_KEYWORDS = [
  "workdeal moçambique",
  "plataforma de negócios moçambique",
  "ecossistema de negócios online",
  "empresas",
  "como abrir uma empresa em moçambique",
  "como encontrar fornecedores em moçambique",
  "como encontrar clientes em moçambique",
  "como fazer negócios em moçambique",
  "como expandir negócios em moçambique",
  "como vender online em moçambique",
  "como comprar online em moçambique",
  "como fazer networking em moçambique",
  "como participar de eventos de negócios em moçambique",
  "como participar de feiras de negócios em moçambique",
  "workday",
  "workdeal",
  "workdeeal",
  "workdil",
  "deal",
  "workdeal.co.mz",
  "workdeal.com",
  "workdeal.com.mz",
  "workdeal.net",
  "workdeal",
  "workdeal moçambique",
  "plataforma de negócios moçambique",
  "ecossistema de negócios online",
  "empresas em moçambique",
  "directório de empresas moçambique",
  "onde os negócios se encontram",
  "negócios online moçambique",
  "empresas verificadas moçambique",
  "plataforma b2b moçambique",
];

/** Página de listagem de empresas (/companies). */
export const COMPANIES_KEYWORDS = [
  "empresas moçambique",
  "directório de empresas moçambique",
  "empresas verificadas moçambique",
  "encontrar empresas moçambique",
  "fornecedores moçambique",
  "empresas de construção moçambique",
  "empresas de electricidade moçambique",
  "empresas de limpeza e manutenção moçambique",
  "empresas de tecnologia moçambique",
  "fornecedores por categoria moçambique",
  "lista de empresas moçambique",
];

/** Detalhe de empresa (/profiles/[slug]). */
export const COMPANY_PROFILE_KEYWORDS = [
  "empresa moçambique",
  "perfil de empresa",
  "serviços empresariais",
  "empresa verificada workdeal",
  "fornecedor moçambique",
  "avaliações de empresas moçambique",
  "orçamento empresa moçambique",
  "contactar empresa moçambique",
];

/**
 * Keywords dinâmicos para uma página de empresa: junta os genéricos com o
 * nome da empresa, categorias, serviços e localização reais do perfil.
 */
export function companyProfileKeywords(profile: {
  name: string;
  categories: { name: string }[];
  services?: { title: string }[];
  province?: string | null;
  district?: string | null;
  location?: { province?: string | null; district?: string | null; formattedAddress?: string | null } | null;
}): string[] {
  const placeParts = [
    profile.province,
    profile.district,
    profile.location?.province,
    profile.location?.district,
    profile.location?.formattedAddress,
  ].filter((p): p is string => Boolean(p));
  const dynamic: string[] = [
    `${profile.name} moçambique`,
    profile.name,
    ...profile.categories.map((c) => `${c.name} em moçambique`),
    ...profile.categories.map((c) => c.name),
    ...(profile.services ?? []).map((s) => s.title),
    ...placeParts,
  ];
  return dedupeKeywords([...COMPANY_PROFILE_KEYWORDS, ...dynamic]);
}

/** Página de listagem de requisições/pedidos de serviço (/tasks). */
export const TASKS_KEYWORDS = [
  "requisições de serviço moçambique",
  "pedidos de serviço moçambique",
  "oportunidades de negócio moçambique",
  "concursos moçambique",
  "fornecimento de bens e serviços",
  "obras moçambique",
  "propostas comerciais moçambique",
  "licitações moçambique",
  "pedidos de cotação moçambique",
];

/** Detalhe de requisição (/tasks/[taskId]). */
export const TASK_DETAIL_KEYWORDS = [
  "oportunidade de negócio moçambique",
  "pedido de propostas moçambique",
  "concurso moçambique",
  "fornecimento moçambique",
  "obra moçambique",
  "enviar proposta workdeal",
  "requisição de serviço workdeal",
];

/**
 * Keywords dinâmicos para uma página de requisição: junta os genéricos com o
 * título, categoria, localização e solicitante reais do pedido.
 */
export function taskDetailKeywords(task: {
  title: string;
  categoryName?: string | null;
  province?: string | null;
  district?: string | null;
  requesterProfileName?: string | null;
}): string[] {
  const dynamic: string[] = [
    `${task.title} moçambique`,
    task.title,
    ...(task.categoryName ? [`${task.categoryName} moçambique`, task.categoryName] : []),
    ...(task.province ? [`requisição em ${task.province}`, task.province] : []),
    ...(task.district ? [task.district] : []),
    ...(task.requesterProfileName ? [`proposta para ${task.requesterProfileName}`] : []),
  ];
  return dedupeKeywords([...TASK_DETAIL_KEYWORDS, ...dynamic]);
}

/** Remove duplicados preservando a ordem e normaliza em minúsculas. */
export function dedupeKeywords(list: string[]): string[] {
  return [...new Set(list.map((k) => k.trim().toLowerCase()).filter(Boolean))];
}

/** Página de listagem de eventos (/events). */
export const EVENTS_KEYWORDS = [
  "eventos de negócios moçambique",
  "feiras moçambique",
  "networking moçambique",
  "conferências moçambique",
  "seminários empresariais moçambique",
  "eventos para empresas moçambique",
  "agenda de eventos moçambique",
  "workshops moçambique",
  "inscrição em eventos moçambique",
];

/** Detalhe de evento (/events/[slug]). */
export const EVENT_DETAIL_KEYWORDS = [
  "evento moçambique",
  "feira moçambique",
  "networking moçambique",
  "conferência moçambique",
  "workshop moçambique",
  "inscrição evento workdeal",
  "evento empresarial moçambique",
  "evento de negócios workdeal",
];



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