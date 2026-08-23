"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { createReportSchema } from "@workdeal/shared"
import type { CreateReportInput } from "@workdeal/shared"
import { apiFetchWithAuth } from "@/lib/api"
import { requireAuth } from "@/lib/auth"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function createReport(input: CreateReportInput) {
  const session = await requireAuth()
  const data = createReportSchema.parse(input)
  const token = await getAuthToken()

  const res = await apiFetchWithAuth("/api/v1/reports", token, {
    method: "POST",
    body: JSON.stringify(data),
  })

  return res
}
