"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { apiFetchWithAuth } from "@/lib/api"
import { requireAuth } from "@/lib/auth"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada")
  return token
}

export async function createProfileLocation(input: {
  profileId: string
  organizationId?: string | null
  province: string
  district?: string | null
  bairro?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  label?: string | null
  isPrimary?: boolean
  visibility?: "exact" | "zone"
}) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/profile-locations", token, { method: "POST", body: JSON.stringify(input) })
}

export async function updateProfileLocation(
  id: string,
  input: {
    province?: string
    district?: string | null
    bairro?: string | null
    address?: string | null
    latitude?: number | null
    longitude?: number | null
    label?: string | null
    isPrimary?: boolean
    visibility?: "exact" | "zone"
  },
) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/profile-locations/${encodeURIComponent(id)}`, token, { method: "PATCH", body: JSON.stringify(input) })
}

export async function deleteProfileLocation(id: string) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/profile-locations/${encodeURIComponent(id)}`, token, { method: "DELETE" })
}

export async function setProfileTags(input: { profileId: string; tagSlugs: string[]; organizationId?: string | null }) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/tags/profile", token, { method: "POST", body: JSON.stringify(input) })
}

export async function getProfileTags(profileId: string) {
  const token = await getAuthToken().catch(() => null)
  const { apiFetch } = await import("@/lib/api")
  if (token) {
    return apiFetchWithAuth(`/api/v1/tags/profile/${encodeURIComponent(profileId)}`, token)
  }
  return apiFetch(`/api/v1/tags/profile/${encodeURIComponent(profileId)}`)
}
