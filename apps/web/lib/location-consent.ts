// Consentimento de localização estilo "cookie" — Workdeal.
// Quando o utilizador aceita, guarda-se a localização num par de cookies
// (coords + label) para os Server Components poderem listar empresas,
// requisições e eventos por omissão próximos do utilizador, sem depender
// de um redirect no primeiro carregamento.

export const LOCATION_COOKIE = "workdeal_loc";
export const LOCATION_LABEL_COOKIE = "workdeal_loc_label";
export const LOCATION_DECLINED_COOKIE = "workdeal_loc_declined";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias
const NEAR_RE = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

export type StoredLocation = { near: string; label: string | null };

/** Lê coords+label a partir do objecto de cookies de um Server Component (next/headers). */
export function parseLocationCookies(cookies: { get(name: string): { value: string } | undefined } | null | undefined): StoredLocation | null {
  if (!cookies) return null;
  const near = cookies.get(LOCATION_COOKIE)?.value;
  if (!near || !NEAR_RE.test(near)) return null;
  let label: string | null = null;
  const rawLabel = cookies.get(LOCATION_LABEL_COOKIE)?.value;
  if (rawLabel) {
    try {
      label = decodeURIComponent(rawLabel) || null;
    } catch {
      label = null;
    }
  }
  return { near, label };
}

/** Aplica a localização guardada como omissão — só se o URL não tiver `near` explícito. */
export function applyDefaultLocation(params: Record<string, string | undefined>, stored: StoredLocation | null): Record<string, string | undefined> {
  if (!stored || params.near) return params;
  return {
    ...params,
    near: stored.near,
    radiusKm: params.radiusKm ?? "25",
    ...(stored.label ? { nearLabel: stored.label } : {}),
  };
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${String(maxAge)}; samesite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function writeLocationCookies(near: string, label: string | null) {
  if (typeof document === "undefined") return;
  setCookie(LOCATION_COOKIE, near, COOKIE_MAX_AGE);
  setCookie(LOCATION_LABEL_COOKIE, label ?? "", COOKIE_MAX_AGE);
  clearCookie(LOCATION_DECLINED_COOKIE);
}

export function writeDeclinedCookie() {
  if (typeof document === "undefined") return;
  setCookie(LOCATION_DECLINED_COOKIE, "1", COOKIE_MAX_AGE);
}

function readClientCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  const raw = m?.[1];
  if (raw === undefined) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Lê a localização guardada a partir dos cookies do browser (componentes client). */
export function getStoredLocationClient(): StoredLocation | null {
  const near = readClientCookie(LOCATION_COOKIE);
  if (!near || !NEAR_RE.test(near)) return null;
  return { near, label: readClientCookie(LOCATION_LABEL_COOKIE) || null };
}

export function getDeclinedClient(): boolean {
  return Boolean(readClientCookie(LOCATION_DECLINED_COOKIE));
}