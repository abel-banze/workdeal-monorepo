import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { getCategories, getProfiles, getPreRegisteredCompanies, type PreRegisteredCompany } from "@/lib/profiles";
import { ProfileCard } from "@/components/features/profile-card";
import { PreRegisterCard } from "@/components/features/pre-register-card";
import { SearchImpressions } from "@/components/features/search-impressions";
import { CompaniesFilters } from "@/components/features/companies-filters";
import { applyDefaultLocation, parseLocationCookies } from "@/lib/location-consent";
import { haversineKm } from "@workdeal/shared/lib/geo";
import { parseSmartSearch, STOPWORDS_PT } from "@workdeal/shared/lib/smart-search";

export const revalidate = 300;

export async function generateMetadata() {
  return {
    title: "Empresas — Workdeal",
    description: "Explore empresas verificadas na plataforma global Workdeal. Filtre por categoria, proximidade, ordenação e selos.",
  };
}

type Props = { searchParams: Promise<Record<string, string | undefined>> };

function PaginationLink({ href, disabled, children }: { href: string; disabled?: boolean; children: ReactNode }) {
  if (disabled) {
    return <span className="pointer-events-none inline-flex h-10 items-center rounded-full border border-[#D9D2C2]/70 bg-[#F6F3EE]/70 px-4 text-sm font-semibold text-[#0F1A2E]/30">{children}</span>;
  }
  return (
    <Link href={href} className="inline-flex h-10 items-center rounded-full border border-[#0F1A2E]/12 bg-white px-4 text-sm font-semibold text-[#0F1A2E]/70 transition-colors hover:border-[#0F1A2E]/30 hover:text-[#0F1A2E]">
      {children}
    </Link>
  );
}

function Pagination({ page, total, limit, baseQs }: { page: number; total: number; limit: number; baseQs: URLSearchParams }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const makeHref = (p: number) => {
    const qs = new URLSearchParams(baseQs);
    if (p <= 1) qs.delete("page");
    else qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/companies?${s}` : "/companies";
  };

  // Janela de páginas: primeira, última e actual ± 1 — ellipsis onde houver gaps.
  const nums = [...new Set([1, totalPages, page - 1, page, page + 1])]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  const items: (number | "…")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) items.push("…");
    items.push(n);
    prev = n;
  }

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-2 border-t border-[#D9D2C2] pt-6">
      <PaginationLink href={makeHref(page - 1)} disabled={page <= 1}>
        ← Anterior
      </PaginationLink>
      {items.map((it, i) =>
        typeof it === "number" ? (
          it === page ? (
            <span key={it} aria-current="page" className="inline-flex size-10 items-center justify-center rounded-[10px] bg-[#0F1A2E] text-sm font-bold text-white">
              {it}
            </span>
          ) : (
            <Link key={it} href={makeHref(it)} className="inline-flex size-10 items-center justify-center rounded-[10px] border border-[#D9D2C2] bg-white text-sm font-semibold text-[#0F1A2E]/70 transition-colors hover:border-[#0F1A2E]/30 hover:text-[#0F1A2E]">
              {it}
            </Link>
          )
        ) : (
          <span key={`gap-${i}`} className="px-1 text-sm text-[#0F1A2E]/35">
            …
          </span>
        ),
      )}
      <PaginationLink href={makeHref(page + 1)} disabled={page >= totalPages}>
        Seguinte →
      </PaginationLink>
      <span className="w-full text-center text-xs tabular-nums text-[#0F1A2E]/45">
        {Math.min(page * limit, total)} de {total}
      </span>
    </nav>
  );
}

function parseNear(near: string | undefined): { latitude: number; longitude: number } | null {
  if (!near) return null;
  const [latStr, lngStr] = near.split(",");
  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { latitude, longitude };
  return null;
}

function normText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesPreRegistered(
  company: PreRegisteredCompany,
  q: string | undefined,
  categorySlugs: Set<string>,
  province: string | null,
  near: string | undefined,
  radiusKm: number,
) {
  if (categorySlugs.size > 0 && !company.categorySlugs.some((s) => categorySlugs.has(s))) {
    return false;
  }
  const query = q?.trim().toLowerCase();
  if (query) {
    // Tokens com valor semântico (sem stopwords): "marquel brindes" → ["marquel","brindes"].
    // Todos têm de aparecer no nome/categorias/localização — tolera pontuação
    // ("MARQUEL, BRINDES E EVENTOS") e diacríticos.
    const tokens = (query.match(/[\p{L}\p{N}]+/gu) ?? []).filter((t) => !STOPWORDS_PT.has(t) && t.length > 1);
    if (tokens.length === 0) return false;

    const haystack = [
      company.name,
      company.categorySlugs.map((s) => s.replace(/[-_]/g, " ")).join(" "),
      company.province,
      company.city,
    ]
      .map(normText)
      .join(" ");

    if (!tokens.every((t) => haystack.includes(t))) return false;
  }
  // Localização detectada na query ("empresa de eventos em maputo" → Cidade de
  // Maputo): filtra de forma bloqueante, tal como o backend faz para os perfis
  // activos — evita devolver pré-registados de outra província.
  if (province) {
    const normProv = normText(province);
    const companyProv = normText(company.province);
    const companyCity = normText(company.city);
    if (!(companyProv.includes(normProv) || companyCity.includes(normProv))) return false;
  }
  // Proximidade por raio (nearby): só filtra se o pré-registo tiver coordenadas.
  const center = parseNear(near);
  if (center && company.latitude != null && company.longitude != null) {
    const dist = haversineKm(center, { latitude: company.latitude, longitude: company.longitude });
    if (dist > radiusKm) return false;
  }
  return true;
}

async function CompaniesList({
  searchParams,
  categories,
}: {
  searchParams: Record<string, string | undefined>;
  categories: { id: string; name: string; slug: string }[];
}) {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const limit = 12;

  try {
    // Uma única query por página para as empresas activas + pré-registadas a
    // encaixar na mesma grelha paginada (as pré-registadas ocupam as posições
    // livres de cada página depois de esgotadas as activas — total combinado).
    const preRegRes = await getPreRegisteredCompanies().catch(() => ({ data: [] }));
    const res = await getProfiles({ ...searchParams, page: String(page), limit: String(limit) });
    const companies = (res.data ?? []).filter((p) => p.type === "company");
    const activeTotal = typeof res.meta?.total === "number" ? res.meta.total : companies.length;
    const search =
      (res.meta?.search as { matchedProvince?: string | null; matchedCategory?: string | null } | undefined) ??
      undefined;

    const allPreRegistered =
      (preRegRes.data as Array<Parameters<typeof PreRegisterCard>[0]["company"]> | null) ?? [];

    const categorySlugs = new Set(
      categories.filter((c) => c.id === searchParams.categoryId).map((c) => c.slug),
    );
    const smart = parseSmartSearch(
      searchParams.q ?? "",
      categories.map((c) => ({ slug: c.slug, name: c.name })),
    );
    if (smart.categorySlug) categorySlugs.add(smart.categorySlug);
    const nearParam = searchParams.near || undefined;
    const radiusKm = Math.max(1, Number(searchParams.radiusKm ?? 25) || 25);
    const preRegistered = allPreRegistered.filter((c) =>
      matchesPreRegistered(c, searchParams.q, categorySlugs, smart.province, nearParam, radiusKm),
    );

    // Paginação unificada: pré-registadas entram nas posições livres (12/página).
    const slotsBefore = (page - 1) * limit;
    const activeBefore = Math.min(activeTotal, slotsBefore);
    const preBefore = Math.max(0, slotsBefore - activeBefore);
    const preOnPage = preRegistered.slice(preBefore, preBefore + Math.max(0, limit - companies.length));
    const combinedTotal = activeTotal + preRegistered.length;

    const smartFilters = [search?.matchedCategory, search?.matchedProvince].filter(Boolean).join(" • ");

    const baseQs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") baseQs.set(k, v as string);

    const isEmptyResult = companies.length === 0 && preOnPage.length === 0;

    const allCards: (
      | { kind: "active"; data: (typeof companies)[number] }
      | { kind: "pre"; data: (typeof preOnPage)[number] }
    )[] = [
      ...companies.map((c) => ({ kind: "active" as const, data: c })),
      ...preOnPage.map((c) => ({ kind: "pre" as const, data: c })),
    ];
    const hasResults = allCards.length > 0;

    return (
      <div className="space-y-6">
        {hasResults ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D2C2] pb-4">
              <p className="text-xs font-bold tracking-[0.14em] text-[#0B5E56]">
                {combinedTotal} EMPRESAS DISPONÍVEIS
              </p>
              <p className="text-xs text-[#0F1A2E]/50">
                Ordenação: <span className="font-semibold text-[#0F1A2E]">{searchParams.sort ?? "recent"}</span> {searchParams.near ? "• índice PostGIS" : "• revalidate 5m"}
              </p>
            </div>
            {smartFilters && (
              <p className="mb-4 rounded-[10px] border border-[#0B5E56]/20 bg-[#EAF4F2] px-3 py-2 text-xs text-[#0B5E56]">
                Pesquisa interpretada: <span className="font-semibold">{smartFilters}</span> — resultados filtrados automaticamente.
              </p>
            )}
          </>
        ) : (
          !isEmptyResult &&
          smartFilters && (
            <p className="rounded-[10px] border border-[#0B5E56]/20 bg-[#EAF4F2] px-3 py-2 text-xs text-[#0B5E56]">
              Pesquisa interpretada: <span className="font-semibold">{smartFilters}</span> — resultados filtrados automaticamente.
            </p>
          )
        )}

        {hasResults && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {allCards.map((item) =>
                item.kind === "active" ? (
                  <ProfileCard
                    key={item.data.id}
                    profile={item.data as unknown as Parameters<typeof ProfileCard>[0]["profile"]}
                    distanceKm={(item.data as unknown as { distanceKm?: number | null }).distanceKm ?? null}
                  />
                ) : (
                  <PreRegisterCard key={item.data.id} company={item.data} />
                ),
              )}
            </div>
            <SearchImpressions profileIds={companies.map((p) => p.id)} />
            <div className="mt-8">
              <Pagination page={page} total={combinedTotal} limit={limit} baseQs={baseQs} />
            </div>
          </>
        )}

        {isEmptyResult && (
          <div className="rounded-[16px] border border-dashed border-[#D9D2C2] bg-white px-6 py-14 text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#F6F3EE] border border-[#D9D2C2] px-3 py-1 text-xs font-bold tracking-widest text-[#0F1A2E]/60">
              <span className="size-1.5 rounded-full bg-[#FF3B1F]" /> NENHUM RESULTADO
            </p>
            <h3 className="mt-4 text-lg font-black tracking-tight text-[#0F1A2E]">Nenhuma empresa encontrada</h3>
            <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-[#0F1A2E]/60">Tente ajustar os filtros — limpe a pesquisa, escolha outra categoria ou aumente o raio de proximidade.</p>
            <Link href="/companies" className="mt-5 inline-flex h-9 items-center rounded-full bg-[#0F1A2E] px-5 text-sm font-bold text-white hover:bg-black">
              Limpar filtros
            </Link>
          </div>
        )}
      </div>
    );
  } catch (e) {
    return (
      <div className="rounded-[16px] border border-[#FF3B1F]/20 bg-[#FFF1EF] px-6 py-10 text-center">
        <p className="text-sm font-bold text-[#FF3B1F]">Falha ao carregar empresas</p>
        <p className="mt-1 text-sm text-[#0F1A2E]/60">{e instanceof Error ? e.message : "Tente novamente mais tarde."}</p>
        <Link href="/companies" className="mt-4 inline-flex h-9 items-center rounded-full border border-[#0F1A2E]/10 bg-white px-4 text-sm font-semibold">
          Recarregar
        </Link>
      </div>
    );
  }
}

export default async function CompaniesPage({ searchParams }: Props) {
  const params = await searchParams;
  const locationParams = applyDefaultLocation(params, parseLocationCookies(await cookies()));
  const categoriesRes = await getCategories().catch(() => ({ data: [] as { id: string; name: string; slug: string }[] }));
  const categories = (categoriesRes as { data: { id: string; name: string; slug: string }[] }).data;

  return (
    <div className="bg-[#F6F3EE]">
      {/* header — directório */}
      <section className="border-b border-[#D9D2C2] bg-white">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          {/* índice — breadcrumb + contagem */}
          <div className="flex items-center justify-between gap-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2">
              <Link href="/" className="text-[#0F1A2E]/40 transition-colors hover:text-[#0F1A2E]">
                Início
              </Link>
              <span className="text-[#D9D2C2]">/</span>
              <span className="text-[#0B5E56]">Empresas</span>
            </nav>
            <span className="hidden tabular-nums text-[#0F1A2E]/45 sm:block">
              {categories.length} categorias · 11 províncias
            </span>
          </div>

          {/* tese do directório */}
          <h1
            className="mt-2.5 font-black leading-[1.05] tracking-[-0.04em] text-[#0F1A2E]"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(19px, 2.4vw, 27px)" }}
          >
            Encontre <span className="text-[#0B5E56]">quem faz</span> o trabalho.
          </h1>

          {/* command bar — pesquisa + categoria + filtros */}
          <div className="mt-4 max-w-[860px]">
            <CompaniesFilters categories={categories as { id: string; name: string; slug: string }[]} initialParams={params} />
          </div>
        </div>
      </section>

      {/* listagem */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
        <div>
          <Suspense
            fallback={
              <div aria-busy="true" aria-live="polite">
                <span className="sr-only">A carregar empresas…</span>
                <div className="mb-4 h-4 w-48 animate-pulse rounded-full bg-[#0B5E56]/15" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
                      <div className="flex gap-4">
                        <div className="size-12 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-32 animate-pulse rounded bg-[#F6F3EE]" />
                          <div className="h-2 w-48 animate-pulse rounded bg-[#F6F3EE]/80" />
                          <div className="flex gap-1.5 pt-1">
                            <span className="h-5 w-16 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                            <span className="h-5 w-20 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <CompaniesList searchParams={locationParams} categories={categories} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
