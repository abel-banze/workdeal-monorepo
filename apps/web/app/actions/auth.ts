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
 * Store the JWT (fetched by the client via /api/auth/token proxy) as an httpOnly cookie.
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
