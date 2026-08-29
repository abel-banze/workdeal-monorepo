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
 * Encaminha todos os cookies para a API — o auth middleware decide
 * se usa JWT ou sessão better-auth.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const hasJwt = allCookies.some((c) => c.name === JWT_COOKIE_NAME);

  const base = getApiBase();
  const url = `${base}${path}`;
  console.log(`${TAG} → ${init?.method ?? "GET"} ${url} (hasJwt=${hasJwt}, cookieCount=${allCookies.length})`);
  const t0 = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(`API timeout 5s: ${path}`);
    }
    throw e;
  }
  clearTimeout(timeout);
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
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const base = getApiBase();
  const url = `${base}${path}`;
  console.log(`${TAG} → ${init?.method ?? "GET"} ${url} (hasJwt=${!!token})`);
  const t0 = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}), ...authHeaders, ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(`API timeout 5s: ${path}`);
    }
    throw e;
  }
  clearTimeout(timeout);
  const elapsed = Date.now() - t0;
  const bodySnippet = (await res.clone().text()).slice(0, 500);
  console.log(`${TAG} ← ${res.status} in ${elapsed}ms, body[0..500]: ${bodySnippet}`);
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok && !json.success) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json;
}
