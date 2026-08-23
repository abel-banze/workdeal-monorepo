"use server";

import { z } from "zod";

// Server-side Geocoding via Google Geocoding API — propósito Workdeal: converter endereço global em lat/lng para PostGIS
// Usa GOOGLE_MAPS_API_KEY (sem NEXT_PUBLIC) — fallback seguro se chave não configurada

const schema = z.object({ address: z.string().min(3).max(300) });

export async function geocodeAddressAction(input: z.infer<typeof schema>) {
  const { address } = schema.parse(input);
  const key = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return { success: false as const, error: "GOOGLE_MAPS_API_KEY em falta no servidor" };
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { success: false as const, error: `Geocoding HTTP ${res.status}` };
  const data = (await res.json()) as { status: string; results: { geometry: { location: { lat: number; lng: number } }; formatted_address: string }[]; error_message?: string };
  if (data.status !== "OK" || !data.results[0]) {
    return { success: false as const, error: data.error_message ?? `Geocoding: ${data.status}` };
  }
  const r = data.results[0];
  return {
    success: true as const,
    data: { lat: r.geometry.location.lat, lng: r.geometry.location.lng, formatted: r.formatted_address },
  };
}

export async function reverseGeocodeAction(lat: number, lng: number) {
  const key = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return { success: false as const, error: "GOOGLE_MAPS_API_KEY em falta" };
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { success: false as const, error: `HTTP ${res.status}` };
  const data = (await res.json()) as { status: string; results: { formatted_address: string }[]; error_message?: string };
  if (data.status !== "OK" || !data.results[0]) return { success: false as const, error: data.error_message ?? data.status };
  return { success: true as const, data: { formatted: data.results[0].formatted_address } };
}
