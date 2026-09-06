import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { TaskView } from "@workdeal/shared";
import { getCategories } from "@/lib/profiles";
import { getPublicTasks, PROVINCES } from "@/lib/directory";
import { TaskCard } from "@/components/features/task-card";
import { DirectoryCommandBar } from "@/components/features/directory-command-bar";
import { applyDefaultLocation, parseLocationCookies } from "@/lib/location-consent";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Requisições — Workdeal",
  description: "Encontre pedidos de serviço em Moçambique: manutenção, construção, limpeza, tecnologia e mais. Veja os detalhes e envie a sua proposta.",
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
    return s ? `/tasks?${s}` : "/tasks";
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

type TasksLoaded = {
  data: TaskView[];
  total: number;
  catName: (id: string | null) => string | null;
  baseQs: URLSearchParams;
};

async function loadTasks(searchParams: Record<string, string | undefined>, page: number, limit: number): Promise<TasksLoaded> {
  const { data, meta } = await getPublicTasks({ ...searchParams, page: String(page), limit: String(limit) });
  const total = typeof meta?.total === "number" ? (meta.total as number) : data.length;
  const catsRes = await getCategories().catch(() => ({ data: [] as { id: string; name: string }[] }));
  const cats = (catsRes as { data: { id: string; name: string }[] }).data;
  const catName = (id: string | null) => (id ? cats.find((c) => c.id === id)?.name ?? null : null);

  const baseQs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") baseQs.set(k, v);
  return { data, total, catName, baseQs };
}

async function TasksList({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const limit = 12;

  let loaded: TasksLoaded;
  let error: string | null = null;
  try {
    loaded = await loadTasks(searchParams, page, limit);
  } catch (e) {
    loaded = { data: [], total: 0, catName: () => null, baseQs: new URLSearchParams() };
    error = e instanceof Error ? e.message : "Tente novamente mais tarde.";
  }
  const { data, total, catName, baseQs } = loaded;

  if (error) {
    return (
      <div className="rounded-[16px] border border-[#FF3B1F]/20 bg-[#FFF1EF] px-6 py-10 text-center">
        <p className="text-sm font-bold text-[#FF3B1F]">Falha ao carregar requisições</p>
        <p className="mt-1 text-sm text-[#0F1A2E]/60">{error}</p>
        <Link href="/tasks" className="mt-4 inline-flex h-9 items-center rounded-full border border-[#0F1A2E]/10 bg-white px-4 text-sm font-semibold">
          Recarregar
        </Link>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-[#D9D2C2] bg-white px-6 py-14 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#F6F3EE] border border-[#D9D2C2] px-3 py-1 text-xs font-bold tracking-widest text-[#0F1A2E]/60">
          <span className="size-1.5 rounded-full bg-[#FF3B1F]" /> NENHUM PEDIDO
        </p>
        <h3 className="mt-4 text-lg font-black tracking-tight text-[#0F1A2E]">Nenhuma requisição encontrada</h3>
        <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-[#0F1A2E]/60">Tente outra categoria ou província, ou volte mais tarde.</p>
        <Link href="/tasks" className="mt-5 inline-flex h-9 items-center rounded-full bg-[#0F1A2E] px-5 text-sm font-bold text-white hover:bg-black">
          Limpar filtros
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D2C2] pb-4">
        <p className="text-xs font-bold tracking-[0.14em] text-[#0B5E56]">
          {total} PEDIDOS • PÁGINA {page}
        </p>
        <p className="text-xs text-[#0F1A2E]/50">Actualizado a cada visita — dados em tempo real.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((task) => (
          <TaskCard key={task.id} task={task} categoryName={catName(task.categoryId)} />
        ))}
      </div>
      <div className="mt-8">
        <Pagination page={page} total={total} baseQs={baseQs} />
      </div>
    </>
  );
}

export default async function TasksPage({ searchParams }: Props) {
  const params = await searchParams;
  const locationParams = applyDefaultLocation(params, parseLocationCookies(await cookies()));
  const categoriesRes = await getCategories().catch(() => ({ data: [] as { id: string; name: string }[] }));
  const categories = (categoriesRes as { data: { id: string; name: string }[] }).data;

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
          {/* índice — breadcrumb + contagem */}
          <div className="flex items-center justify-between gap-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2">
              <Link href="/" className="text-[#0F1A2E]/40 transition-colors hover:text-[#0F1A2E]">
                Início
              </Link>
              <span className="text-[#D9D2C2]">/</span>
              <span className="text-[#0B5E56]">Requisições</span>
            </nav>
            <span className="hidden tabular-nums text-[#0F1A2E]/45 sm:block">
              {categories.length} categorias · 11 províncias
            </span>
          </div>

          <div className="mt-2.5 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10">
            <div>
              <h1 className="font-black leading-[1.05] tracking-[-0.04em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(19px, 2.4vw, 27px)" }}>
                Pedidos de serviço.{" "}
                <span className="font-normal text-[#0B5E56]">Milhares de negócios à espera de fornecedores.</span>
              </h1>
              <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-[#0F1A2E]/60">
                Empresas públicas e privadas publicam aqui o que precisam — obras, manutenção, tecnologia, logística. Veja os detalhes e envie a sua proposta.
              </p>
            </div>

            {/* acção principal — quem tem trabalho publica */}
            <div className="flex flex-col items-start gap-2.5 lg:items-end lg:text-right">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#0B5E56]">PRECISA DE UM SERVIÇO?</p>
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#FF3B1F] px-6 text-[13px] font-bold text-white transition-colors hover:bg-[#E8350F]"
              >
                Publicar um pedido
              </Link>
              <p className="max-w-[280px] text-[12px] leading-relaxed text-[#0F1A2E]/50">
                Sem custo e publicado em minutos — os fornecedores respondem directamente.
              </p>
            </div>
          </div>

            {/* command bar — pesquisa + categoria + filtros */}
            <div className="mt-5 max-w-[860px]">
              <DirectoryCommandBar
                basePath="/tasks"
                placeholder="Pesquisar por pedido de serviço…"
                searchLabel="Pesquisar requisição"
                drawerEyebrow="REQUISIÇÕES"
                drawerTitle="Filtros de requisições"
                categories={categories as { id: string; name: string; slug: string }[]}
                initialParams={params}
                showCategoryQuickSelect={false}
                sections={[
                  {
                    kind: "radio",
                    label: "ESTADO",
                    param: "status",
                    allLabel: "Todas as requisições",
                    options: [
                      { value: "open", label: "A aceitar propostas" },
                      { value: "in_progress", label: "Em execução" },
                      { value: "completed", label: "Concluídas" },
                    ],
                  },
                  {
                    kind: "radio",
                    label: "LOCALIZAÇÃO",
                    param: "province",
                    allLabel: "Todas as províncias",
                    options: PROVINCES.map((p) => ({ value: p, label: p })),
                  },
                  {
                    kind: "range",
                    label: "ORÇAMENTO (MT)",
                    minParam: "priceMin",
                    maxParam: "priceMax",
                    minLabel: "Mínimo",
                    maxLabel: "Máximo",
                    unit: "MT",
                  },
                  {
                    kind: "multi",
                    label: "CATEGORIAS",
                    param: "categories",
                    allLabel: "Todas as categorias",
                    options: categories.map((c) => ({ value: c.id, label: c.name })),
                  },
                ]}
              />
            </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
        <Suspense
          fallback={
            <div aria-busy="true" aria-live="polite">
              <span className="sr-only">A carregar requisições…</span>
              <div className="mb-4 h-4 w-48 animate-pulse rounded-full bg-[#0B5E56]/15" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
                    <div className="h-4 w-32 animate-pulse rounded-full bg-[#F6F3EE]" />
                    <div className="mt-3 h-6 w-3/4 animate-pulse rounded bg-[#F6F3EE]" />
                    <div className="mt-2 h-3 w-full animate-pulse rounded bg-[#F6F3EE]/80" />
                    <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#F6F3EE]/80" />
                    <div className="mt-4 h-9 w-full animate-pulse rounded-full bg-[#F6F3EE]" />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <TasksList searchParams={locationParams} />
        </Suspense>
      </section>
    </div>
  );
}