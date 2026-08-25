"use server";

import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import { placeAutocompleteQuerySchema, placeDetailsSchema } from "@workdeal/shared";
import type { PlaceDetails, PlaceSuggestion } from "@workdeal/shared";
import { apiFetchWithAuth } from "@/lib/api";

export type PlacesSuggestionsResult = { ok: true; suggestions: PlaceSuggestion[] } | { ok: false; error: string };
export type PlaceDetailsResult = { ok: true; place: PlaceDetails } | { ok: false; error: string };

// Proxy server-side para /api/v1/places/* — o browser nunca fala com a API nem com o Google
export async function placesAutocompleteAction(input: string): Promise<PlacesSuggestionsResult> {
  const parsed = placeAutocompleteQuerySchema.safeParse({ input });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Pesquisa inválida" };
  }
  const token = (await cookies()).get(JWT_COOKIE_NAME)?.value ?? null;
  if (!token) {
    console.error(`[places:action] sem JWT cookie (${JWT_COOKIE_NAME}) — autocomplete bloqueado`);
    return { ok: false, error: "Sessão necessária" };
  }

  try {
    const qs = new URLSearchParams({ input: parsed.data.input });
    const res = await apiFetchWithAuth<PlaceSuggestion[]>(`/api/v1/places/autocomplete?${qs.toString()}`, token, {
      cache: "no-store",
    });
    return { ok: true, suggestions: Array.isArray(res.data) ? res.data : [] };
  } catch (e) {
    console.error("[places:action] falhou:", e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Falha na pesquisa" };
  }
}

export async function placesDetailsAction(placeId: string): Promise<PlaceDetailsResult> {
  if (!placeId || placeId.length > 200) return { ok: false, error: "placeId inválido" };
  const token = (await cookies()).get(JWT_COOKIE_NAME)?.value ?? null;
  if (!token) return { ok: false, error: "Sessão necessária" };

  try {
    const res = await apiFetchWithAuth<PlaceDetails>(`/api/v1/places/details/${encodeURIComponent(placeId)}`, token, {
      cache: "no-store",
    });
    const parsed = placeDetailsSchema.safeParse(res.data);
    if (!parsed.success) return { ok: false, error: "Resposta do Google inválida" };
    return { ok: true, place: parsed.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Falha ao obter detalhes" };
  }
}
