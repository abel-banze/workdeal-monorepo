import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getCategories } from "@/lib/profiles";
import { getPublicEvents, PROVINCES, type PublicEventView } from "@/lib/directory";
import { EventCard } from "@/components/features/event-card";
import { applyDefaultLocation, parseLocationCookies } from "@/lib/location-consent";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Eventos — Workdeal",
  description: "Feiras, seminários, lançamentos e networking para empresas em Moçambique. Inscreva-se gratuitamente na plataforma Workdeal.",
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
    return s ? `/events?${s}` : "/events";
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

type EventsLoaded = {
  data: PublicEventView[];
  total: number;
  catName: (id: string | null) => string | null;
  baseQs: URLSearchParams;
  scope: "upcoming" | "all";
};

async function loadEvents(searchParams: Record<string, string | undefined>, page: number, limit: number): Promise<EventsLoaded> {
  const scope = searchParams.scope === "all" ? "all" : "upcoming";
  const { data, meta } = await getPublicEvents({
    ...searchParams,
    ...(scope === "upcoming" ? { upcoming: "true" } : { upcoming: "" }),
    page: String(page),
    limit: String(limit),
  });
  const total = typeof meta?.total === "number" ? (meta.total as number) : data.length;
  const catsRes = await getCategories().catch(() => ({ data: [] as { id: string; name: string }[] }));
  const cats = (catsRes as { data: { id: string; name: string }[] }).data;
  const catName = (id: string | null) => (id ? cats.find((c) => c.id === id)?.name ?? null : null);

  const baseQs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") baseQs.set(k, v);
  return { data, total, catName, baseQs, scope };
}

async function EventsList({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const limit = 12;

  let loaded: EventsLoaded;
  let error: string | null = null;
  try {
    loaded = await loadEvents(searchParams, page, limit);
  } catch (e) {
    loaded = { data: [], total: 0, catName: () => null, baseQs: new URLSearchParams(), scope: "upcoming" };
    error = e instanceof Error ? e.message : "Tente novamente mais tarde.";
  }
  const { data, total, catName, baseQs, scope } = loaded;

  if (error) {
    return (
      <div className="rounded-[16px] border border-[#FF3B1F]/20 bg-[#FFF1EF] px-6 py-10 text-center">
        <p className="text-sm font-bold text-[#FF3B1F]">Falha ao carregar eventos</p>
        <p className="mt-1 text-sm text-[#0F1A2E]/60">{error}</p>
        <Link href="/events" className="mt-4 inline-flex h-9 items-center rounded-full border border-[#0F1A2E]/10 bg-white px-4 text-sm font-semibold">
          Recarregar
        </Link>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-[#D9D2C2] bg-white px-6 py-14 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#F6F3EE] border border-[#D9D2C2] px-3 py-1 text-xs font-bold tracking-widest text-[#0F1A2E]/60">
          <span className="size-1.5 rounded-full bg-[#FF3B1F]" /> NENHUM EVENTO
        </p>
        <h3 className="mt-4 text-lg font-black tracking-tight text-[#0F1A2E]">Nenhum evento encontrado</h3>
        <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-[#0F1A2E]/60">Tente outra categoria ou província, ou volte mais tarde.</p>
        <Link href="/events" className="mt-5 inline-flex h-9 items-center rounded-full bg-[#0F1A2E] px-5 text-sm font-bold text-white hover:bg-black">
          Limpar filtros
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D2C2] pb-4">
        <p className="text-xs font-bold tracking-[0.14em] text-[#0B5E56]">
          {total} {scope === "upcoming" ? "PRÓXIMOS EVENTOS" : "EVENTOS"} • PÁGINA {page}
        </p>
        <p className="text-xs text-[#0F1A2E]/50">Inscrições gratuitas com uma conta Workdeal.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((ev) => (
          <EventCard key={ev.id} event={ev} categoryName={catName(ev.categoryId)} allowPast={scope === "all"} />
        ))}
      </div>
      <Pagination page={page} total={total} baseQs={baseQs} />
    </>
  );
}

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const locationParams = applyDefaultLocation(params, parseLocationCookies(await cookies()));
  const scope = params.scope === "all" ? "all" : "upcoming";
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
        <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.14em]">
            <Link href="/" className="text-[#0F1A2E]/40 hover:text-[#0F1A2E]">
              Início
            </Link>
            <span className="text-[#D9D2C2]">/</span>
            <span className="text-[#0B5E56]">EVENTOS</span>
          </div>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <h1 className="font-black tracking-[-0.05em] leading-[0.9] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4.5vw, 44px)" }}>
                Agendas de negócios.
                <br />
                <span className="font-normal text-[#0F1A2E]/70">Feiras, lançamentos e networking.</span>
              </h1>
              <p className="mt-3 max-w-[560px] text-[14px] leading-relaxed text-[#0F1A2E]/60">
                Siga os próximos eventos do ecossistema Workdeal e inscreva-se em segundos. Presença confirmada, networking real.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Link
                  href="/events"
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${scope === "upcoming" ? "border-[#0F1A2E] bg-[#0F1A2E] text-white" : "border-[#0F1A2E]/10 bg-white text-[#0F1A2E]/70 hover:bg-[#0F1A2E] hover:text-white"}`}
                >
                  Próximos
                </Link>
                <Link
                  href={`/events?${new URLSearchParams({ scope: "all" }).toString()}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${scope === "all" ? "border-[#0F1A2E] bg-[#0F1A2E] text-white" : "border-[#0F1A2E]/10 bg-white text-[#0F1A2E]/70 hover:bg-[#0F1A2E] hover:text-white"}`}
                >
                  Todos
                </Link>
                <Link href="/signup" className="rounded-full bg-[#FF3B1F] px-3 py-1 text-xs font-bold text-white hover:bg-[#E8350F]">
                  Organizar um evento
                </Link>
              </div>
            </div>

            <div className="rounded-[20px] border border-[#D9D2C2] bg-[#F6F3EE] p-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">FILTRAR</p>
              <p className="mt-2 text-sm font-black text-[#0F1A2E]">Categoria</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Link
                  href={`/events${params.scope === "all" ? "?scope=all" : ""}`}
                  className={`rounded-full border border-[#D9D2C2] bg-white px-3 py-1 text-xs font-medium ${!params.categoryId ? "bg-[#0F1A2E] !border-[#0F1A2E] text-white" : "text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"}`}
                >
                  Todas
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/events?${new URLSearchParams({ categoryId: c.id, ...(params.scope === "all" ? { scope: "all" } : {}) }).toString()}`}
                    className={`rounded-full border border-[#D9D2C2] bg-white px-3 py-1 text-xs font-medium ${
                      params.categoryId === c.id ? "bg-[#0F1A2E] !border-[#0F1A2E] text-white" : "text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"
                    }`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
              <p className="mt-5 text-sm font-black text-[#0F1A2E]">Província</p>
              <form method="get" className="mt-3 flex items-center gap-2">
                {scope === "all" ? <input type="hidden" name="scope" value="all" /> : null}
                <select
                  name="province"
                  defaultValue={params.province ?? ""}
                  className="flex-1 rounded-xl border border-[#D9D2C2] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B5E56]"
                >
                  <option value="">Todas as províncias</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button type="submit" className="inline-flex h-9 items-center rounded-full bg-[#0B5E56] px-4 text-xs font-bold text-white hover:bg-[#094d46]">
                  Aplicar
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
        <Suspense
          fallback={
            <div aria-busy="true" aria-live="polite">
              <span className="sr-only">A carregar eventos…</span>
              <div className="mb-4 h-4 w-48 animate-pulse rounded-full bg-[#0B5E56]/15" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white">
                    <div className="h-40 animate-pulse bg-[#F6F3EE]" />
                    <div className="p-5">
                      <div className="h-3 w-40 animate-pulse rounded bg-[#F6F3EE]" />
                      <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-[#F6F3EE]" />
                      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#F6F3EE]/80" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <EventsList searchParams={locationParams} />
        </Suspense>
      </section>
    </div>
  );
}