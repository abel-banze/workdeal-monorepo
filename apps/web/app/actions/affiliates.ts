"use server";

import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import { affiliateAttributionInputSchema, affiliateValidateInputSchema } from "@workdeal/shared";
import type { AffiliateAttributionInput, AffiliateDashboard, AffiliateValidateInput } from "@workdeal/shared";
import { apiFetch, apiFetchWithAuth } from "@/lib/api";

type ActionResult<T = never> = { ok: true; data: T } | { ok: false; error: string };

/** Painel do afiliado autenticado (código, link, referrals, earnings). */
export async function getAffiliateMeAction(): Promise<ActionResult<AffiliateDashboard>> {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value ?? null;
  try {
    const res = await apiFetchWithAuth<AffiliateDashboard>("/api/v1/affiliate/me", token, { cache: "no-store" });
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao obter dados de afiliado" };
  }
}

/** Valida um código de indicação (feedback imediato no registo). */
export async function validateAffiliateCodeAction(input: AffiliateValidateInput): Promise<
  ActionResult<{ code: string; actorType: "user" | "organization"; actorName: string; commissionType: "percent" | "fixed" }>
> {
  const parsed = affiliateValidateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Código inválido" };

  try {
    const res = await apiFetch<{ code: string; actorType: "user" | "organization"; actorName: string; commissionType: "percent" | "fixed" }>(
      "/api/v1/affiliate/validate",
      { method: "POST", body: JSON.stringify(parsed.data), cache: "no-store" },
    );
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao validar código" };
  }
}

/** Atribui a empresa criada no onboarding ao afiliado. */
export async function attachAffiliateAction(input: AffiliateAttributionInput): Promise<ActionResult<{ id: string }>> {
  const parsed = affiliateAttributionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value ?? null;
  if (!token) return { ok: false, error: "Sessão expirada. Entra novamente." };

  try {
    const res = await apiFetchWithAuth<{ id: string }>("/api/v1/affiliate/attach", token, {
      method: "POST",
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao atribuir código de indicação" };
  }
}