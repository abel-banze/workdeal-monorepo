"use server";

import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import { onboardingCompleteSchema } from "@workdeal/shared";
import type { OnboardingCompleteInput } from "@workdeal/shared";
import { apiFetchWithAuth } from "@/lib/api";

const CV_COOKIE_NAME = "wd_verified_contacts";

export type CompleteOnboardingResult =
  | { ok: true; profileId: string }
  | { ok: false; error: string };

// Orquestrador client-side do onboarding: UMA chamada para o endpoint
// transacional da API. Encaminha os tokens HMAC dos contactos verificados via
// OTP (cookie httpOnly) — o backend recusa publicar sem ≥1 contacto verificado.
export async function completeOnboardingAction(input: OnboardingCompleteInput): Promise<CompleteOnboardingResult> {
  const parsed = onboardingCompleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value ?? null;
  if (!token) return { ok: false, error: "Sessão expirada. Entra novamente." };
  const verified = store.get(CV_COOKIE_NAME)?.value ?? null;

  try {
    const res = await apiFetchWithAuth<{ profileId: string; slug?: string }>("/api/v1/onboarding/complete", token, {
      method: "POST",
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      headers: verified ? { "x-verified-contacts": verified } : undefined,
    });
    // P0-4: revalida directório e perfil específico (AGENTS §2.2)
    revalidateTag("profiles", "max");
    const slug = parsed.data.profile.slug ?? (res.data as { slug?: string })?.slug;
    if (slug) revalidateTag(`profile:${slug}`, "max");
    else if (res.data?.profileId) revalidateTag(`profile:${res.data.profileId}`, "max");
    return { ok: true, profileId: res.data?.profileId ?? "ok" };
  } catch (e) {
    return { ok: false, error: mapCompleteError(e instanceof Error ? e.message : String(e)) };
  }
}

function mapCompleteError(raw: string): string {
  if (/CONTACT_NOT_VERIFIED|contacto/i.test(raw)) {
    return "Confirma pelo menos um contacto com código de verificação antes de publicar.";
  }
  if (/RATE_LIMITED/i.test(raw)) return "Muitas tentativas — aguarda um minuto e tenta de novo.";
  if (/FORBIDDEN/i.test(raw)) return "Sem permissão para esta organização. Entra com a conta certa.";
  if (/SLUG_TAKEN|já está em uso/i.test(raw)) return "Esse nome já gerou um endereço em uso — ajusta ligeiramente o nome.";
  if (/INVALID_CATEGORY/i.test(raw)) return "Uma das categorias escolhidas já não é válida — escolhe novamente.";
  if (/UNAUTHORIZED|Sessão expirada/i.test(raw)) return "Sessão expirada. Entra novamente.";
  return raw.slice(0, 300) || "Falha ao publicar o perfil — tenta novamente.";
}
