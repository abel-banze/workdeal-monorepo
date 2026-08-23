"use server"

import { cookies } from "next/headers"
import { revalidateTag } from "next/cache"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { apiFetchWithAuth } from "@/lib/api"
import { requireAuth } from "@/lib/auth"

const REVALIDATE_PROFILE: string | { expire: number } = "max"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function followProfile(profileId: string) {
  const session = await requireAuth()
  if (!profileId?.trim()) throw new Error("ID do perfil obrigatório")
  const token = await getAuthToken()

  const res = await apiFetchWithAuth(`/api/v1/follows/${encodeURIComponent(profileId)}`, token, {
    method: "POST",
  })

  revalidateTag(`profile:${profileId}`, REVALIDATE_PROFILE)
  return res
}

export async function unfollowProfile(profileId: string) {
  const session = await requireAuth()
  if (!profileId?.trim()) throw new Error("ID do perfil obrigatório")
  const token = await getAuthToken()

  const res = await apiFetchWithAuth(`/api/v1/follows/${encodeURIComponent(profileId)}`, token, {
    method: "DELETE",
  })

  revalidateTag(`profile:${profileId}`, REVALIDATE_PROFILE)
  return res
}
