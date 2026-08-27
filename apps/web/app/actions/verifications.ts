"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { z } from "zod"
import { apiFetchWithAuth } from "@/lib/api"
import { requireAuth } from "@/lib/auth"

const requestSchema = z.object({
  profileId: z.string().min(1),
  documents: z.array(z.unknown()).max(5).default([]),
  level: z.enum(["level1", "level2"]).default("level1"),
})

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function requestVerification(input: { profileId: string; documents?: unknown[]; level?: "level1" | "level2" }) {
  const session = await requireAuth()
  const data = requestSchema.parse(input)
  const token = await getAuthToken()
  const res = await apiFetchWithAuth("/api/v1/verifications/request", token, {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res
}

export async function getMyVerifications() {
  const session = await requireAuth()
  const token = await getAuthToken()
  const res = await apiFetchWithAuth("/api/v1/verifications/my", token, {
    method: "GET",
  })
  return res
}
