"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  categories: { id: string; name: string; slug: string }[];
  initialParams: Record<string, string | undefined>;
};

export function CompaniesFilters({ categories, initialParams }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialParams.q ?? "");
  const [categoryId, setCategoryId] = useState(initialParams.categoryId ?? "");
  const [sort, setSort] = useState(initialParams.sort ?? "recent");
  const [radiusKm, setRadiusKm] = useState(initialParams.radiusKm ?? "25");
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const near = initialParams.near ?? "";
  const hasNear = Boolean(near);

  const selectedCatName = useMemo(() => categories.find((c) => c.id === categoryId)?.name ?? "", [categories, categoryId]);
  const filteredCats = useMemo(() => {
    const ql = catQuery.trim().toLowerCase();
    if (!ql) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(ql) || c.slug.toLowerCase().includes(ql));
  }, [categories, catQuery]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCatOpen(false);
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function buildQuery(overrides: Record<string, string | undefined> = {}) {
    const params = new URLSearchParams();
    const next: Record<string, string | undefined> = {
      q: q.trim() || undefined,
      categoryId: categoryId || undefined,
      sort: sort || undefined,
      near: near || undefined,
      radiusKm: hasNear ? radiusKm : undefined,
      ...overrides,
    };
    // overrides can explicitly clear by setting undefined
    for (const [k, v] of Object.entries({ ...next })) {
      if (v) params.set(k, v);
    }
    // if category cleared via overrides, remove it
    if (overrides.categoryId === undefined && next.categoryId === undefined) params.delete("categoryId");
    if (overrides.near === "") params.delete("near");
    // keep page reset to 1 on filter change
    params.delete("page");
    return params.toString();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qs = buildQuery();
    router.push(qs ? `/companies?${qs}` : "/companies");
  }

  function onNearby() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const n = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
        const params = new URLSearchParams(window.location.search);
        params.set("near", n);
        params.set("radiusKm", radiusKm || "25");
        params.set("sort", "distance");
        params.delete("page");
        router.push(`/companies?${params.toString()}`);
      },
      () => {}
    );
  }

  function clearNear() {
    const params = new URLSearchParams(window.location.search);
    params.delete("near");
    params.delete("radiusKm");
    if (params.get("sort") === "distance") params.set("sort", "recent");
    router.push(params.toString() ? `/companies?${params.toString()}` : "/companies");
  }

  function clearAll() {
    setQ("");
    setCategoryId("");
    setSort("recent");
    router.push("/companies");
  }

  const sortOptions = [
    { value: "recent", label: "Mais recentes" },
    { value: "name", label: "Nome A-Z" },
    { value: "distance", label: "Distância" },
  ];
  const sortLabel = sortOptions.find((o) => o.value === sort)?.label ?? "Mais recentes";
  const radii = ["5", "10", "25", "50", "100"];

  const activeCount = [q.trim(), categoryId, hasNear ? "near" : "", sort !== "recent" ? sort : ""].filter(Boolean).length;

  return (
    <form onSubmit={onSubmit} className="rounded-[16px] border border-[#D9D2C2] bg-white p-3 shadow-[0_8px_24px_rgba(15,26,46,0.06)]" aria-label="Company filters">

      {/* row 1 — pesquisa w-full */}
      <label className="flex w-full items-center gap-2 rounded-[10px] bg-[#F6F3EE] px-3 py-2.5">
        <span className="shrink-0 text-[#0F1A2E]/40" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Que empresa procura? ex: construção, electricidade, nome"
          aria-label="Pesquisar empresa"
          className="w-full bg-transparent text-[14px] placeholder:text-[#0F1A2E]/35 focus:outline-none"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Limpar pesquisa" className="shrink-0 rounded-full p-1 text-[#0F1A2E]/30 hover:bg-[#0F1A2E]/5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </label>

      {/* row 2 — categoria combobox + ordenação + acções */}
      <div className="mt-2 flex w-full flex-col gap-2 lg:flex-row lg:items-center">
        {/* categoria combobox */}
        <div ref={catRef} className="relative flex-1">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={catOpen}
            onClick={() => setCatOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-[10px] border border-[#D9D2C2] bg-white px-3 py-2.5 text-left"
          >
            <span className="shrink-0 rounded bg-[#0B5E56] px-1.5 py-0.5 text-[10px] font-black tracking-widest text-white">CAT</span>
            <span className={`flex-1 truncate text-sm ${selectedCatName ? "text-[#0F1A2E]" : "text-[#0F1A2E]/40"}`}>{selectedCatName || "Todas categorias"}</span>
            <span className={`shrink-0 text-[#0F1A2E]/30 transition-transform ${catOpen ? "rotate-180" : ""}`} aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>
          {catOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[12px] border border-[#D9D2C2] bg-white shadow-[0_12px_32px_rgba(15,26,46,0.12)]">
              <div className="border-b border-[#D9D2C2] p-2">
                <label className="flex items-center gap-2 rounded-[8px] bg-[#F6F3EE] px-2.5 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-[#0F1A2E]/30">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                  <input autoFocus value={catQuery} onChange={(e) => setCatQuery(e.target.value)} placeholder="Filtrar categoria…" className="w-full bg-transparent text-sm placeholder:text-[#0F1A2E]/30 focus:outline-none" />
                </label>
              </div>
              <ul role="listbox" className="max-h-[220px] overflow-auto p-1.5">
                <li
                  role="option"
                  aria-selected={!categoryId}
                  onClick={() => {
                    setCategoryId("");
                    setCatOpen(false);
                    setCatQuery("");
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${!categoryId ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE]"}`}
                >
                  <span>Todas categorias</span>
                  {!categoryId && <span>✓</span>}
                </li>
                {filteredCats.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-[#0F1A2E]/40">Nenhuma categoria</li>
                ) : (
                  filteredCats.map((c) => (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={categoryId === c.id}
                      onClick={() => {
                        setCategoryId(c.id);
                        setCatOpen(false);
                        setCatQuery("");
                      }}
                      className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${categoryId === c.id ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE]"}`}
                    >
                      <span className="truncate">{c.name}</span>
                      {categoryId === c.id && <span>✓</span>}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* ordenação */}
        <div ref={sortRef} className="relative w-full lg:w-[190px] lg:shrink-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-[10px] border border-[#D9D2C2] bg-white px-3 py-2.5 text-left"
          >
            <span className="shrink-0 text-[11px] font-bold tracking-widest text-[#0F1A2E]/40">ORD</span>
            <span className="flex-1 truncate text-sm text-[#0F1A2E]">{sortLabel}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`shrink-0 text-[#0F1A2E]/30 transition-transform ${sortOpen ? "rotate-180" : ""}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {sortOpen && (
            <ul role="listbox" className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[12px] border border-[#D9D2C2] bg-white p-1.5 shadow-[0_12px_32px_rgba(15,26,46,0.12)]">
              {sortOptions.map((o) => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={sort === o.value}
                  onClick={() => {
                    setSort(o.value);
                    setSortOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${sort === o.value ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE]"}`}
                >
                  <span>{o.label}</span>
                  {sort === o.value && <span>✓</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2 lg:shrink-0">
          <button type="submit" className="flex flex-1 items-center justify-center rounded-full bg-[#0F1A2E] px-6 text-sm font-bold text-white hover:bg-black lg:flex-none h-10">
            Aplicar
          </button>
          <button type="button" onClick={onNearby} className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap ${hasNear ? "border-[#0B5E56] bg-[#0B5E56] text-white" : "border-[#0F1A2E]/10 bg-white text-[#0F1A2E] hover:bg-[#F6F3EE]"}`}>
            {hasNear ? "✓ Perto de mim" : "Perto de mim"}
          </button>
        </div>
      </div>

      {/* row 3 — raio + chips activos */}
      {(hasNear || activeCount > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#D9D2C2] pt-3">
          {hasNear && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-widest text-[#0F1A2E]/40">RAIO</span>
              {radii.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRadiusKm(r);
                    const params = new URLSearchParams(window.location.search);
                    params.set("radiusKm", r);
                    if (!params.get("near")) return;
                    router.push(`/companies?${params.toString()}`);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${radiusKm === r ? "border-[#0F1A2E] bg-[#0F1A2E] text-white" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"}`}
                >
                  {r} km
                </button>
              ))}
              <button type="button" onClick={clearNear} className="ml-1 text-xs font-semibold text-[#FF3B1F] hover:underline">
                limpar localização
              </button>
            </div>
          )}

          <span className="hidden h-4 w-px bg-[#D9D2C2] sm:block" aria-hidden />

          <div className="flex flex-wrap items-center gap-1.5">
            {q.trim() && <span className="inline-flex items-center gap-1 rounded-full bg-[#F6F3EE] border border-[#D9D2C2] px-2.5 py-1 text-xs">“{q.trim()}”</span>}
            {selectedCatName && <span className="inline-flex rounded-full bg-[#0B5E56] px-2.5 py-1 text-xs font-semibold text-white">{selectedCatName}</span>}
            {hasNear && <span className="inline-flex rounded-full bg-[#0F1A2E] px-2.5 py-1 text-xs font-semibold text-white">{near.slice(0, 16)}… • {radiusKm}km</span>}
            {sort !== "recent" && <span className="inline-flex rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-xs">{sortLabel}</span>}
          </div>

          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="ml-auto inline-flex h-7 items-center rounded-full border border-[#0F1A2E]/10 bg-white px-3 text-xs font-semibold hover:bg-[#F6F3EE]">
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </form>
  );
}

// Deprecated alias — manter até todos os imports migrarem para CompaniesFilters
export { CompaniesFilters as EmpresasFilters };
