import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
}

/**
 * Build the absolute origin of this web deployment.
 * Server Components and Server Actions run on the server where relative URLs
 * don't resolve — we need an absolute URL that hits our own /api/v1/* proxy.
 */
export function getWebOrigin(): string {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

const TAG = "[apiFetch]"

/**
 * Server-side fetch to the API via the local proxy (/api/v1/*).
 * The proxy forwards to BETTER_AUTH_URL with the JWT as Bearer token.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(JWT_COOKIE_NAME)?.value;
  const authHeaders: Record<string, string> = jwt ? { Authorization: `Bearer ${jwt}` } : {};

  const url = `${getWebOrigin()}${path}`;
  console.log(`${TAG} → ${init?.method ?? "GET"} ${url} (hasJwt=${!!jwt})`);
  const t0 = Date.now();
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders, ...(init?.headers ?? {}) },
  });
  const elapsed = Date.now() - t0;
  const bodySnippet = (await res.clone().text()).slice(0, 500);
  console.log(`${TAG} ← ${res.status} in ${elapsed}ms, body[0..500]: ${bodySnippet}`);
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok && !json.success) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json;
}

/** Variante para Server Actions que já têm o JWT em mãos */
export async function apiFetchWithAuth<T>(path: string, token: string | null, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const url = `${getWebOrigin()}${path}`;
  console.log(`${TAG} → ${init?.method ?? "GET"} ${url} (hasJwt=${!!token})`);
  const t0 = Date.now();
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders, ...(init?.headers ?? {}) },
  });
  const elapsed = Date.now() - t0;
  const bodySnippet = (await res.clone().text()).slice(0, 500);
  console.log(`${TAG} ← ${res.status} in ${elapsed}ms, body[0..500]: ${bodySnippet}`);
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok && !json.success) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json;
}
