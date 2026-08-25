"use server";

import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import { placeAutocompleteQuerySchema, placeDetailsSchema } from "@workdeal/shared";
import type { PlaceDetails, PlaceSuggestion } from "@workdeal/shared";
import { apiFetchWithAuth } from "@/lib/api";

const TAG = "[places:action]"
export type PlacesSuggestionsResult = { ok: true; suggestions: PlaceSuggestion[] } | { ok: false; error: string };
export type PlaceDetailsResult = { ok: true; place: PlaceDetails } | { ok: false; error: string };

export async function placesAutocompleteAction(input: string): Promise<PlacesSuggestionsResult> {
  const parsed = placeAutocompleteQuerySchema.safeParse({ input });
  if (!parsed.success) {
    console.warn(`${TAG} autocomplete: input invalid`, parsed.error.issues);
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Pesquisa inválida" };
  }
  const token = (await cookies()).get(JWT_COOKIE_NAME)?.value ?? null;
  console.log(`${TAG} autocomplete("${parsed.data.input.slice(0, 50)}") hasJwt=${!!token}`);
  if (!token) {
    console.error(`${TAG} sem JWT cookie (${JWT_COOKIE_NAME}) — autocomplete bloqueado`);
    return { ok: false, error: "Sessão necessária" };
  }

  try {
    const qs = new URLSearchParams({ input: parsed.data.input });
    const res = await apiFetchWithAuth<PlaceSuggestion[]>(`/api/v1/places/autocomplete?${qs.toString()}`, token, {
      cache: "no-store",
    });
    const count = Array.isArray(res.data) ? res.data.length : 0;
    console.log(`${TAG} autocomplete OK: ${count} suggestions`);
    return { ok: true, suggestions: Array.isArray(res.data) ? res.data : [] };
  } catch (e) {
    console.error(`${TAG} autocomplete FAILED:`, e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Falha na pesquisa" };
  }
}

export async function placesDetailsAction(placeId: string): Promise<PlaceDetailsResult> {
  if (!placeId || placeId.length > 200) return { ok: false, error: "placeId inválido" };
  const token = (await cookies()).get(JWT_COOKIE_NAME)?.value ?? null;
  console.log(`${TAG} details("${placeId.slice(0, 50)}") hasJwt=${!!token}`);
  if (!token) return { ok: false, error: "Sessão necessária" };

  try {
    const res = await apiFetchWithAuth<PlaceDetails>(`/api/v1/places/details/${encodeURIComponent(placeId)}`, token, {
      cache: "no-store",
    });
    const parsed = placeDetailsSchema.safeParse(res.data);
    if (!parsed.success) {
      console.error(`${TAG} details: response validation failed`, parsed.error.issues);
      return { ok: false, error: "Resposta do Google inválida" };
    }
    console.log(`${TAG} details OK: ${parsed.data.name}`);
    return { ok: true, place: parsed.data };
  } catch (e) {
    console.error(`${TAG} details FAILED:`, e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Falha ao obter detalhes" };
  }
}
