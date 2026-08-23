"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps, hasGoogleMapsKey } from "@/lib/google-maps";

export function HomeSearch({
  categories,
  initialParams,
}: {
  categories: { id: string; name: string; slug: string }[];
  initialParams: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialParams.q ?? "");
  const [categoryId, setCategoryId] = useState(initialParams.categoryId ?? "");
  const [open, setOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const comboboxRef = useRef<HTMLDivElement>(null);

  const selectedName = useMemo(() => {
    if (!categoryId) return "";
    return categories.find((c) => c.id === categoryId)?.name ?? "";
  }, [categoryId, categories]);

  const filtered = useMemo(() => {
    const query = catQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query));
  }, [categories, catQuery]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (categoryId) params.set("categoryId", categoryId);
    const qs = params.toString();
    router.push(qs ? `/?${qs}#empresas` : "/#empresas");
  }

  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyAddr, setNearbyAddr] = useState<string | null>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  // Places Autocomplete para pesquisa por endereço — propósito Workdeal: encontrar empresas perto de um endereço global, não só GPS
  useEffect(() => {
    if (!hasGoogleMapsKey() || !locationInputRef.current) return;
    let autocomplete: google.maps.places.Autocomplete | null = null;
    loadGoogleMaps()
      .then((g) => {
        if (!locationInputRef.current) return;
        autocomplete = new g.maps.places.Autocomplete(locationInputRef.current, {
          fields: ["geometry", "formatted_address"],
          types: ["geocode"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete!.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          const near = `${loc.lat().toFixed(5)},${loc.lng().toFixed(5)}`;
          const params = new URLSearchParams(window.location.search);
          params.set("near", near);
          params.set("radiusKm", "25");
          params.set("sort", "distance");
          if (place.formatted_address) params.set("nearLabel", place.formatted_address);
          router.push(`/?${params.toString()}#empresas`);
        });
      })
      .catch(() => {});
    return () => {
      if (autocomplete) (window as unknown as { google?: typeof google }).google?.maps?.event?.clearInstanceListeners(autocomplete);
    };
  }, [router]);

  function onNearby() {
    if (!navigator.geolocation) return;
    setNearbyLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const near = `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
        // reverse geocode para mostrar endereço humano quando possível
        if (hasGoogleMapsKey()) {
          try {
            const g = await loadGoogleMaps();
            const geocoder = new g.maps.Geocoder();
            const res = await geocoder.geocode({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
            const addr = res.results?.[0]?.formatted_address ?? null;
            if (addr) setNearbyAddr(addr);
          } catch {}
        }
        const params = new URLSearchParams(window.location.search);
        params.set("near", near);
        params.set("radiusKm", "25");
        params.set("sort", "distance");
        router.push(`/?${params.toString()}#empresas`);
        setNearbyLoading(false);
      },
      () => setNearbyLoading(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function selectCategory(id: string) {
    setCategoryId(id);
    setOpen(false);
    setCatQuery("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-2 rounded-[14px] border border-[#D9D2C2] bg-white p-2 shadow-[0_8px_24px_rgba(15,26,46,0.06)]"
      role="search"
      aria-label="Pesquisar empresas"
    >
      {/* row 1 — input w-full */}
      <label className="flex w-full items-center gap-2 rounded-[10px] bg-[#F6F3EE] px-3 py-2.5 sm:py-2">
        <span className="shrink-0 text-[#0F1A2E]/40" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Que empresa procura? ex: construção, electricidade"
          aria-label="Termo de pesquisa"
          className="w-full bg-transparent text-[14px] placeholder:text-[#0F1A2E]/40 focus:outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Limpar pesquisa"
            className="shrink-0 rounded-full p-1 text-[#0F1A2E]/30 hover:bg-[#0F1A2E]/5 hover:text-[#0F1A2E]/60"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </label>

      {/* row 2 — combobox + acções */}
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <div ref={comboboxRef} className="relative w-full flex-1">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Escolher categoria"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-[10px] border border-[#D9D2C2] bg-white px-3 py-2.5 text-left sm:py-2"
        >
          <span className="shrink-0 rounded bg-[#0B5E56] px-1.5 py-0.5 text-[10px] font-black tracking-widest text-white">CAT</span>
          <span className={`flex-1 truncate text-sm ${selectedName ? "text-[#0F1A2E]" : "text-[#0F1A2E]/40"}`}>
            {selectedName || "Todas categorias"}
          </span>
          <span className={`shrink-0 text-[#0F1A2E]/40 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[12px] border border-[#D9D2C2] bg-white shadow-[0_12px_32px_rgba(15,26,46,0.12)]">
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
                  placeholder="Filtrar categoria…"
                  aria-label="Filtrar categorias"
                  className="w-full bg-transparent text-sm placeholder:text-[#0F1A2E]/30 focus:outline-none"
                />
                {catQuery && (
                  <button
                    type="button"
                    onClick={() => setCatQuery("")}
                    className="shrink-0 text-[#0F1A2E]/30 hover:text-[#0F1A2E]/60"
                    aria-label="Limpar filtro de categoria"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </label>
            </div>

            <ul role="listbox" aria-label="Categorias" className="max-h-[220px] overflow-auto p-1.5">
              <li role="option" aria-selected={!categoryId} className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${!categoryId ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE] text-[#0F1A2E]"}`} onClick={() => selectCategory("")}>
                <span>Todas categorias</span>
                {!categoryId && <span aria-hidden>✓</span>}
              </li>
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-[#0F1A2E]/40">Nenhuma categoria encontrada</li>
              ) : (
                filtered.map((c) => (
                  <li
                    key={c.id}
                    role="option"
                    aria-selected={categoryId === c.id}
                    onClick={() => selectCategory(c.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm ${categoryId === c.id ? "bg-[#0F1A2E] text-white" : "hover:bg-[#F6F3EE] text-[#0F1A2E]"}`}
                  >
                    <span className="truncate pr-2">{c.name}</span>
                    {categoryId === c.id && <span aria-hidden>✓</span>}
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-[#D9D2C2] bg-[#F6F3EE]/50 px-3 py-2 text-[11px] text-[#0F1A2E]/40">
              {filtered.length} {filtered.length === 1 ? "categoria" : "categorias"} • <span className="font-mono">↑↓ para navegar, Enter para escolher</span>
            </div>
          </div>
        )}
        </div>

        <div className="flex gap-2 sm:w-auto sm:shrink-0">
          <button
            type="submit"
            className="flex flex-1 items-center justify-center rounded-full bg-[#0F1A2E] px-6 text-sm font-bold text-white hover:bg-black transition-colors sm:flex-none h-10 sm:w-auto"
          >
            Pesquisar
          </button>
          <button
            type="button"
            onClick={onNearby}
            disabled={nearbyLoading}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[#0F1A2E]/10 bg-white px-4 text-sm font-semibold text-[#0F1A2E] hover:bg-[#F6F3EE] whitespace-nowrap disabled:opacity-60"
          >
            {nearbyLoading ? "A localizar…" : "Perto de mim"}
          </button>
        </div>
      </div>
      {/* endereço global via Places — Workdeal é plataforma sem fronteiras */}
      <div className="flex w-full items-center gap-2 rounded-[10px] border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2">
        <span className="shrink-0 text-[#0F1A2E]/40" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </span>
        <input
          ref={locationInputRef}
          placeholder="Pesquisar perto de um endereço — ex: Av. Julius Nyerere, Maputo ou Rua Augusta, Lisboa"
          aria-label="Pesquisar por endereço com Google Places"
          className="w-full bg-transparent text-[13px] placeholder:text-[#0F1A2E]/40 focus:outline-none"
        />
        {nearbyAddr && <span className="hidden sm:inline text-xs font-medium text-[#0B5E56] truncate max-w-[220px]">{nearbyAddr}</span>}
      </div>
      {hasGoogleMapsKey() ? null : (
        <p className="text-xs text-[#0F1A2E]/40">
          Activa <code className="rounded border border-[#D9D2C2] bg-white px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> para autocomplete de endereços global.
        </p>
      )}
    </form>
  );
}
