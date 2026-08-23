"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { apiFetchWithAuth, apiFetch } from "@/lib/api"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada")
  return token
}

const createSchema = z.object({ profileId: z.string().min(1), title: z.string().trim().min(2).max(80), description: z.string().trim().max(500).nullable().optional(), priceMzn: z.number().int().min(0).max(100_000_000).nullable().optional(), imageUrl: z.string().trim().url().max(512).nullable().optional(), categoryId: z.string().min(1).nullable().optional() })
const updateSchema = z.object({ title: z.string().trim().min(2).max(80).optional(), description: z.string().trim().max(500).nullable().optional(), priceMzn: z.number().int().min(0).max(100_000_000).nullable().optional(), imageUrl: z.string().trim().url().max(512).nullable().optional(), categoryId: z.string().min(1).nullable().optional() })

export async function listServices(profileId: string) {
  return apiFetch(`/api/v1/services/${encodeURIComponent(profileId)}`, { cache: "no-store" })
}

export async function createService(input: { profileId: string; title: string; description?: string | null; priceMzn?: number | null; imageUrl?: string | null; categoryId?: string | null }) {
  await requireAuth()
  const data = createSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/services", token, { method: "POST", body: JSON.stringify(data) })
}

export async function updateService(id: string, input: { title?: string; description?: string | null; priceMzn?: number | null; imageUrl?: string | null; categoryId?: string | null }) {
  await requireAuth()
  const data = updateSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/services/${encodeURIComponent(id)}`, token, { method: "PATCH", body: JSON.stringify(data) })
}

export async function deleteService(id: string) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/services/${encodeURIComponent(id)}`, token, { method: "DELETE" })
}
