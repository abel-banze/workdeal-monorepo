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

const createSchema = z.object({ profileId: z.string().min(1), title: z.string().trim().min(2).max(80), description: z.string().trim().max(500).nullable().optional(), imageUrl: z.string().trim().url().max(512).nullable().optional() })
const updateSchema = z.object({ title: z.string().trim().min(2).max(80).optional(), description: z.string().trim().max(500).nullable().optional(), imageUrl: z.string().trim().url().max(512).nullable().optional() })

export async function listPortfolio(profileId: string) {
  return apiFetch(`/api/v1/portfolio/${encodeURIComponent(profileId)}`, { cache: "no-store" })
}

export async function createPortfolioItem(input: { profileId: string; title: string; description?: string | null; imageUrl?: string | null }) {
  await requireAuth()
  const data = createSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/portfolio", token, { method: "POST", body: JSON.stringify(data) })
}

export async function updatePortfolioItem(id: string, input: { title?: string; description?: string | null; imageUrl?: string | null }) {
  await requireAuth()
  const data = updateSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/portfolio/${encodeURIComponent(id)}`, token, { method: "PATCH", body: JSON.stringify(data) })
}

export async function deletePortfolioItem(id: string) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/portfolio/${encodeURIComponent(id)}`, token, { method: "DELETE" })
}
