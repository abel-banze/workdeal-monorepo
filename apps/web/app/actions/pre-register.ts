"use server";

import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import { apiFetchWithAuth } from "@/lib/api";

export type ClaimPreRegisterResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

// Após criar a conta, a empresa reclama a organização pré-registada (torna-se owner)
// e migra o estado de pre_registered para pending.
export async function claimPreRegister(token: string): Promise<ClaimPreRegisterResult> {
  const store = await cookies();
  const authToken = store.get(JWT_COOKIE_NAME)?.value ?? null;
  if (!authToken) return { ok: false, error: "Sessão expirada. Entra novamente." };

  try {
    const res = await apiFetchWithAuth<{ ok: boolean; organizationId: string | null }>(
      `/api/v1/pre-register/${encodeURIComponent(token)}/claim`,
      authToken,
      { method: "POST", cache: "no-store" },
    );
    if (!res.success) {
      return { ok: false, error: res.error?.message ?? "Falha ao reclamar a empresa" };
    }
    if (!res.data?.organizationId) {
      return { ok: false, error: "Não foi possível concluir o registo da empresa." };
    }
    return { ok: true, organizationId: res.data.organizationId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/TOKEN_EXPIRED|expirou/i.test(msg)) return { ok: false, error: "Este link de registo expirou. Contacta a equipa Workdeal." };
    if (/TOKEN_INVALID|inválido|já utilizado/i.test(msg)) return { ok: false, error: "Este link de registo é inválido ou já foi utilizado." };
    return { ok: false, error: msg.slice(0, 300) || "Falha ao concluir o registo — tenta novamente." };
  }
}
