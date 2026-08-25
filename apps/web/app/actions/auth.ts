"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { JWT_COOKIE_NAME, jwtCookieOptions } from "@workdeal/auth/cookies"
import { env } from "@/lib/env"

const BETTER_AUTH_SESSION_COOKIES = ["__Secure-better-auth.session_token", "better-auth.session_token"] as const

function readSessionToken(store: { get: (name: string) => { value?: string } | undefined }): string | undefined {
  for (const name of BETTER_AUTH_SESSION_COOKIES) {
    const v = store.get(name)?.value
    if (v) return v
  }
  return undefined
}

export async function signOut() {
  const store = await cookies()
  const sessionToken = readSessionToken(store)
  store.delete(JWT_COOKIE_NAME)
  for (const name of BETTER_AUTH_SESSION_COOKIES) store.delete(name)

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
 *
 * When `jwtToken` is provided (fetched via proxy from /api/auth/token),
 * store it directly — no additional API call needed.
 *
 * When omitted, fall back to reading the session cookie and exchanging
 * via the API's /token endpoint (server-to-server).
 */
export async function syncJwt(jwtToken?: string): Promise<{ ok: boolean; error?: string }> {
  const store = await cookies()

  // Fast path: JWT already fetched by client via /api/auth/token proxy.
  if (jwtToken) {
    console.log("[syncJwt] storing JWT from client, preview:", jwtToken.slice(0, 20) + "...")
    const isSecure = env.BETTER_AUTH_URL.startsWith("https://")
    await (store as unknown as { set: (n: string, v: string, o: unknown) => void }).set(
      JWT_COOKIE_NAME,
      jwtToken,
      jwtCookieOptions(isSecure),
    )
    console.log("[syncJwt] JWT cookie set, ok")
    return { ok: true }
  }

  // Fallback: read session cookie and exchange for JWT via API.
  const sessionToken = readSessionToken(store)
  console.log("[syncJwt] fallback path, cookie present:", !!sessionToken)
  if (!sessionToken) {
    console.log("[syncJwt] no token and no cookie — available:", store.getAll().map((c) => c.name))
    return { ok: false, error: "Sessão não encontrada" }
  }

  const tokenUrl = `${env.BETTER_AUTH_URL}/api/auth/token`
  console.log("[syncJwt] fetching token from:", tokenUrl)
  try {
    const res = await fetch(tokenUrl, {
      method: "GET",
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
      cache: "no-store",
    })
    const txtBody = await res.text().catch(() => "")
    console.log("[syncJwt] token response:", res.status, "body:", txtBody.slice(0, 500))
    if (!res.ok) {
      return { ok: false, error: `Falha ao obter JWT: ${res.status} ${txtBody.slice(0, 200)}` }
    }
    const data = (txtBody ? JSON.parse(txtBody) : {}) as { token?: string }
    const token = data.token
    console.log("[syncJwt] token present:", !!token)
    if (!token || typeof token !== "string") return { ok: false, error: "Token vazio" }

    const isSecure = env.BETTER_AUTH_URL.startsWith("https://")
    await (store as unknown as { set: (n: string, v: string, o: unknown) => void }).set(
      JWT_COOKIE_NAME,
      token,
      jwtCookieOptions(isSecure),
    )
    return { ok: true }
  } catch (e) {
    console.error("[syncJwt] exception:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
