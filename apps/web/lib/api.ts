import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import { env } from "./env";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const url = `${env.API_URL}${path}`;
  // Propaga JWT para a API Hono (server-side): Authorization Bearer tem prioridade, fallback Cookie
  const cookieStore = await cookies();
  const jwt = cookieStore.get(JWT_COOKIE_NAME)?.value;
  const authHeaders: Record<string, string> = jwt ? { Authorization: `Bearer ${jwt}` } : {};

  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders, ...(init?.headers ?? {}) },
    // Next cache: directory uses revalidate, nearby uses no-store — caller controls via next.*
  });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok && !json.success) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json;
}

/** Variante para Server Actions que já têm o JWT em mãos (evita ler cookies duas vezes) */
export async function apiFetchWithAuth<T>(path: string, token: string | null, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const url = `${env.API_URL}${path}`;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders, ...(init?.headers ?? {}) },
  });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok && !json.success) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json;
}
