import { businessHoursSchema, openingPeriodSchema, placeSuggestionSchema } from "@workdeal/shared";
import type { BusinessHours, PlaceDetails, PlaceSuggestion } from "@workdeal/shared";
import { env } from "../env";
import { AppError } from "../lib/errors";

// Proxy para Google Places API (New) — a chave fica server-side; o browser só fala
// com /api/v1/places/* (autenticado + rate limited). O mapa interactivo (pin)
// usa a NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no web — chave pública por natureza.

const BASE = "https://places.googleapis.com/v1";
const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "addressComponents",
  "internationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
].join(",");

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
    };
  }>;
}

interface GooglePlaceDetails {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number } | null;
    }>;
  };
}

function bias() {
  const latitude = env.PLACES_BIAS_LAT ?? -25.9692;
  const longitude = env.PLACES_BIAS_LNG ?? 32.5732;
  const radiusMeters = (env.PLACES_BIAS_RADIUS_KM ?? 50) * 1000;
  return { latitude, longitude, radiusMeters };
}

function assertKey(): string {
  // Mesma chave do Google Maps Platform serve Maps JS (web) e Places API (New) (servidor);
  // GOOGLE_PLACES_API_KEY existe só para quem preferir chaves separadas.
  const key = env.GOOGLE_PLACES_API_KEY ?? env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new AppError(503, "PLACES_NOT_CONFIGURED", "Pesquisa de lugares indisponível — chave do Google Maps não configurada");
  }
  return key;
}

async function callGoogle(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  } catch {
    throw new AppError(502, "PLACES_UPSTREAM", "Google Places não respondeu — tenta novamente");
  }
  if (!res.ok) {
    if (res.status === 404 || res.status === 400) {
      throw new AppError(404, "PLACE_NOT_FOUND", "Lugar não encontrado");
    }
    throw new AppError(502, "PLACES_UPSTREAM", `Erro do Google Places (${res.status})`);
  }
  return res;
}

class PlacesService {
  async autocomplete(input: string): Promise<PlaceSuggestion[]> {
    const key = assertKey();
    const b = bias();
    const res = await callGoogle(`${BASE}/places:autocomplete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({
        input,
        languageCode: "pt",
        includedPrimaryTypes: ["establishment", "geocode"],
        locationBias: { circle: { center: { latitude: b.latitude, longitude: b.longitude }, radius: b.radiusMeters } },
      }),
    });
    const json = (await res.json()) as GoogleAutocompleteResponse;
    const out: PlaceSuggestion[] = [];
    for (const s of json.suggestions ?? []) {
      const p = s.placePrediction;
      const parsed = placeSuggestionSchema.safeParse({
        placeId: p?.placeId,
        mainText: p?.structuredFormat?.mainText?.text ?? p?.text?.text,
        secondaryText: p?.structuredFormat?.secondaryText?.text ?? "",
      });
      if (parsed.success) out.push(parsed.data);
    }
    return out.slice(0, 5);
  }

  async details(placeId: string): Promise<PlaceDetails> {
    const key = assertKey();
    const res = await callGoogle(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=pt`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": DETAILS_FIELD_MASK },
    });
    const g = (await res.json()) as GooglePlaceDetails;
    if (!g.id) throw new AppError(404, "PLACE_NOT_FOUND", "Lugar não encontrado");

    const component = (type: string): string | null =>
      g.addressComponents?.find((c) => c.types?.includes(type))?.longText ?? null;

    // regularOpeningHours.periods já é exactamente o nosso formato canónico —
    // validar período a período e descartar os malformados
    const periods = (g.regularOpeningHours?.periods ?? [])
      .map((p) =>
        openingPeriodSchema.safeParse({
          open: p.open && p.open.day != null ? p.open : null,
          close: p.close && p.close.day != null ? p.close : null,
        }),
      )
      .filter((r) => r.success)
      .map((r) => r.data);
    const bh = businessHoursSchema.safeParse({ periods });
    const businessHours: BusinessHours | null = bh.success ? bh.data : null;

    return {
      placeId: g.id,
      name: g.displayName?.text ?? "",
      formattedAddress: g.formattedAddress ?? null,
      latitude: g.location?.latitude ?? null,
      longitude: g.location?.longitude ?? null,
      phone: g.internationalPhoneNumber ?? null,
      website: g.websiteUri ?? null,
      province: component("administrative_area_level_1"),
      district: component("administrative_area_level_2") ?? component("locality"),
      bairro: component("sublocality_level_1") ?? component("sublocality") ?? component("neighborhood"),
      businessHours,
    };
  }
}

export const placesService = new PlacesService();
