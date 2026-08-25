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
  if (!session) {
    console.log("[getServerSession] no session cookie found")
    return null
  }

  try {
    const host = `localhost:${process.env.PORT ?? 3000}`
    const url = `http://${host}/api/auth/get-session`

    console.log(`[getServerSession] calling ${url} with cookie ${session.name}`)
    const res = await fetch(url, {
      headers: { Cookie: `${session.name}=${session.value}` },
      cache: "no-store",
    })
    console.log(`[getServerSession] response: ${res.status} ${res.statusText}`)

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.log(`[getServerSession] error body (first 200 chars): ${body.slice(0, 200)}`)
      return null
    }

    const raw = await res.text()
    console.log(`[getServerSession] raw body (first 300 chars): ${raw.slice(0, 300)}`)
    const data = JSON.parse(raw) as {
      session?: { id?: string; userId?: string; expiresAt?: string };
      user?: { id?: string; email?: string; name?: string; image?: string | null; systemRole?: string; emailVerified?: boolean; phone?: string | null; locale?: string };
    } | null

    if (!data?.user?.id) {
      console.log("[getServerSession] no user.id in response:", JSON.stringify(data).slice(0, 300))
      return null
    }

    console.log(`[getServerSession] OK user=${data.user.id}`)
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
