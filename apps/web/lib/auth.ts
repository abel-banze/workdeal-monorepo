import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@workdeal/auth/server"
import type { SessionInfo } from "@workdeal/shared"

// Cache por request — evita N queries à tabela session quando DashboardLayout + page chamam ambos requireAuth
// e reduz pressão no pool (max 20) durante GET /dashboard que antes fazia 3-4 queries sequenciais.
export const getServerSession = cache(async (): Promise<SessionInfo | null> => {
  try {
    const store = await cookies()
    const cookieHeader = store.getAll().map((c) => `${c.name}=${c.value}`).join("; ")
    if (!cookieHeader) return null

    // Timeout rápido — se o pool estiver sob pressão (remote DB 148.230.109.53), falha em 2s em vez de
    // prender o request 5-10s até connectionTimeout/query_timeout e gerar 13.8s no /dashboard.
    const timeout = (ms: number) => new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
    const sessionPromise = auth.api
      .getSession({
        headers: new Headers({ Cookie: cookieHeader }),
      })
      .then((r) => r as unknown as { user?: { id?: string; email?: string; name?: string; image?: string | null; systemRole?: string; emailVerified?: boolean; phone?: string | null; locale?: string }; session?: { id?: string } } | null)
      .catch(() => null)

    const response = (await Promise.race([sessionPromise, timeout(2000)])) as unknown as { user?: { id?: string; email?: string; name?: string; image?: string | null; systemRole?: string; emailVerified?: boolean; phone?: string | null; locale?: string }; session?: { id?: string } } | null

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
  } catch {
    return null
  }
})

export async function requireAuth(): Promise<SessionInfo> {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  return session
}
