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
  console.log("[syncJwt] override:", !!sessionTokenOverride, "cookie:", !!store.get("better-auth.session_token")?.value, "final:", !!sessionToken)
  if (!sessionToken) {
    console.log("[syncJwt] no session token — cookie names:", [...store.getAll().map((c) => c.name)])
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
    console.log("[syncJwt] token present:", !!token, "type:", typeof token)
    if (!token || typeof token !== "string") return { ok: false, error: "Token vazio" }

    const isSecure = env.BETTER_AUTH_URL.startsWith("https://")
    await (store as unknown as { set: (n: string, v: string, o: unknown) => void }).set(
      JWT_COOKIE_NAME,
      token,
      jwtCookieOptions(isSecure),
    )
    console.log("[syncJwt] JWT cookie set, ok")
    return { ok: true }
  } catch (e) {
    console.error("[syncJwt] exception:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
