import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { INSTITUTION_LABELS } from "@workdeal/shared";
import { getCategories, getTags } from "@/lib/profiles";
import { getInstitutions } from "@/lib/organizations";
import { OrganizationCard } from "@/components/features/organization-card";
import { OrganizationsFilters } from "@/components/features/organizations-filters";
import { applyDefaultLocation, parseLocationCookies } from "@/lib/location-consent";

export const revalidate = 300;

export async function generateMetadata() {
  return {
    title: "Instituições e Organizações — Workdeal",
    description: "Explore associações, câmaras de comércio, ONG e instituições que dão estrutura ao ecossistema Workdeal. Filtre por tipo, categoria, província e proximidade.",
    openGraph: {
      title: "Instituições e Organizações — Workdeal",
      description: "Associações, câmaras de comércio, ONG e entidades públicas representadas no directório Workdeal.",
    },
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
    return s ? `/organizations?${s}` : "/organizations";
  };

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

async function InstitutionsList({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const limit = 12;

  try {
    const res = await getInstitutions({ ...searchParams, page: String(page), limit: String(limit) });
    const institutions = res.data ?? [];
    const total = typeof res.meta?.total === "number" ? res.meta.total : institutions.length;

    const baseQs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") baseQs.set(k, v as string);

    const hasResults = institutions.length > 0;

    return (
      <div className="space-y-6">
        {hasResults ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D2C2] pb-4">
            <p className="text-xs font-bold tracking-[0.14em] text-[#0B5E56]">{total} INSTITUIÇÕES DISPONÍVEIS</p>
            <p className="text-xs text-[#0F1A2E]/50">
              Ordenação: <span className="font-semibold text-[#0F1A2E]">{searchParams.sort ?? "recent"}</span> {searchParams.near ? "• índice PostGIS" : "• revalidate 5m"}
            </p>
          </div>
        ) : null}

        {hasResults ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {institutions.map((item) => (
              <OrganizationCard key={item.id} institution={item as unknown as Parameters<typeof OrganizationCard>[0]["institution"]} />
            ))}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-[#D9D2C2] bg-white px-6 py-14 text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#F6F3EE] border border-[#D9D2C2] px-3 py-1 text-xs font-bold tracking-widest text-[#0F1A2E]/60">
              <span className="size-1.5 rounded-full bg-[#FF3B1F]" /> NENHUM RESULTADO
            </p>
            <h3 className="mt-4 text-lg font-black tracking-tight text-[#0F1A2E]">Nenhuma instituição encontrada</h3>
            <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-[#0F1A2E]/60">
              Tente ajustar os filtros — limpe a pesquisa, escolha outro tipo, categoria ou província.
            </p>
            <Link href="/organizations" className="mt-5 inline-flex h-9 items-center rounded-full bg-[#0F1A2E] px-5 text-sm font-bold text-white hover:bg-black">
              Limpar filtros
            </Link>
          </div>
        )}

        {hasResults ? (
          <div className="mt-8">
            <Pagination page={page} total={total} limit={limit} baseQs={baseQs} />
          </div>
        ) : null}
      </div>
    );
  } catch (e) {
    return (
      <div className="rounded-[16px] border border-[#FF3B1F]/20 bg-[#FFF1EF] px-6 py-10 text-center">
        <p className="text-sm font-bold text-[#FF3B1F]">Falha ao carregar instituições</p>
        <p className="mt-1 text-sm text-[#0F1A2E]/60">{e instanceof Error ? e.message : "Tente novamente mais tarde."}</p>
        <Link href="/organizations" className="mt-4 inline-flex h-9 items-center rounded-full border border-[#0F1A2E]/10 bg-white px-4 text-sm font-semibold">
          Recarregar
        </Link>
      </div>
    );
  }
}

export default async function OrganizationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const locationParams = applyDefaultLocation(params, parseLocationCookies(await cookies()));
  const categoriesRes = await getCategories().catch(() => ({ data: [] as { id: string; name: string; slug: string }[] }));
  const categories = (categoriesRes as { data: { id: string; name: string; slug: string }[] }).data;
  void getTags();

  return (
    <div className="bg-[#F6F3EE]">
      <section className="border-b border-[#D9D2C2] bg-white">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2">
              <Link href="/" className="text-[#0F1A2E]/40 transition-colors hover:text-[#0F1A2E]">
                Início
              </Link>
              <span className="text-[#D9D2C2]">/</span>
              <span className="text-[#0B5E56]">{INSTITUTION_LABELS.navLabel}</span>
            </nav>
            <span className="hidden tabular-nums text-[#0F1A2E]/45 sm:block">
              {categories.length} categorias · 11 províncias
            </span>
          </div>

          <h1
            className="mt-2.5 font-black leading-[1.05] tracking-[-0.04em] text-[#0F1A2E]"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(19px, 2.4vw, 27px)" }}
          >
            Instituições que <span className="text-[#0B5E56]">estruturam</span> o mercado.
          </h1>

          <div className="mt-4 max-w-[860px]">
            <OrganizationsFilters
              categories={categories as { id: string; name: string; slug: string }[]}
              initialParams={params}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
        <div>
          <Suspense
            fallback={
              <div aria-busy="true" aria-live="polite">
                <span className="sr-only">A carregar instituições…</span>
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
            <InstitutionsList searchParams={locationParams} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}