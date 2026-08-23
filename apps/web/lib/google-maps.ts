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

  if (loaderPromise) return loaderPromise;
  if ((window as unknown as { google?: typeof google }).google?.maps) {
    loaderPromise = Promise.resolve((window as unknown as { google: typeof google }).google);
    return loaderPromise;
  }

  loaderPromise = new Promise((resolve, reject) => {
    const id = "google-maps-script";
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve((window as unknown as { google: typeof google }).google));
      existing.addEventListener("error", () => reject(new Error("Falha a carregar Google Maps")));
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const g = (window as unknown as { google?: typeof google }).google;
      if (g?.maps) resolve(g);
      else reject(new Error("Google Maps não carregou"));
    };
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
