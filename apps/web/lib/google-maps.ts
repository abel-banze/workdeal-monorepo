"use client";

// Loader + helpers para Google Maps — propósito Workdeal: ecossistema global sem fronteiras
// - Maps JS + Places Autocomplete + Geocoding (reverse) para picker e pesquisa nearby

let loaderPromise: Promise<typeof google> | null = null;

function getApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
}

export function hasGoogleMapsKey() {
  return Boolean(getApiKey());
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("Sem window"));
  const key = getApiKey();
  if (!key) return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY em falta"));

  const g = (window as unknown as { google?: typeof google }).google;
  // Já carregado e com os construtores prontos — resolve de imediato.
  // (verificar maps.Map, não só maps: com loading=async o namespace aparece antes dos construtores)
  if (g?.maps?.Map) return Promise.resolve(g);

  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const w = window as unknown as typeof globalThis & { __gmBoot?: () => void };
    // Callback chamado pelo Google apenas quando o Maps JS API está totalmente carregado
    // (construtores Map/Marker/places disponíveis). Sem callback, o onload do <script>
    // dispara cedo demais e g.maps.Map ainda é undefined → "g.maps.Map is not a constructor".
    w.__gmBoot = () => {
      const gg = (window as unknown as { google: typeof google }).google;
      resolve(gg);
    };

    const id = "google-maps-script";
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        const gg = (window as unknown as { google: typeof google }).google;
        if (gg?.maps?.Map) resolve(gg);
      });
      existing.addEventListener("error", () => reject(new Error("Falha a carregar Google Maps")));
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=__gmBoot`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Falha a carregar Google Maps"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const g = await loadGoogleMaps();
    const geocoder = new g.maps.Geocoder();
    const res = await geocoder.geocode({ location: { lat, lng } });
    if (res.results?.[0]?.formatted_address) return res.results[0].formatted_address;
    return null;
  } catch {
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  try {
    const g = await loadGoogleMaps();
    const geocoder = new g.maps.Geocoder();
    const res = await geocoder.geocode({ address });
    const r = res.results?.[0];
    if (!r?.geometry?.location) return null;
    const loc = r.geometry.location;
    return {
      lat: typeof loc.lat === "function" ? loc.lat() : (loc as unknown as { lat: number }).lat,
      lng: typeof loc.lng === "function" ? loc.lng() : (loc as unknown as { lng: number }).lng,
      formatted: r.formatted_address,
    };
  } catch {
    return null;
  }
}
