"use client";

// Banner de consentimento de localização (estilo banner de cookies).
// O utilizador decide se permite usar a localização para listar empresas,
// requisições e eventos perto dele por omissão. Escolha guardada em cookies.
// A localização é tratada como dado sensível: só é usada depois do aceite,
// fica apenas no dispositivo, e pode ser limpa a qualquer momento.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { reverseGeocode } from "@/lib/google-maps";
import { getDeclinedClient, getStoredLocationClient, writeDeclinedCookie, writeLocationCookies } from "@/lib/location-consent";

export function LocationConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (getStoredLocationClient() || getDeclinedClient()) setVisible(false);
    else setVisible(true);
  }, []);

  if (!visible) return null;

  async function grant() {
    if (!navigator.geolocation) {
      setState("error");
      return;
    }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        let label: string | null = null;
        try {
          label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        } catch {}
        const near = `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
        writeLocationCookies(near, label);

        const params = new URLSearchParams(window.location.search);
        if (!params.get("near")) {
          params.set("near", near);
          params.set("radiusKm", params.get("radiusKm") ?? "25");
          params.set("sort", "distance");
          if (label) params.set("nearLabel", label);
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname);
        }
        setVisible(false);
      },
      () => setState("error"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function decline() {
    writeDeclinedCookie();
    setVisible(false);
  }

  return (
    <div role="region" aria-label="Consentimento de localização" className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#D9D2C2] bg-white shadow-[0_-8px_30px_rgba(15,26,46,0.12)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0F1A2E] text-white" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-black text-[#0F1A2E]">Usar a minha localização?</p>
            <p className="mt-0.5 max-w-[640px] text-[13px] leading-relaxed text-[#0F1A2E]/60">
              Para mostrar empresas, requisições e eventos perto de si por omissão. A localização fica guardada apenas neste
              dispositivo e pode ser limpa em qualquer altura.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {state === "error" && <span className="text-xs font-semibold text-[#FF3B1F]">Não foi possível obter a localização.</span>}
          <button
            type="button"
            onClick={grant}
            disabled={state === "loading"}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#0F1A2E] px-5 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
          >
            {state === "loading" ? "A localizar…" : "Usar a minha localização"}
          </button>
          <button
            type="button"
            onClick={decline}
            disabled={state === "loading"}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#0F1A2E]/10 bg-white px-4 text-sm font-semibold text-[#0F1A2E] hover:bg-[#F6F3EE] disabled:opacity-60"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}