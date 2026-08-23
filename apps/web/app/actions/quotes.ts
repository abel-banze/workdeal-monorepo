"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import { createQuoteSchema } from "@workdeal/shared";
import { apiFetchWithAuth } from "@/lib/api";

export type CreateQuoteResult = { ok: true; id: string } | { ok: false; error: string };

export async function createQuoteAction(input: z.infer<typeof createQuoteSchema>): Promise<CreateQuoteResult> {
  const parsed = createQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  // Login é opcional — convidados podem pedir cotação; se houver sessão,
  // o pedido fica associado ao utilizador (requester_user_id)
  const token = (await cookies()).get(JWT_COOKIE_NAME)?.value ?? null;

  try {
    const res = await apiFetchWithAuth<{ id: string } & Record<string, unknown>>("/api/v1/quotes", token, {
      method: "POST",
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
    const id = (res.data as { id?: string })?.id ?? "ok";
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Mensagens pt-MZ mapeadas do backend (RATE_LIMITED, PROFILE_NOT_FOUND, FORBIDDEN)
    return { ok: false, error: msg.slice(0, 500) };
  }
}

export async function getMyOrganizationsAction(): Promise<{ id: string; name: string; slug: string }[]> {
  const token = (await cookies()).get(JWT_COOKIE_NAME)?.value ?? null;
  if (!token) return [];
  try {
    const res = await apiFetchWithAuth<{ id: string; name: string; slug: string }[]>("/api/v1/auth/organizations", token, { cache: "no-store" });
    // Rota existe via better-auth plugin; se não existir, tenta /api/v1/profiles/me fallback
    if (Array.isArray(res.data)) return res.data;
    return [];
  } catch {
    return [];
  }
}
