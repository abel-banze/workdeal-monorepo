"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { apiFetchWithAuth } from "@/lib/api"
import { requireAuth } from "@/lib/auth"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  let token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) {
    // Sessão better-auth presente mas JWT ainda não sincronizado — tenta obtê-lo
    const { syncSessionJwt } = await import("@/app/actions/auth")
    const synced = await syncSessionJwt()
    if (synced.ok) token = (await cookies()).get(JWT_COOKIE_NAME)?.value
  }
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function toggleProfileBookmark(profileId: string): Promise<{ ok: boolean; bookmarked: boolean; error?: string }> {
  try {
    await requireAuth()
    if (!profileId?.trim()) throw new Error("ID do perfil obrigatório")
    const token = await getAuthToken()

    const res = await apiFetchWithAuth<{ bookmarked: boolean }>(`/api/v1/bookmarks/${encodeURIComponent(profileId)}/toggle`, token, {
      method: "POST",
      cache: "no-store",
    })

    return { ok: true, bookmarked: res.data?.bookmarked ?? false }
  } catch (e) {
    return { ok: false, bookmarked: false, error: e instanceof Error ? e.message : "Falha ao guardar perfil." }
  }
}

export async function isProfileBookmarked(profileId: string): Promise<boolean> {
  const store = await cookies()
  let token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) {
    const { syncSessionJwt } = await import("@/app/actions/auth")
    const synced = await syncSessionJwt()
    if (synced.ok) token = (await cookies()).get(JWT_COOKIE_NAME)?.value
  }
  if (!token || !profileId?.trim()) return false
  try {
    const res = await apiFetchWithAuth<{ bookmarked: boolean }>(`/api/v1/bookmarks/${encodeURIComponent(profileId)}/status`, token, {
      cache: "no-store",
    })
    return res.data?.bookmarked ?? false
  } catch {
    return false
  }
}