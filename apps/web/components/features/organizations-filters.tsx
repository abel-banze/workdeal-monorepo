"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FiSearch, FiFilter, FiX, FiSliders, FiChevronDown } from "react-icons/fi";
import { INSTITUTION_TYPES, institutionTypeLabels, PROVINCES } from "@workdeal/shared";

type Category = { id: string; name: string; slug: string };

type Props = {
  categories: Category[];
  initialParams: Record<string, string | undefined>;
};

type FiltersState = {
  q: string;
  organizationType: string;
  categoryId: string;
  province: string;
  sort: string;
};

const SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "name", label: "Nome (A–Z)" },
  { value: "members", label: "Mais membros" },
  { value: "distance", label: "Proximidade" },
];

function parseInitial(params: Record<string, string | undefined>): FiltersState {
  return {
    q: params.q ?? "",
    organizationType: params.organizationType ?? "",
    categoryId: params.categoryId ?? "",
    province: params.province ?? "",
    sort: params.sort ?? "recent",
  };
}

const SELECT_BASE =
  "h-10 rounded-full border border-[#D9D2C2] bg-white px-3.5 text-sm font-medium text-[#0F1A2E]/80 focus:border-[#0B5E56]/40 focus:outline-none focus:ring-2 focus:ring-[#0B5E56]/15";

export function OrganizationsFilters({ categories, initialParams }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(() => parseInitial(initialParams));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeCount = [
    filters.organizationType,
    filters.categoryId,
    filters.province,
  ].filter(Boolean).length;

  const apply = useCallback(
    (f: FiltersState, clear = false) => {
      const search = new URLSearchParams();
      if (f.q.trim()) search.set("q", f.q.trim());
      if (f.organizationType) search.set("organizationType", f.organizationType);
      if (f.categoryId) search.set("categoryId", f.categoryId);
      if (f.province) search.set("province", f.province);
      if (f.sort && f.sort !== "recent") search.set("sort", f.sort);
      const near = initialParams.near;
      const radiusKm = initialParams.radiusKm;
      if (!clear && near) {
        search.set("near", near);
        if (radiusKm) search.set("radiusKm", radiusKm);
      }
      if (!clear && initialParams.nearLabel) search.set("nearLabel", initialParams.nearLabel);
      const qs = search.toString();
      router.push(qs ? `/organizations?${qs}` : "/organizations");
    },
    [router, initialParams.near, initialParams.radiusKm, initialParams.nearLabel],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    apply(filters);
  };

  const onResetFilters = () => {
    const cleared = { ...filters, organizationType: "", categoryId: "", province: "" };
    setFilters(cleared);
    setDrawerOpen(false);
    apply(cleared);
  };

  const onClearAll = () => {
    const cleared = { q: "", organizationType: "", categoryId: "", province: "", sort: "recent" };
    setFilters(cleared);
    apply(cleared, true);
  };

  const onChangeField = (key: keyof FiltersState, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    apply(next);
  };

  return (
    <div className="space-y-3">
      {/* command bar */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={onSubmit} className="relative min-w-0 flex-1">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#0F1A2E]/40" aria-hidden />
          <input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Procurar instituições…"
            className="h-10 w-full rounded-full border border-[#D9D2C2] bg-white pl-10 pr-4 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56]/40 focus:outline-none focus:ring-2 focus:ring-[#0B5E56]/15"
            aria-label="Pesquisar instituições"
          />
          <button
            type="submit"
            className="absolute right-1 top-1/2 inline-flex h-8 -translate-y-1/2 items-center rounded-full bg-[#0F1A2E] px-4 text-xs font-bold text-white hover:bg-black"
          >
            Pesquisar
          </button>
        </form>

        <div className="relative min-w-[180px]">
          <select
            value={filters.organizationType}
            onChange={(e) => onChangeField("organizationType", e.target.value)}
            className={`${SELECT_BASE} w-full appearance-none pr-8`}
            aria-label="Tipo de instituição"
          >
            <option value="">Tipo de instituição</option>
            {INSTITUTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {institutionTypeLabels[t]}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#0F1A2E]/40" aria-hidden />
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
            drawerOpen ? "border-[#0B5E56] bg-[#0B5E56] text-white" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/70 hover:border-[#0F1A2E]/30"
          }`}
        >
          <FiSliders className="size-3.5" aria-hidden />
          Filtros
          {activeCount > 0 ? <span className="rounded-full bg-[#FF3B1F] px-1.5 text-[10px] font-black text-white">{activeCount}</span> : null}
        </button>

        {(filters.q || activeCount > 0 || (filters.sort !== "recent")) ? (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#FF3B1F]/25 bg-[#FFF1EF] px-3.5 text-xs font-bold text-[#FF3B1F] hover:bg-[#FFE3DE]"
          >
            <FiX className="size-3.5" aria-hidden /> Limpar
          </button>
        ) : null}
      </div>

      {/* drawer — filtros avançados */}
      {drawerOpen ? (
        <div className="rounded-2xl border border-[#D9D2C2] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">
              <FiFilter className="size-3.5" aria-hidden /> Filtros
            </p>
            <button type="button" onClick={onResetFilters} className="text-xs font-bold text-[#FF3B1F] hover:underline">
              Reiniciar filtros
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">
                Categoria
              </label>
              <select
                value={filters.categoryId}
                onChange={(e) => onChangeField("categoryId", e.target.value)}
                className={`${SELECT_BASE} w-full appearance-none`}
                aria-label="Categoria"
              >
                <option value="">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">
                Província
              </label>
              <select
                value={filters.province}
                onChange={(e) => onChangeField("province", e.target.value)}
                className={`${SELECT_BASE} w-full appearance-none`}
                aria-label="Província"
              >
                <option value="">Todas as províncias</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">
                Ordenar
              </label>
              <select
                value={filters.sort}
                onChange={(e) => onChangeField("sort", e.target.value)}
                className={`${SELECT_BASE} w-full appearance-none`}
                aria-label="Ordenação"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {initialParams.near ? (
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-4 text-sm font-semibold text-[#0F1A2E]/70"
                >
                  <FiX className="size-3.5" aria-hidden /> Remover proximidade
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

