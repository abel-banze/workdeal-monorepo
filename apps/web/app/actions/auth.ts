"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { JWT_COOKIE_NAME, jwtCookieOptions } from "@workdeal/auth/cookies"
import { env } from "@/lib/env"

export async function signOut() {
  const store = await cookies()
  const sessionToken = store.get("better-auth.session_token")?.value
  store.delete(JWT_COOKIE_NAME)
  store.delete("better-auth.session_token")

  if (sessionToken) {
    await fetch(`${env.BETTER_AUTH_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `better-auth.session_token=${sessionToken}` },
    }).catch(() => {})
  }

  redirect("/login")
}

export async function syncJwt(sessionTokenOverride?: string): Promise<{ ok: boolean; error?: string }> {
  const store = await cookies()
  const sessionToken = sessionTokenOverride ?? store.get("better-auth.session_token")?.value
  if (!sessionToken) return { ok: false, error: "Sessão não encontrada" }

  try {
    const res = await fetch(`${env.BETTER_AUTH_URL}/api/auth/token`, {
      method: "GET",
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
      cache: "no-store",
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      return { ok: false, error: `Falha ao obter JWT: ${res.status} ${txt.slice(0, 200)}` }
    }
    const data = (await res.json().catch(() => ({}))) as { token?: string }
    const token = data.token
    if (!token || typeof token !== "string") return { ok: false, error: "Token vazio" }

    const isSecure = env.BETTER_AUTH_URL.startsWith("https://")
    // `cookies()` em Server Action é mutável em runtime; tipagem `ReadonlyRequestCookies` não expõe `set`
    await (store as unknown as { set: (n: string, v: string, o: unknown) => void }).set(
      JWT_COOKIE_NAME,
      token,
      jwtCookieOptions(isSecure),
    )
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
