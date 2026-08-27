"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { JWT_COOKIE_NAME, jwtCookieOptions } from "@workdeal/auth/cookies"
import { env } from "@/lib/env"

const BETTER_AUTH_SESSION_COOKIES = ["__Secure-better-auth.session_token", "better-auth.session_token"] as const

/**
 * Sign out: delete all auth cookies, call API sign-out via proxy, redirect to login.
 */
export async function signOut() {
  const store = await cookies()

  // Read session token before deleting cookies (needed for API sign-out call)
  let sessionToken: string | undefined
  for (const name of BETTER_AUTH_SESSION_COOKIES) {
    const v = store.get(name)?.value
    if (v) { sessionToken = v; break }
  }

  // Delete all auth cookies
  store.delete(JWT_COOKIE_NAME)
  for (const name of BETTER_AUTH_SESSION_COOKIES) store.delete(name)

  // Tell the API to invalidate the session (best-effort, via proxy)
  if (sessionToken) {
    await fetch(`${env.BETTER_AUTH_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `better-auth.session_token=${sessionToken}` },
    }).catch(() => {})
  }

  redirect("/login")
}

/**
 * Store the JWT as an httpOnly cookie.
 * Always receives the JWT directly — no fallback, no server-to-server API call.
 */
export async function syncJwt(jwtToken: string): Promise<{ ok: boolean; error?: string }> {
  if (!jwtToken || typeof jwtToken !== "string") {
    return { ok: false, error: "Token inválido" }
  }
  const store = await cookies()
  const isSecure = env.BETTER_AUTH_URL.startsWith("https://")
  await (store as unknown as { set: (n: string, v: string, o: unknown) => void }).set(
    JWT_COOKIE_NAME,
    jwtToken,
    jwtCookieOptions(isSecure),
  )
  return { ok: true }
}

/**
 * Obtain the JWT server-side (from the auth backend) using the session cookies of the
 * current request and store it as the httpOnly `workdeal_jwt` cookie.
 *
 * Avoids the redundant browser → proxy → backend roundtrip of the old client fetch:
 * the whole exchange now happens in a single Server Action, on the server, using only
 * the better-auth session cookies that are already present on the request.
 */
export async function syncSessionJwt(): Promise<{ ok: boolean; error?: string }> {
  const store = await cookies()
  const all = store.getAll()
  if (all.length === 0) return { ok: false, error: "Sem sessão" }

  const cookieHeader: string = all.map((c) => `${c.name}=${c.value}`).join("; ")

  const res = await fetch(`${env.BETTER_AUTH_URL}/api/auth/token`, {
    method: "GET",
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  }).catch(() => undefined)

  if (!res || !res.ok) {
    return { ok: false, error: res ? `Falha ao obter JWT: ${res.status}` : "Auth backend indisponível" }
  }

  const data = await res.json().catch(() => ({})) as { token?: unknown }
  if (typeof data.token !== "string" || !data.token) {
    return { ok: false, error: "Token vazio no /api/auth/token" }
  }

  const isSecure = env.BETTER_AUTH_URL.startsWith("https://")
  await (store as unknown as { set: (n: string, v: string, o: unknown) => void }).set(
    JWT_COOKIE_NAME,
    data.token,
    jwtCookieOptions(isSecure),
  )
  return { ok: true }
}
