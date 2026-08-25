import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import type { SessionInfo } from "@workdeal/shared"

const BETTER_AUTH_SESSION_COOKIES = ["__Secure-better-auth.session_token", "better-auth.session_token"] as const

function readSessionToken(store: { get: (name: string) => { value?: string } | undefined }): { name: string; value: string } | null {
  for (const name of BETTER_AUTH_SESSION_COOKIES) {
    const v = store.get(name)?.value
    if (v) return { name, value: v }
  }
  return null
}

/**
 * Verify the session by calling better-auth's /api/auth/get-session through
 * the web proxy. The proxy forwards to the API, which verifies the session
 * cookie and returns the user + session data.
 *
 * This avoids the need to verify the JWT ourselves (which requires JWKS
 * and fails on Vercel preview due to self-referencing SSO walls).
 */
export async function getServerSession(): Promise<SessionInfo | null> {
  const store = await cookies()
  const session = readSessionToken(store)
  if (!session) return null

  try {
    const protocol = process.env.VERCEL_URL ? "https" : "http"
    const host = process.env.VERCEL_URL ?? `localhost:${process.env.PORT ?? 3000}`
    const url = `${protocol}://${host}/api/auth/get-session`

    const res = await fetch(url, {
      headers: { Cookie: `${session.name}=${session.value}` },
      cache: "no-store",
    })
    if (!res.ok) return null

    const data = await res.json().catch(() => (null)) as {
      session?: { id?: string; userId?: string; expiresAt?: string };
      user?: { id?: string; email?: string; name?: string; image?: string | null; systemRole?: string; emailVerified?: boolean; phone?: string | null; locale?: string };
    } | null

    if (!data?.user?.id) return null

    return {
      sessionId: data.session?.id ?? null,
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
        name: data.user.name ?? "",
        image: data.user.image ?? null,
        systemRole: data.user.systemRole === "moderator" || data.user.systemRole === "admin" ? data.user.systemRole : "user",
        emailVerified: data.user.emailVerified === true,
        phone: data.user.phone ?? null,
        locale: data.user.locale ?? "pt-MZ",
      },
    }
  } catch (e) {
    console.error("[getServerSession] failed:", e instanceof Error ? e.message : String(e))
    return null
  }
}

export async function requireAuth(): Promise<SessionInfo> {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  return session
}
