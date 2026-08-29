"use client";

// Input de endereço global (Google Places Autocomplete) para pesquisa "perto de um endereço".
// Reflecte a selecção actual via `near`/`label` e notifica o pai com `onSelect(near, label)`.
// Reutilizado na homepage e na página de empresas — mesma lógica, um sítio só.

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, hasGoogleMapsKey } from "@/lib/google-maps";

export function LocationSearchBox({
  near,
  label,
  onSelect,
  onClear,
  placeholder,
}: {
  near?: string;
  label?: string | null;
  onSelect: (near: string, label: string) => void;
  onClear: () => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState(label ?? (near ? "Localização actual" : ""));

  // Reflecte mudanças externas (navegação com nearLabel, limpeza) no input.
  useEffect(() => {
    setTyped(label ?? (near ? "Localização actual" : ""));
  }, [near, label]);

  useEffect(() => {
    if (!hasGoogleMapsKey() || !inputRef.current) return;
    let autocomplete: google.maps.places.Autocomplete | null = null;
    loadGoogleMaps()
      .then((g) => {
        if (!inputRef.current) return;
        autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
          fields: ["geometry", "formatted_address"],
          types: ["geocode"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete!.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          const nearStr = `${loc.lat().toFixed(5)},${loc.lng().toFixed(5)}`;
          const labelStr = place.formatted_address ?? "";
          setTyped(labelStr);
          onSelect(nearStr, labelStr);
        });
      })
      .catch(() => {});
    return () => {
      if (autocomplete) (window as unknown as { google?: typeof google }).google?.maps?.event?.clearInstanceListeners(autocomplete);
    };
  }, [onSelect]);

  const hasSelection = Boolean(near);

  return (
    <div className="flex w-full items-center gap-2 rounded-[10px] border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2">
      <span className="shrink-0 text-[#0F1A2E]/40" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </span>
      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        disabled={!hasGoogleMapsKey()}
        placeholder={placeholder ?? "Pesquisar perto de um endereço — ex: Av. Julius Nyerere, Maputo"}
        aria-label="Pesquisar por endereço com Google Places"
        className="w-full bg-transparent text-[13px] placeholder:text-[#0F1A2E]/40 focus:outline-none disabled:opacity-60"
      />
      {hasSelection && (
        <button
          type="button"
          onClick={() => {
            setTyped("");
            onClear();
          }}
          aria-label="Limpar localização"
          className="shrink-0 rounded-full p-1 text-[#0F1A2E]/30 hover:bg-[#0F1A2E]/5 hover:text-[#0F1A2E]/60"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}