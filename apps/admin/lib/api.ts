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
 */
function getApiBase(): string {
  return env.API_URL.replace(/\/+$/, "");
}

/**
 * Server-side fetch directo para a API Hono (env.API_URL).
 * Encaminha todos os cookies para a API — o auth middleware decide
 * se usa JWT ou sessão better-auth.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const base = getApiBase();
  const url = `${base}${path}`;
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
  const json = (await res.json().catch(() => ({ success: false }))) as ApiEnvelope<T>;
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
  const json = (await res.json().catch(() => ({ success: false }))) as ApiEnvelope<T>;
  if (!res.ok && !json.success) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json;
}

/**
 * Variante para uploads multipart (ex: logo) a partir de Server Actions.
 * Não se define Content-Type manualmente — o fetch preenche o boundary
 * automaticamente quando o body é um FormData.
 */
export async function apiUpload<T>(path: string, token: string | null, formData: FormData): Promise<ApiEnvelope<T>> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const base = getApiBase();
  const url = `${base}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      body: formData,
      headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}), ...authHeaders },
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(`API timeout ao carregar ficheiro: ${path}`);
    }
    throw e;
  }
  clearTimeout(timeout);
  const json = (await res.json().catch(() => ({ success: false }))) as ApiEnvelope<T>;
  if (!res.ok && !json.success) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json;
}
