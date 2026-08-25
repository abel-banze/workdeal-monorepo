import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
}

/**
 * Server-side fetch to the API via the local proxy (/api/v1/*).
 * The proxy forwards to BETTER_AUTH_URL with the JWT as Bearer token.
 * No direct server-to-server calls — avoids Vercel Deployment Protection.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(JWT_COOKIE_NAME)?.value;
  const authHeaders: Record<string, string> = jwt ? { Authorization: `Bearer ${jwt}` } : {};

  // Route through local proxy — path already starts with /api/v1/
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders, ...(init?.headers ?? {}) },
  });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok && !json.success) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json;
}

/** Variante para Server Actions que já têm o JWT em mãos */
export async function apiFetchWithAuth<T>(path: string, token: string | null, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders, ...(init?.headers ?? {}) },
  });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok && !json.success) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json;
}
