import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyJwt } from "@workdeal/auth/session"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import type { SessionInfo } from "@workdeal/shared"

export async function getServerSession(): Promise<SessionInfo | null> {
  const token = (await cookies()).get(JWT_COOKIE_NAME)?.value
  if (!token) return null
  return verifyJwt(token)
}

export async function requireAuth(): Promise<SessionInfo> {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  return session
}
