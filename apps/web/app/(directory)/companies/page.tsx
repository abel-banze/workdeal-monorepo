import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getCategories, getProfiles, getPreRegisteredCompanies } from "@/lib/profiles";
import { ProfileCard } from "@/components/features/profile-card";
import { PreRegisterCard } from "@/components/features/pre-register-card";
import { SearchImpressions } from "@/components/features/search-impressions";
import { CompaniesFilters } from "@/components/features/companies-filters";
import { applyDefaultLocation, parseLocationCookies } from "@/lib/location-consent";

export const revalidate = 300;

export async function generateMetadata() {
  return {
    title: "Empresas — Workdeal",
    description: "Explore empresas verificadas na plataforma global Workdeal. Filtre por categoria, proximidade, ordenação e selos.",
  };
}

type Props = { searchParams: Promise<Record<string, string | undefined>> };

function Pagination({ page, total, baseQs }: { page: number; total: number; baseQs: URLSearchParams }) {
  const limit = 12;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const makeHref = (p: number) => {
    const qs = new URLSearchParams(baseQs);
    if (p <= 1) qs.delete("page");
    else qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/companies?${s}` : "/companies";
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7);

  return (
    <div className="flex items-center justify-between border-t border-[#D9D2C2] pt-6">
      <Link
        href={makeHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-[#D9D2C2] bg-white text-[#0F1A2E]/30" : "border-[#0F1A2E] bg-[#0F1A2E] text-white hover:bg-black"}`}
      >
        ← Anterior
      </Link>
      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((p) => (
          <Link
            key={p}
            href={makeHref(p)}
            className={`inline-flex size-9 items-center justify-center rounded-full border text-sm font-bold ${p === page ? "border-[#0F1A2E] bg-[#0F1A2E] text-white" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"}`}
          >
            {p}
          </Link>
        ))}
        {totalPages > 7 && <span className="px-2 text-sm text-[#0F1A2E]/40">… {totalPages}</span>}
      </div>
      <span className="text-xs font-mono text-[#0F1A2E]/40 sm:hidden">
        {page} / {totalPages}
      </span>
      <Link
        href={makeHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold ${page >= totalPages ? "pointer-events-none border-[#D9D2C2] bg-white text-[#0F1A2E]/30" : "border-[#0F1A2E] bg-[#0F1A2E] text-white hover:bg-black"}`}
      >
        Seguinte →
      </Link>
    </div>
  );
}

async function CompaniesList({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const limit = 12;

  try {
    const [{ data, meta }, preRegRes] = await Promise.all([
      getProfiles({ ...searchParams, page: String(page), limit: String(limit) }),
      getPreRegisteredCompanies().catch(() => ({ data: [] })),
    ]);
    // fase 1: só empresas
    const companies = data.filter((p) => p.type === "company");
    const total = typeof meta?.total === "number" ? (meta.total as number) : companies.length;
    const preRegistered =
      (preRegRes.data as Array<Parameters<typeof PreRegisterCard>[0]["company"]> | null) ?? [];
    const hasPreRegistered = preRegistered.length > 0;

    const search = meta?.search as
      | { matchedProvince?: string | null; matchedCategory?: string | null }
      | undefined;
    const smartFilters = [search?.matchedCategory, search?.matchedProvince].filter(Boolean).join(" • ");

    const baseQs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") baseQs.set(k, v as string);

    if (companies.length === 0) {
      // mesmo sem empresas activas, mostramos as que estão em pré-registo
      return (
        <div className="space-y-6">
          {hasPreRegistered && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#FFB020]/20 text-[#B27300]">⏳</span>
                <h2 className="text-sm font-black tracking-tight text-[#0F1A2E]">Empresas em pré-registo</h2>
                <span className="rounded-full bg-[#FFF1D6] px-2 py-0.5 text-[11px] font-bold text-[#B27300]">{preRegistered.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {preRegistered.map((c) => (
                  <PreRegisterCard key={c.id} company={c} />
                ))}
              </div>
            </section>
          )}
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
        </div>
      );
    }

    return (
      <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D2C2] pb-4">
          <p className="text-xs font-bold tracking-[0.14em] text-[#0B5E56]">
            {total} EMPRESAS • PÁGINA {page} • LIMITE {limit}
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
        {hasPreRegistered && !searchParams.q && !smartFilters && (
          <section className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#FFB020]/20 text-[#B27300]">⏳</span>
              <h2 className="text-sm font-black tracking-tight text-[#0F1A2E]">Empresas em pré-registo</h2>
              <span className="rounded-full bg-[#FFF1D6] px-2 py-0.5 text-[11px] font-bold text-[#B27300]">{preRegistered.length}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {preRegistered.map((c) => (
                <PreRegisterCard key={c.id} company={c} />
              ))}
            </div>
          </section>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((p) => (
            <ProfileCard key={p.id} profile={p as unknown as Parameters<typeof ProfileCard>[0]["profile"]} distanceKm={(p as unknown as { distanceKm?: number | null }).distanceKm ?? null} />
          ))}
        </div>
        <SearchImpressions profileIds={companies.map((p) => p.id)} />
        <div className="mt-8">
          <Pagination page={page} total={total} baseQs={baseQs} />
        </div>
      </>
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
      {/* header */}
      <section className="relative border-b border-[#D9D2C2] bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to right, #0F1A2E 1px, transparent 1px), linear-gradient(to bottom, #0F1A2E 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.14em]">
            <Link href="/" className="text-[#0F1A2E]/40 hover:text-[#0F1A2E]">
              Início
            </Link>
            <span className="text-[#D9D2C2]">/</span>
            <span className="text-[#0B5E56]">EMPRESAS</span>
            <span className="ml-2 rounded-full bg-[#0F1A2E] px-2 py-0.5 text-[10px] font-black tracking-widest text-white">SÓ EMPRESAS • FASE 1</span>
          </div>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <h1 className="font-black tracking-[-0.05em] leading-[0.9] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4.5vw, 44px)" }}>
                Empresas verificadas.
                <br />
                <span className="font-normal text-[#0F1A2E]/70">Filtro total, contacto directo.</span>
              </h1>
              <p className="mt-3 max-w-[560px] text-[14px] leading-relaxed text-[#0F1A2E]/60">
                Pesquise por nome, categoria e proximidade. Ordene por recentes, nome ou distância (PostGIS). Paginação obrigatória, nunca lista completa sem <code className="rounded border bg-[#F6F3EE] px-1 py-0.5 font-mono text-xs">limit</code>.
              </p>
              <div className="mt-4 hidden flex-wrap gap-1.5 lg:flex">
                {[
                  { label: "Construção", q: "construção" },
                  { label: "Electricidade", q: "electricidade" },
                  { label: "Limpeza", q: "limpeza" },
                ].map((a) => (
                  <Link key={a.label} href={`/companies?q=${encodeURIComponent(a.q)}`} className="rounded-full border border-[#0F1A2E]/10 bg-white px-3 py-1 text-xs font-medium hover:bg-[#0F1A2E] hover:text-white">
                    {a.label}
                  </Link>
                ))}
                <Link href="/companies?sort=distance" className="rounded-full bg-[#0B5E56] px-3 py-1 text-xs font-bold text-white">
                  Mais próximas
                </Link>
              </div>
            </div>
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
            <CompaniesList searchParams={locationParams} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
