"use server"

import { cookies } from "next/headers"
import { revalidateTag } from "next/cache"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { createProfileSchema, updateProfileSchema } from "@workdeal/shared"
import type { CreateProfileInput, UpdateProfileInput } from "@workdeal/shared"
import { apiFetchWithAuth, apiFetch } from "@/lib/api"
import { requireAuth } from "@/lib/auth"

const CV_COOKIE_NAME = "wd_verified_contacts"

// Helpers
async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function createProfile(input: CreateProfileInput) {
  const session = await requireAuth()
  const data = createProfileSchema.parse(input)
  const token = await getAuthToken()

  const res = await apiFetchWithAuth("/api/v1/profiles", token, {
    method: "POST",
    body: JSON.stringify(data),
  })

  // P0-4: revalidação específica por tag (AGENTS §2.2)
  revalidateTag("profiles", "max")
  revalidateTag("categories", "max")
  return res
}

export async function updateProfile(slug: string, input: UpdateProfileInput) {
  const session = await requireAuth()
  const data = updateProfileSchema.parse(input)
  const token = await getAuthToken()

  if (!slug?.trim()) throw new Error("Slug obrigatório")

  // Encaminha os tokens HMAC dos contactos verificados via OTP (cookie httpOnly)
  // para o backend persistir profile_contact_verification — mesmo bind do onboarding.
  const store = await cookies()
  const verified = store.get(CV_COOKIE_NAME)?.value ?? null

  const res = await apiFetchWithAuth(`/api/v1/profiles/${encodeURIComponent(slug)}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: verified ? { "x-verified-contacts": verified } : undefined,
  })

  revalidateTag("profiles", "max")
  revalidateTag(`profile:${slug}`, "max")
  if (data.slug && data.slug !== slug) {
    revalidateTag(`profile:${data.slug}`, "max")
  }
  return res
}

export async function deleteProfile(slug: string) {
  const session = await requireAuth()
  if (!slug?.trim()) throw new Error("Slug obrigatório")
  const token = await getAuthToken()

  const res = await apiFetchWithAuth(`/api/v1/profiles/${encodeURIComponent(slug)}`, token, {
    method: "DELETE",
  })

  revalidateTag("profiles", "max")
  revalidateTag(`profile:${slug}`, "max")
  return res
}

export async function getMyProfile() {
  const session = await requireAuth()
  const token = await getAuthToken()
  // Tenta buscar perfil individual; se for empresa, o backend retorna via organizationId internamente quando existe org
  // Fazemos tentativa via list com filtro implícito: buscamos por slug do user? Alternativa: endpoint dedicado /api/v1/profiles/me
  // Por agora, usamos apiFetch com token e tentamos resolver via repository: fazemos chamada direta para /api/v1/profiles?limit=1 e filtramos client-side
  // Mas melhor: tenta buscar por categories e depois verifica existência via apiFetchWithAuth para /api/v1/profiles/me (se existir) — fallback para null
  try {
    const res = await apiFetchWithAuth<{ id: string; slug: string; name: string } | null>("/api/v1/profiles/me", token, { method: "GET" })
    return res.data
  } catch {
    return null
  }
}

export async function hasProfile(): Promise<boolean> {
  const p = await getMyProfile()
  return p !== null && p !== undefined
}
