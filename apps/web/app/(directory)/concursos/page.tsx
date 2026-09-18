import Link from "next/link";
import { Suspense, type ComponentProps } from "react";
import type { Metadata } from "next";
import type { TenderView } from "@workdeal/shared";
import { getPublicTenders, TENDER_CATEGORY_LABELS, TENDER_TYPE_LABELS, tenderFacetLabel } from "@/lib/tenders";
import { TenderCard } from "@/components/features/tender-card";
import { DirectoryCommandBar } from "@/components/features/directory-command-bar";

type CommandBarSections = ComponentProps<typeof DirectoryCommandBar>["sections"];

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Concursos Públicos",
  description: "Concursos e anúncios públicos em Moçambique: obras, fornecimento de bens e serviços, pré-qualificações e consultoria — agregados a partir do portal UFSA.",
  alternates: { canonical: "/concursos" },
  openGraph: { title: "Concursos Públicos", type: "website" },
};

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
    return s ? `/concursos?${s}` : "/concursos";
  };
  return (
    <div className="flex items-center justify-between border-t border-[#D9D2C2] pt-6">
      <Link
        href={makeHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-[#D9D2C2] bg-white text-[#0F1A2E]/30" : "border-[#0F1A2E] bg-[#0F1A2E] text-white hover:bg-black"}`}
      >
        ← Anterior
      </Link>
      <span className="hidden font-mono text-[11px] font-bold uppercase tracking-widest text-[#0F1A2E]/40 sm:block">
        Página {page} de {totalPages}
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

type TendersLoaded = {
  data: TenderView[];
  total: number;
  baseQs: URLSearchParams;
};

type TenderFacetRow = { value: string; count: number };
type TenderFacets = {
  province?: TenderFacetRow[];
  categories?: TenderFacetRow[];
  types?: TenderFacetRow[];
  state?: { open: number; closed: number };
};

async function loadTenders(searchParams: Record<string, string | undefined>, page: number, limit: number): Promise<TendersLoaded> {
  const { data, meta } = await getPublicTenders({
    ...searchParams,
    page: String(page),
    limit: String(limit),
  });
  const total = typeof meta?.total === "number" ? (meta.total as number) : data.length;

  const baseQs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") baseQs.set(k, v);
  return { data, total, baseQs };
}

/** Facets para o painel de filtros — uma página com limit=1 é suficiente para trazer as agregações. */
async function loadFacets(searchParams: Record<string, string | undefined>): Promise<TenderFacets | null> {
  try {
    const { meta } = await getPublicTenders({ ...searchParams, page: "1", limit: "1" });
    return (meta?.facets as TenderFacets | undefined) ?? null;
  } catch {
    return null;
  }
}

function withActiveOptions(
  rows: TenderFacetRow[] | undefined,
  activeValues: string[],
  labelOf: (v: string) => string,
): { value: string; label: string }[] {
  const options = (rows ?? []).map((r) => ({ value: r.value, label: `${labelOf(r.value)} (${r.count})` }));
  for (const a of activeValues) {
    if (a && !options.some((o) => o.value === a)) options.push({ value: a, label: `${labelOf(a)} (0)` });
  }
  return options;
}

function buildTenderSections(facets: TenderFacets | null, params: Record<string, string | undefined>): CommandBarSections {
  const state = facets?.state;
  const sections: CommandBarSections = [];

  if (state) {
    sections.push({
      kind: "radio",
      label: "ESTADO",
      param: "state",
      allLabel: "Todos os concursos",
      options: [
        { value: "open", label: `Abertos · a receber propostas (${state.open})` },
        { value: "closed", label: `Encerrados (${state.closed})` },
      ],
    });
  }

  sections.push({
    kind: "multi",
    label: "CATEGORIA",
    param: "categories",
    allLabel: "Todas as categorias",
    options: withActiveOptions(
      facets?.categories,
      (params.categories ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      (v) => tenderFacetLabel(TENDER_CATEGORY_LABELS, v),
    ),
  });

  sections.push({
    kind: "multi",
    label: "MODALIDADE",
    param: "types",
    allLabel: "Todas as modalidades",
    options: withActiveOptions(
      facets?.types,
      (params.types ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      (v) => tenderFacetLabel(TENDER_TYPE_LABELS, v),
    ),
  });

  sections.push({
    kind: "radio",
    label: "PROVÍNCIA",
    param: "province",
    allLabel: "Todas as províncias",
    options: withActiveOptions(
      facets?.province,
      params.province ? [params.province] : [],
      (v) => v,
    ),
  });

  return sections;
}

async function TendersList({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const limit = 12;

  let loaded: TendersLoaded;
  let error: string | null = null;
  try {
    loaded = await loadTenders(searchParams, page, limit);
  } catch (e) {
    loaded = { data: [], total: 0, baseQs: new URLSearchParams() };
    error = e instanceof Error ? e.message : "Tente novamente mais tarde.";
  }
  const { data, total, baseQs } = loaded;

  if (error) {
    return (
      <div className="rounded-[16px] border border-[#FF3B1F]/20 bg-[#FFF1EF] px-6 py-10 text-center">
        <p className="text-sm font-bold text-[#FF3B1F]">Falha ao carregar concursos</p>
        <p className="mt-1 text-sm text-[#0F1A2E]/60">{error}</p>
        <Link href="/concursos" className="mt-4 inline-flex h-9 items-center rounded-full border border-[#0F1A2E]/10 bg-white px-4 text-sm font-semibold">
          Recarregar
        </Link>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-[#D9D2C2] bg-white px-6 py-14 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#F6F3EE] border border-[#D9D2C2] px-3 py-1 text-xs font-bold tracking-widest text-[#0F1A2E]/60">
          <span className="size-1.5 rounded-full bg-[#FF3B1F]" /> NENHUM CONCURSO
        </p>
        <h3 className="mt-4 text-lg font-black tracking-tight text-[#0F1A2E]">Nenhum concurso encontrado</h3>
        <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-[#0F1A2E]/60">Tente outra província ou termo de pesquisa, ou volte mais tarde.</p>
        <Link href="/concursos" className="mt-5 inline-flex h-9 items-center rounded-full bg-[#0F1A2E] px-5 text-sm font-bold text-white hover:bg-black">
          Limpar filtros
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D2C2] pb-4">
        <p className="text-xs font-bold tracking-[0.14em] text-[#0B5E56]">
          {total} CONCURSOS PÚBLICOS • PÁGINA {page}
        </p>
        <p className="text-xs text-[#0F1A2E]/50">Fonte: portal UFSA · atualizado automaticamente.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((tender) => (
          <TenderCard key={tender.id} tender={tender} />
        ))}
      </div>
      <Pagination page={page} total={total} baseQs={baseQs} />
    </>
  );
}

export default async function ConcursosPage({ searchParams }: Props) {
  const params = await searchParams;
  const facets = await loadFacets(params);
  const sections = buildTenderSections(facets, params);

  return (
    <div className="bg-[#F6F3EE]">
      <section className="relative overflow-hidden border-b border-[#D9D2C2] bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to right, #0F1A2E 1px, transparent 1px), linear-gradient(to bottom, #0F1A2E 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2">
              <Link href="/" className="text-[#0F1A2E]/40 transition-colors hover:text-[#0F1A2E]">
                Início
              </Link>
              <span className="text-[#D9D2C2]">/</span>
              <span className="text-[#0B5E56]">Concursos Públicos</span>
            </nav>
            <span className="hidden tabular-nums text-[#0F1A2E]/45 sm:block">UFSA · Moçambique</span>
          </div>

          <div className="mt-2.5">
            <h1
              className="font-black leading-[1.05] tracking-[-0.04em] text-[#0F1A2E]"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(19px, 2.4vw, 27px)" }}
            >
              Concursos públicos.{" "}
              <span className="font-normal text-[#0B5E56]">Oportunidades abertas e avisos do Estado.</span>
            </h1>
            <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-[#0F1A2E]/60">
              Concursos de obras, fornecimento de bens e serviços, pré-qualificações e consultoria — agregados a partir do portal da UFSA. Sem cadastro para consultar.
            </p>

            <div className="mt-5 max-w-[860px]">
              <DirectoryCommandBar
                basePath="/concursos"
                placeholder="Pesquisar por concurso…"
                searchLabel="Pesquisar concurso"
                drawerEyebrow="CONCURSOS"
                drawerTitle="Filtros de concursos"
                categories={[]}
                initialParams={params}
                preserveParams={[]}
                showCategoryQuickSelect={false}
                sections={sections}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
        <Suspense
          fallback={
            <div aria-busy="true" aria-live="polite">
              <span className="sr-only">A carregar concursos…</span>
              <div className="mb-4 h-4 w-48 animate-pulse rounded-full bg-[#0B5E56]/15" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-[20px] border border-[#D9D2C2] bg-white">
                    <div className="h-11 border-b border-[#D9D2C2]/60 bg-[#F6F3EE]" />
                    <div className="p-5">
                      <div className="h-5 w-3/4 animate-pulse rounded bg-[#F6F3EE]" />
                      <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-[#F6F3EE]/80" />
                      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#F6F3EE]/80" />
                      <div className="mt-4 h-9 w-full animate-pulse rounded-full bg-[#F6F3EE]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <TendersList searchParams={params} />
        </Suspense>
      </section>
    </div>
  );
}