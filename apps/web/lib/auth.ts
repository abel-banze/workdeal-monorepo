import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@workdeal/auth/server"
import type { SessionInfo } from "@workdeal/shared"

/**
 * Verify the session by calling better-auth's auth.api.getSession() directly.
 * This hits the database directly — no HTTP call, no JWKS fetch, no proxy.
 * Works on Vercel because it doesn't need to reach any URL.
 */
export async function getServerSession(): Promise<SessionInfo | null> {
  try {
    const store = await cookies()
    const cookieHeader = store.getAll().map((c) => `${c.name}=${c.value}`).join("; ")
    if (!cookieHeader) return null

    const response = await auth.api.getSession({
      headers: new Headers({ Cookie: cookieHeader }),
    })

    if (!response?.user?.id) return null

    return {
      sessionId: response.session?.id ?? null,
      user: {
        id: response.user.id,
        email: response.user.email ?? "",
        name: response.user.name ?? "",
        image: (response.user as { image?: string | null }).image ?? null,
        systemRole: response.user.systemRole === "moderator" || response.user.systemRole === "admin" ? response.user.systemRole : "user",
        emailVerified: response.user.emailVerified === true,
        phone: (response.user as { phone?: string | null }).phone ?? null,
        locale: (response.user as { locale?: string }).locale ?? "pt-MZ",
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
