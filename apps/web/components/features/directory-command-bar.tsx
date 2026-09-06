"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type FilterOption = { value: string; label: string };

type Section =
  | { kind: "radio"; label: string; param: string; allLabel: string; options: FilterOption[] }
  | { kind: "multi"; label: string; param: string; allLabel: string; options: FilterOption[] }
  | { kind: "range"; label: string; minParam: string; maxParam: string; minLabel: string; maxLabel: string; unit?: string };

type Props = {
  basePath: string;
  placeholder: string;
  searchLabel: string;
  drawerEyebrow: string;
  drawerTitle: string;
  categories: { id: string; name: string; slug: string }[];
  initialParams: Record<string, string | undefined>;
  sections: Section[];
  preserveParams?: string[];
  showCategoryQuickSelect?: boolean;
};

type SectionState = {
  radio: Record<string, string>;
  multi: Record<string, string[]>;
  range: Record<string, { min: string; max: string }>;
};

function commaParams(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function DirectoryCommandBar({
  basePath,
  placeholder,
  searchLabel,
  drawerEyebrow,
  drawerTitle,
  categories,
  initialParams,
  sections,
  preserveParams = [],
  showCategoryQuickSelect = true,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialParams.q ?? "");
  const [categoryId, setCategoryId] = useState(initialParams.categoryId ?? "");

  const [values, setValues] = useState<SectionState>(() => {
    const radio: SectionState["radio"] = {};
    const multi: SectionState["multi"] = {};
    const range: SectionState["range"] = {};
    for (const s of sections) {
      switch (s.kind) {
        case "radio":
          radio[s.param] = initialParams[s.param] ?? "";
          break;
        case "multi":
          multi[s.param] = commaParams(initialParams[s.param]);
          break;
        case "range":
          range[s.minParam] = { min: initialParams[s.minParam] ?? "", max: initialParams[s.maxParam] ?? "" };
          break;
      }
    }
    return { radio, multi, range };
  });

  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [multiQuery, setMultiQuery] = useState<Record<string, string>>({});

  const catRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
      for (const [param, el] of Object.entries(sectionRefs.current)) {
        if (el && !el.contains(e.target as Node)) setOpenSection((cur) => (cur === param ? null : cur));
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCatOpen(false);
        setOpenSection(null);
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

  function buildQuery() {
    const params = new URLSearchParams();
    for (const p of preserveParams) {
      const v = initialParams[p];
      if (v) params.set(p, v);
    }
    if (q.trim()) params.set("q", q.trim());
    if (showCategoryQuickSelect && categoryId) params.set("categoryId", categoryId);
    for (const s of sections) {
      switch (s.kind) {
        case "radio": {
          const v = values.radio[s.param];
          if (v) params.set(s.param, v);
          break;
        }
        case "multi": {
          const v = values.multi[s.param] ?? [];
          if (v.length > 0) params.set(s.param, v.join(","));
          break;
        }
        case "range": {
          const cell = values.range[s.minParam];
          if (cell?.min) params.set(s.minParam, cell.min);
          if (cell?.max) params.set(s.maxParam, cell.max);
          break;
        }
      }
    }
    params.delete("page");
    return params.toString();
  }

  function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const qs = buildQuery();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function clearAll() {
    setQ("");
    setCategoryId("");
    setValues(() => {
      const radio: SectionState["radio"] = {};
      const multi: SectionState["multi"] = {};
      const range: SectionState["range"] = {};
      for (const s of sections) {
        if (s.kind === "radio") radio[s.param] = "";
        if (s.kind === "multi") multi[s.param] = [];
        if (s.kind === "range") range[s.minParam] = { min: "", max: "" };
      }
      return { radio, multi, range };
    });
    const params = new URLSearchParams();
    for (const p of preserveParams) {
      const v = initialParams[p];
      if (v) params.set(p, v);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const activeCount = useMemo(() => {
    let n = q.trim() ? 1 : 0;
    if (showCategoryQuickSelect && categoryId) n += 1;
    for (const s of sections) {
      if (s.kind === "radio" && values.radio[s.param]) n += 1;
      if (s.kind === "multi" && (values.multi[s.param]?.length ?? 0) > 0) n += 1;
      if (s.kind === "range") {
        const cell = values.range[s.minParam];
        if (cell?.min || cell?.max) n += 1;
      }
    }
    return n;
  }, [q, categoryId, showCategoryQuickSelect, sections, values]);

  return (
    <div>
      {/* Command bar — pesquisa, categoria e filtros */}
      <div className="rounded-[14px] border border-[#D9D2C2] bg-white shadow-[0_10px_30px_rgba(15,26,46,0.06)]" aria-label={drawerTitle}>
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
                placeholder={placeholder}
                aria-label={searchLabel}
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
            {showCategoryQuickSelect && (
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
            )}

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
            {showCategoryQuickSelect && selectedCatName && (
              <span className="inline-flex rounded-full bg-[#0B5E56] px-2.5 py-1 text-xs font-semibold text-white">{selectedCatName}</span>
            )}
            {sections.map((s) => {
              if (s.kind === "radio") {
                const v = values.radio[s.param];
                if (!v) return null;
                const label = s.options.find((o) => o.value === v)?.label ?? v;
                return (
                  <span key={s.param} className="inline-flex rounded-full bg-[#0F1A2E] px-2.5 py-1 text-xs font-semibold text-white">
                    {label}
                  </span>
                );
              }
              if (s.kind === "multi") {
                const selected = values.multi[s.param] ?? [];
                if (selected.length === 0) return null;
                return selected.map((value) => {
                  const label = s.options.find((o) => o.value === value)?.label ?? value;
                  return (
                    <span key={`${s.param}:${value}`} className="inline-flex rounded-full bg-[#0B5E56] px-2.5 py-1 text-xs font-semibold text-white">
                      {label}
                    </span>
                  );
                });
              }
              const cell = values.range[s.minParam];
              if (!cell?.min && !cell?.max) return null;
              const unit = s.unit ?? "MT";
              const label =
                cell.min && cell.max ? `${cell.min}–${cell.max} ${unit}` : cell.min ? `≥ ${cell.min} ${unit}` : `≤ ${cell.max} ${unit}`;
              return (
                <span key={s.minParam} className="inline-flex rounded-full bg-[#0F1A2E] px-2.5 py-1 text-xs font-semibold text-white">
                  {label}
                </span>
              );
            })}
            <button type="button" onClick={clearAll} className="ml-auto inline-flex h-7 items-center rounded-full border border-[#0F1A2E]/10 bg-white px-3 text-xs font-semibold hover:bg-[#F6F3EE]">
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Drawer de filtros */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={drawerTitle}>
          {/* overlay */}
          <button aria-label="Fechar filtros" onClick={() => setOpen(false)} className="absolute inset-0 w-full bg-[#0F1A2E]/40 backdrop-blur-sm" />
          {/* painel */}
          <div className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-white shadow-[0_0_48px_rgba(15,26,46,0.25)]">
            {/* header */}
            <div className="flex items-center justify-between border-b border-[#D9D2C2] px-5 py-4">
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">{drawerEyebrow}</p>
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
              {sections.map((s) => {
                if (s.kind === "radio") {
                  const activeValue = values.radio[s.param];
                  const isOpen = openSection === s.param;
                  const label = activeValue ? (s.options.find((o) => o.value === activeValue)?.label ?? activeValue) : s.allLabel;
                  return (
                    <section key={s.param}>
                      <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/50">{s.label}</p>
                      <div ref={(el) => { sectionRefs.current[s.param] = el; }} className="relative">
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={isOpen}
                          onClick={() => setOpenSection(isOpen ? null : s.param)}
                          className={`flex w-full items-center gap-2 rounded-[10px] border px-3 py-2.5 text-left ${activeValue ? "border-[#0F1A2E] bg-[#0F1A2E] text-white" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/60"}`}
                        >
                          <span className="flex-1 truncate text-sm">{label}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        {isOpen && (
                          <ul role="listbox" className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-[240px] overflow-auto rounded-[12px] border border-[#D9D2C2] bg-white p-1.5 shadow-[0_12px_32px_rgba(15,26,46,0.12)]">
                            <li
                              role="option"
                              aria-selected={!activeValue}
                              onClick={() => {
                                setValues((v) => ({ ...v, radio: { ...v.radio, [s.param]: "" } }));
                                setOpenSection(null);
                              }}
                              className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${!activeValue ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE]"}`}
                            >
                              <span>{s.allLabel}</span>
                              {!activeValue && <span>✓</span>}
                            </li>
                            {s.options.map((o) => (
                              <li
                                key={o.value}
                                role="option"
                                aria-selected={activeValue === o.value}
                                onClick={() => {
                                  setValues((v) => ({ ...v, radio: { ...v.radio, [s.param]: o.value } }));
                                  setOpenSection(null);
                                }}
                                className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${activeValue === o.value ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE]"}`}
                              >
                                <span>{o.label}</span>
                                {activeValue === o.value && <span>✓</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </section>
                  );
                }

                if (s.kind === "multi") {
                  const selected = values.multi[s.param] ?? [];
                  const isOpen = openSection === s.param;
                  const mq = (multiQuery[s.param] ?? "").trim().toLowerCase();
                  const filtered = mq
                    ? s.options.filter((o) => o.label.toLowerCase().includes(mq))
                    : s.options;
                  return (
                    <section key={s.param}>
                      <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/50">{s.label}</p>
                      <div ref={(el) => { sectionRefs.current[s.param] = el; }} className="relative">
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={isOpen}
                          onClick={() => setOpenSection(isOpen ? null : s.param)}
                          className={`flex w-full items-center gap-2 rounded-[10px] border px-3 py-2.5 text-left ${selected.length > 0 ? "border-[#0F1A2E] bg-[#0F1A2E] text-white" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/60"}`}
                        >
                          <span className="flex-1 truncate text-sm">
                            {selected.length > 0 ? `${selected.length} seleccionada${selected.length > 1 ? "s" : ""}` : s.allLabel}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[12px] border border-[#D9D2C2] bg-white shadow-[0_12px_32px_rgba(15,26,46,0.12)]">
                            <div className="border-b border-[#D9D2C2] p-2">
                              <label className="flex items-center gap-2 rounded-[8px] bg-[#F6F3EE] px-2.5 py-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-[#0F1A2E]/30">
                                  <circle cx="11" cy="11" r="7" />
                                  <path d="M20 20l-3.5-3.5" />
                                </svg>
                                <input
                                  autoFocus
                                  value={multiQuery[s.param] ?? ""}
                                  onChange={(e) => setMultiQuery((m) => ({ ...m, [s.param]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") e.preventDefault();
                                  }}
                                  placeholder="Pesquisar…"
                                  className="w-full bg-transparent text-sm placeholder:text-[#0F1A2E]/30 focus:outline-none"
                                />
                              </label>
                            </div>
                            <ul role="listbox" className="max-h-[240px] overflow-auto p-1.5">
                              {filtered.length === 0 ? (
                                <li className="px-3 py-6 text-center text-sm text-[#0F1A2E]/40">Nenhuma opção</li>
                              ) : (
                                filtered.map((o) => {
                                  const active = selected.includes(o.value);
                                  return (
                                    <li
                                      key={o.value}
                                      role="option"
                                      aria-selected={active}
                                      onClick={() => {
                                        setValues((v) => ({
                                          ...v,
                                          multi: {
                                            ...v.multi,
                                            [s.param]: active ? selected.filter((x) => x !== o.value) : [...selected, o.value],
                                          },
                                        }));
                                      }}
                                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-sm ${active ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE] text-[#0F1A2E]"}`}
                                    >
                                      <span className="truncate">{o.label}</span>
                                      {active && <span>✓</span>}
                                    </li>
                                  );
                                })
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </section>
                  );
                }

                const cell = values.range[s.minParam] ?? { min: "", max: "" };
                const unit = s.unit ?? "MT";
                return (
                  <section key={s.minParam}>
                    <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/50">{s.label}</p>
                    <div className="flex items-center gap-2">
                      <label className="flex flex-1 flex-col gap-1">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#0F1A2E]/50">{s.minLabel}</span>
                        <span className="flex items-center gap-1 rounded-[10px] border border-[#D9D2C2] bg-white px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={cell.min}
                            onChange={(e) =>
                              setValues((v) => ({ ...v, range: { ...v.range, [s.minParam]: { ...cell, min: e.target.value } } }))
                            }
                            placeholder="0"
                            className="w-full bg-transparent text-sm outline-none placeholder:text-[#0F1A2E]/30"
                          />
                          <span className="shrink-0 text-xs font-bold text-[#0F1A2E]/40">{unit}</span>
                        </span>
                      </label>
                      <span className="mt-5 text-[#0F1A2E]/30" aria-hidden>–</span>
                      <label className="flex flex-1 flex-col gap-1">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#0F1A2E]/50">{s.maxLabel}</span>
                        <span className="flex items-center gap-1 rounded-[10px] border border-[#D9D2C2] bg-white px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={cell.max}
                            onChange={(e) =>
                              setValues((v) => ({ ...v, range: { ...v.range, [s.minParam]: { ...cell, max: e.target.value } } }))
                            }
                            placeholder="Sem limite"
                            className="w-full bg-transparent text-sm outline-none placeholder:text-[#0F1A2E]/30"
                          />
                          <span className="shrink-0 text-xs font-bold text-[#0F1A2E]/40">{unit}</span>
                        </span>
                      </label>
                    </div>
                  </section>
                );
              })}
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