"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { verificationRequestSchema } from "@workdeal/shared"
import { apiFetchWithAuth } from "@/lib/api"
import { requireAuth } from "@/lib/auth"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function requestVerification(input: {
  profileId: string
  documents?: Array<{ type: string; fileId: string; url: string; name?: string }>
  level?: "level1" | "level2"
}) {
  await requireAuth()
  const data = verificationRequestSchema.parse(input)
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
