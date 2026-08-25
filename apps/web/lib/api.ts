import "server-only";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import { env } from "@/lib/env";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
}

/**
 * Base da API Hono — via env.API_URL.
 * SSR-first: Server Components e Server Actions correm no servidor e
 * chamam a API directamente, sem passar por fetch ao próprio /api proxy.
 * Evita 401 de "Protected deployment" do VERCEL_URL.
 */
function getApiBase(): string {
  return env.API_URL.replace(/\/+$/, "");
}

/**
 * Mantido para compatibilidade — não usado por apiFetch.
 * @deprecated use API_URL directly
 */
export function getWebOrigin(): string {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

const TAG = "[apiFetch]";

/**
 * Server-side fetch directo para a API Hono (env.API_URL).
 * Lê o JWT do cookie e envia como Bearer + Cookie (compatível com better-auth via header ou cookie).
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(JWT_COOKIE_NAME)?.value;
  const authHeaders: Record<string, string> = jwt ? { Authorization: `Bearer ${jwt}`, Cookie: `${JWT_COOKIE_NAME}=${jwt}` } : {};

  const base = getApiBase();
  const url = `${base}${path}`;
  console.log(`${TAG} → ${init?.method ?? "GET"} ${url} (hasJwt=${!!jwt})`);
  console.log(`${TAG}   API_URL resolved: ${base}`);
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
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}`, Cookie: `${JWT_COOKIE_NAME}=${token}` } : {};

  const base = getApiBase();
  const url = `${base}${path}`;
  console.log(`${TAG} → ${init?.method ?? "GET"} ${url} (hasJwt=${!!token})`);
  console.log(`${TAG}   API_URL resolved: ${base}`);
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
