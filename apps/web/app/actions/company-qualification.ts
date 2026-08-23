"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { companyQualificationSchema } from "@workdeal/shared/schemas/company"
import { apiFetchWithAuth } from "@/lib/api"
import { requireAuth } from "@/lib/auth"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada")
  return token
}

export async function upsertCompanyQualification(input: {
  organizationId: string
  profileId?: string | null
  workers: number
  turnoverMzn?: number | null
  foundedYear?: number | null
  legalForm?: string | null
  nuit?: string | null
  alvara?: string | null
  capitalSocialMzn?: number | null
  licenses?: string[] | null
}) {
  await requireAuth()
  const parsed = companyQualificationSchema.extend({
    organizationId: (await import("zod")).z.string().min(1),
    profileId: (await import("zod")).z.string().min(1).nullable().optional(),
  }).parse(input) as unknown as typeof input & { organizationId: string }

  const token = await getAuthToken()
  const res = await apiFetchWithAuth("/api/v1/company-qualification", token, {
    method: "POST",
    body: JSON.stringify(parsed),
  })
  return res
}

export async function getCompanyQualification(organizationId: string) {
  await requireAuth()
  const token = await getAuthToken()
  const res = await apiFetchWithAuth(`/api/v1/company-qualification/${encodeURIComponent(organizationId)}`, token)
  return res
}
