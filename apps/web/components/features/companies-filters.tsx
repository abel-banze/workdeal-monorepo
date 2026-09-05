"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocationSearchBox } from "@/components/features/location-search";
import { PROVINCES } from "@workdeal/shared";
import { sizeLabel } from "@workdeal/shared/lib/company-size";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";

type Props = {
  categories: { id: string; name: string; slug: string }[];
  initialParams: Record<string, string | undefined>;
};

const BADGES = [
  { slug: "verified", label: "Verificada" },
  { slug: "in-legalization", label: "Em legalização" },
  { slug: "highly-rated", label: "Bem avaliada" },
  { slug: "quick-response", label: "Resposta rápida" },
  { slug: "profile-complete", label: "Perfil completo" },
  { slug: "msme", label: "MPME" },
  { slug: "active-member", label: "Membro activo" },
];

const DIMENSIONS = [
  { value: "micro", label: sizeLabel("micro") },
  { value: "pequena", label: sizeLabel("pequena") },
  { value: "media", label: sizeLabel("media") },
  { value: "grande", label: sizeLabel("grande") },
];

const IDENTITIES = [
  { value: "verified", label: "Registadas / verificadas" },
  { value: "in_review", label: "Em processo" },
  { value: "pre_registered", label: "Não registadas" },
];

const NOW_YEAR = new Date().getFullYear();

// Anos de experiência (mínimos cumulativos): empresas com PELO MENOS X anos no
// mercado — o valor é o limiar de anos; experiência >= X  =>  fundada em <= (ano - X).
const EXPERIENCE_OPTIONS = [
  { value: "1", label: "1 ano" },
  { value: "3", label: "até 3 anos" },
  { value: "5", label: "até 5 anos" },
  { value: "10", label: "até 10 anos" },
  { value: "11", label: "mais de 10 anos" },
];

function experienceFromParams(params: Record<string, string | undefined>): string {
  const maxY = Number(params.maxYear);
  if (maxY && maxY >= 1900) {
    const shift = NOW_YEAR - maxY;
    if (shift >= 11) return "11";
    const exact = EXPERIENCE_OPTIONS.find((o) => Number(o.value) === shift);
    if (exact) return exact.value;
  }
  return "";
}

function experienceToMaxYear(experience: string): number | undefined {
  const years = Number(experience);
  if (!years || years <= 0) return undefined;
  return NOW_YEAR - years;
}

const RADII = ["5", "10", "25", "50", "100"];

export function CompaniesFilters({ categories, initialParams }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialParams.q ?? "");
  const [categoryId, setCategoryId] = useState(initialParams.categoryId ?? "");
  const [sort, setSort] = useState(initialParams.sort ?? "recent");
  const [radiusKm, setRadiusKm] = useState(initialParams.radiusKm ?? "25");
  const [province, setProvince] = useState(initialParams.province ?? "");
  const [city, setCity] = useState(initialParams.city ?? "");
  const [badgeSlug, setBadgeSlug] = useState(initialParams.badgeSlug ?? "");
  const [companySize, setCompanySize] = useState(initialParams.companySize ?? "");
  const [experience, setExperience] = useState(() => experienceFromParams(initialParams));
  const [verificationStatus, setVerificationStatus] = useState(initialParams.verificationStatus ?? "");

  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [provOpen, setProvOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const catRef = useRef<HTMLDivElement>(null);
  const provRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const near = initialParams.near ?? "";
  const hasNear = Boolean(near);
  const nearLabel = initialParams.nearLabel ?? "";

  const selectedCatName = useMemo(() => categories.find((c) => c.id === categoryId)?.name ?? "", [categories, categoryId]);
  const filteredCats = useMemo(() => {
    const ql = catQuery.trim().toLowerCase();
    if (!ql) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(ql) || c.slug.toLowerCase().includes(ql));
  }, [categories, catQuery]);

  // Fecha painéis ao clicar fora ou com Escape
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (open) return;
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (provRef.current && !provRef.current.contains(e.target as Node)) setProvOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCatOpen(false);
        setProvOpen(false);
        setSortOpen(false);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Bloqueia o scroll da página enquanto o drawer estiver aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function buildQuery(overrides: Record<string, string | undefined> = {}) {
    const params = new URLSearchParams();
    const next: Record<string, string | undefined> = {
      q: q.trim() || undefined,
      categoryId: categoryId || undefined,
      sort: sort === "recent" ? undefined : sort,
      near: near || undefined,
      radiusKm: hasNear ? radiusKm : undefined,
      nearLabel: hasNear ? nearLabel || undefined : undefined,
      province: province || undefined,
      city: city.trim() || undefined,
      badgeSlug: badgeSlug || undefined,
      companySize: companySize || undefined,
      maxYear: experience ? String(experienceToMaxYear(experience)) : undefined,
      verificationStatus: verificationStatus || undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
    }
    if (overrides.near === "") {
      params.delete("near");
      params.delete("nearLabel");
    }
    if (overrides.categoryId === undefined && next.categoryId === undefined) params.delete("categoryId");
    params.delete("page");
    return params.toString();
  }

  function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
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
    params.delete("nearLabel");
    if (params.get("sort") === "distance") params.set("sort", "recent");
    router.push(params.toString() ? `/companies?${params.toString()}` : "/companies");
  }

  const onSelectLocation = useCallback(
    (near: string, label: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set("near", near);
      params.set("radiusKm", radiusKm || "25");
      params.set("sort", "distance");
      params.set("nearLabel", label);
      params.delete("page");
      router.push(`/companies?${params.toString()}`);
    },
    [radiusKm, router],
  );

  function clearAll() {
    setQ("");
    setCategoryId("");
    setSort("recent");
    setProvince("");
    setCity("");
    setBadgeSlug("");
    setCompanySize("");
    setExperience("");
    setVerificationStatus("");
    if (!near) setRadiusKm("25");
    router.push("/companies");
  }

  const sortOptions = [
    { value: "recent", label: "Mais recentes" },
    { value: "name", label: "Nome A-Z" },
    { value: "distance", label: "Distância" },
  ];
  const sortLabel = sortOptions.find((o) => o.value === sort)?.label ?? "Mais recentes";

  const activeCount = [
    q.trim(),
    categoryId,
    hasNear ? "near" : "",
    sort !== "recent" ? sort : "",
    province,
    city.trim(),
    badgeSlug,
    companySize,
    experience,
    verificationStatus,
  ].filter(Boolean).length;

  return (
    <div>
      {/* Command bar — pesquisa, categoria e filtros */}
      <div className="rounded-[14px] border border-[#D9D2C2] bg-white shadow-[0_10px_30px_rgba(15,26,46,0.06)]" aria-label="Pesquisa e filtros de empresas">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            {/* pesquisa */}
            <div className="relative flex min-w-0 flex-1 items-center gap-2.5 px-4">
              <span className="shrink-0 text-[#0F1A2E]/40" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar por nome, categoria ou localização…"
                aria-label="Pesquisar empresa"
                className="h-[52px] w-full bg-transparent text-[15px] placeholder:text-[#0F1A2E]/35 focus:outline-none"
              />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label="Limpar pesquisa" className="shrink-0 rounded-full p-1 text-[#0F1A2E]/30 hover:bg-[#0F1A2E]/5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </div>

            {/* categoria rápida */}
            <div ref={catRef} className="relative flex lg:flex-none lg:border-l lg:border-[#D9D2C2]/70">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={catOpen}
                onClick={() => setCatOpen((v) => !v)}
                className={`flex min-w-0 flex-1 items-center gap-2 border-t border-[#D9D2C2]/70 px-4 py-3.5 text-left lg:min-w-[170px] lg:border-t-0 ${selectedCatName ? "text-[#0F1A2E]" : "text-[#0F1A2E]/45"}`}
              >
                <span className="truncate text-sm font-semibold">{selectedCatName || "Todas as categorias"}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`ml-auto shrink-0 transition-transform ${catOpen ? "rotate-180" : ""}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {catOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-full min-w-[240px] overflow-hidden rounded-[12px] border border-[#D9D2C2] bg-white shadow-[0_12px_32px_rgba(15,26,46,0.14)]">
                  <div className="border-b border-[#D9D2C2] p-2">
                    <label className="flex items-center gap-2 rounded-[8px] bg-[#F6F3EE] px-2.5 py-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-[#0F1A2E]/30">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-3.5-3.5" />
                      </svg>
                      <input
                        autoFocus
                        value={catQuery}
                        onChange={(e) => setCatQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.preventDefault();
                        }}
                        placeholder="Filtrar categoria…"
                        className="w-full bg-transparent text-sm placeholder:text-[#0F1A2E]/30 focus:outline-none"
                      />
                    </label>
                  </div>
                  <ul role="listbox" className="max-h-[240px] overflow-auto p-1.5">
                    <li
                      role="option"
                      aria-selected={!categoryId}
                      onClick={() => {
                        setCategoryId("");
                        setCatOpen(false);
                        setCatQuery("");
                      }}
                      className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${!categoryId ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE] text-[#0F1A2E]"}`}
                    >
                      <span>Todas as categorias</span>
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
                          className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${categoryId === c.id ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE] text-[#0F1A2E]"}`}
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

            {/* acções — filtros + pesquisar */}
            <div className="flex items-center gap-1.5 border-t border-[#D9D2C2]/70 bg-[#F6F3EE]/40 px-3 py-2.5 lg:border-l lg:border-t-0 lg:bg-transparent lg:px-2.5">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#0F1A2E]/15 bg-white px-4 text-[13px] font-bold text-[#0F1A2E] transition-colors hover:bg-[#F6F3EE]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filtros
                {activeCount > 0 && (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#0B5E56] text-[11px] font-black text-white">
                    {activeCount}
                  </span>
                )}
              </button>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0F1A2E] px-5 text-[13px] font-bold text-white transition-colors hover:bg-black"
              >
                Pesquisar
              </button>
            </div>
          </div>
        </form>

        {/* chips activos */}
        {activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-b-[13px] border-t border-[#D9D2C2]/70 bg-[#F6F3EE]/50 px-3 py-2.5">
            {q.trim() && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F6F3EE] border border-[#D9D2C2] px-2.5 py-1 text-xs">“{q.trim()}”</span>
            )}
            {selectedCatName && (
              <span className="inline-flex rounded-full bg-[#0B5E56] px-2.5 py-1 text-xs font-semibold text-white">{selectedCatName}</span>
            )}
            {province && (
              <span className="inline-flex rounded-full bg-[#0F1A2E] px-2.5 py-1 text-xs font-semibold text-white">{province}</span>
            )}
            {city.trim() && (
              <span className="inline-flex rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-xs">{city.trim()}</span>
            )}
            {badgeSlug && (
              <span className="inline-flex rounded-full bg-[#0B5E56] px-2.5 py-1 text-xs font-semibold text-white">
                {BADGES.find((b) => b.slug === badgeSlug)?.label ?? badgeSlug}
              </span>
            )}
            {companySize && (
              <span className="inline-flex rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-xs">
                {DIMENSIONS.find((d) => d.value === companySize)?.label ?? companySize}
              </span>
            )}
            {experience && (
              <span className="inline-flex rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-xs">
                {EXPERIENCE_OPTIONS.find((o) => o.value === experience)?.label ?? `${experience} anos`}
              </span>
            )}
            {verificationStatus && (
              <span className="inline-flex rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-xs">
                {IDENTITIES.find((i) => i.value === verificationStatus)?.label ?? verificationStatus}
              </span>
            )}
            {hasNear && (
              <span className="inline-flex rounded-full bg-[#0F1A2E] px-2.5 py-1 text-xs font-semibold text-white">
                {(nearLabel || near).slice(0, 28)}{!nearLabel && "…"} • {radiusKm}km
              </span>
            )}
            {sort !== "recent" && <span className="inline-flex rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-xs">{sortLabel}</span>}
            <button type="button" onClick={clearAll} className="ml-auto inline-flex h-7 items-center rounded-full border border-[#0F1A2E]/10 bg-white px-3 text-xs font-semibold hover:bg-[#F6F3EE]">
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Drawer de filtros */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filtros de empresas">
          {/* overlay */}
          <button aria-label="Fechar filtros" onClick={() => setOpen(false)} className="absolute inset-0 w-full bg-[#0F1A2E]/40 backdrop-blur-sm" />
          {/* painel */}
          <div className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-white shadow-[0_0_48px_rgba(15,26,46,0.25)]">
            {/* header */}
            <div className="flex items-center justify-between border-b border-[#D9D2C2] px-5 py-4">
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">DIRECTÓRIO</p>
                <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]">Filtros</h2>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-full p-2 text-[#0F1A2E]/50 hover:bg-[#F6F3EE]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* corpo com scroll */}
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              {/* Ordenação */}
              <section>
                <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/50">ORDENAÇÃO</p>
                <div ref={sortRef} className="relative">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={sortOpen}
                    onClick={() => setSortOpen((v) => !v)}
                    className="flex w-full items-center gap-2 rounded-[10px] border border-[#D9D2C2] bg-white px-3 py-2.5 text-left"
                  >
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
              </section>

              {/* Localização */}
              <section>
                <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/50">LOCALIZAÇÃO</p>
                <div className="space-y-2.5">
                  {/* Província */}
                  <div ref={provRef} className="relative">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={provOpen}
                      onClick={() => setProvOpen((v) => !v)}
                      className={`flex w-full items-center gap-2 rounded-[10px] border px-3 py-2.5 text-left ${province ? "border-[#0F1A2E] bg-[#0F1A2E] text-white" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/60"}`}
                    >
                      <span className="flex-1 truncate text-sm">{province || "Todas as províncias"}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`shrink-0 transition-transform ${provOpen ? "rotate-180" : ""}`}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {provOpen && (
                      <ul role="listbox" className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-[240px] overflow-auto rounded-[12px] border border-[#D9D2C2] bg-white p-1.5 shadow-[0_12px_32px_rgba(15,26,46,0.12)]">
                        <li
                          role="option"
                          aria-selected={!province}
                          onClick={() => {
                            setProvince("");
                            setProvOpen(false);
                          }}
                          className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${!province ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE]"}`}
                        >
                          <span>Todas as províncias</span>
                          {!province && <span>✓</span>}
                        </li>
                        {PROVINCES.map((p) => (
                          <li
                            key={p}
                            role="option"
                            aria-selected={province === p}
                            onClick={() => {
                              setProvince(p);
                              setProvOpen(false);
                            }}
                            className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${province === p ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE]"}`}
                          >
                            <span>{p}</span>
                            {province === p && <span>✓</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* Cidade */}
                  <label className="flex items-center gap-2 rounded-[10px] border border-[#D9D2C2] bg-white px-3 py-2.5">
                    <span className="shrink-0 text-[#0F1A2E]/40" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                    </span>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade ou local (ex: Maputo)"
                      aria-label="Cidade"
                      className="w-full bg-transparent text-sm placeholder:text-[#0F1A2E]/35 focus:outline-none"
                    />
                    {city && (
                      <button type="button" onClick={() => setCity("")} aria-label="Limpar cidade" className="shrink-0 rounded-full p-1 text-[#0F1A2E]/30 hover:bg-[#0F1A2E]/5">
                        ✕
                      </button>
                    )}
                  </label>
                  {/* Proximidade */}
                  <div>
                    <LocationSearchBox
                      key={`${near}-${nearLabel}`}
                      near={near}
                      label={nearLabel || null}
                      onSelect={onSelectLocation}
                      onClear={clearNear}
                      placeholder="Perto de um endereço — ex: Av. Julius Nyerere"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onNearby}
                        className={`inline-flex h-9 flex-1 items-center justify-center rounded-full border px-4 text-sm font-semibold ${hasNear ? "border-[#0B5E56] bg-[#0B5E56] text-white" : "border-[#0F1A2E]/10 bg-white text-[#0F1A2E] hover:bg-[#F6F3EE]"}`}
                      >
                        {hasNear ? "✓ Perto de mim" : "Usar a minha localização"}
                      </button>
                    </div>
                    {hasNear && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold tracking-widest text-[#0F1A2E]/40">RAIO</span>
                        {RADII.map((r) => (
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
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/50">REGISTO DA EMPRESA</p>
                <div className="space-y-1.5">
                  {IDENTITIES.map((i) => (
                    <button
                      key={i.value}
                      type="button"
                      onClick={() => setVerificationStatus(verificationStatus === i.value ? "" : i.value)}
                      className={`flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left text-sm ${verificationStatus === i.value ? "border-[#0B5E56] bg-[#EAF4F2] text-[#0F1A2E]" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"}`}
                    >
                      <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${verificationStatus === i.value ? "border-[#0B5E56] bg-[#0B5E56]" : "border-[#D9D2C2]"}`}>
                        {verificationStatus === i.value && <span className="size-1.5 rounded-full bg-white" />}
                      </span>
                      {i.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Selos de qualidade */}
              <section>
                <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/50">SELOS DE QUALIDADE</p>
                <div className="flex flex-wrap gap-1.5">
                  {BADGES.map((b) => {
                    const active = badgeSlug === b.slug;
                    return (
                      <button
                        key={b.slug}
                        type="button"
                        onClick={() => setBadgeSlug(active ? "" : b.slug)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-[#0B5E56] bg-[#0B5E56] text-white" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"}`}
                      >
                        {active ? "✓ " : ""}{b.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Dimensão */}
              <section>
                <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/50">DIMENSÃO</p>
                <div className="flex flex-wrap gap-1.5">
                  {DIMENSIONS.map((d) => {
                    const active = companySize === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setCompanySize(active ? "" : d.value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-[#0F1A2E] bg-[#0F1A2E] text-white" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"}`}
                      >
                        {active ? "✓ " : ""}{d.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Anos de experiência */}
              <section>
                <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/50">ANOS DE EXPERIÊNCIA</p>
                <Select value={experience || null} onValueChange={(v) => setExperience(v ?? "")}>
                  <SelectTrigger className="h-11 w-full rounded-[10px] border-[#D9D2C2] bg-white text-sm focus:border-[#0B5E56]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[10px] border-[#D9D2C2]">
                    {EXPERIENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-[11px] text-[#0F1A2E]/40">Empresas com pelo menos X anos no mercado.</p>
              </section>
            </div>

            {/* rodapé */}
            <div className="flex gap-2 border-t border-[#D9D2C2] px-5 py-4">
              <button type="button" onClick={clearAll} className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-[#0F1A2E]/15 bg-white text-sm font-semibold text-[#0F1A2E] hover:bg-[#F6F3EE]">
                Limpar tudo
              </button>
              <button
                type="button"
                onClick={() => {
                  onSubmit();
                  setOpen(false);
                }}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#0F1A2E] text-sm font-bold text-white hover:bg-black"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Deprecated alias — manter até todos os imports migrarem para CompaniesFilters
export { CompaniesFilters as EmpresasFilters };
