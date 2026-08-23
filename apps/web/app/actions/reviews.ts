"use server"

import { cookies } from "next/headers"
import { revalidateTag } from "next/cache"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { createReviewSchema } from "@workdeal/shared"

const REVALIDATE_PROFILE: string | { expire: number } = "max"
import type { CreateReviewInput } from "@workdeal/shared"
import { apiFetchWithAuth } from "@/lib/api"
import { requireAuth } from "@/lib/auth"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function createReview(input: CreateReviewInput) {
  const session = await requireAuth()
  const data = createReviewSchema.parse(input)
  const token = await getAuthToken()

  const res = await apiFetchWithAuth("/api/v1/reviews", token, {
    method: "POST",
    body: JSON.stringify(data),
  })

  revalidateTag(`profile:${data.profileId}`, REVALIDATE_PROFILE)
  revalidateTag("reviews", REVALIDATE_PROFILE)
  return res
}

export async function deleteReview(reviewId: string) {
  const session = await requireAuth()
  if (!reviewId?.trim()) throw new Error("ID da avaliação obrigatório")
  const token = await getAuthToken()

  const res = await apiFetchWithAuth(`/api/v1/reviews/${encodeURIComponent(reviewId)}`, token, {
    method: "DELETE",
  })

  revalidateTag("reviews", REVALIDATE_PROFILE)
  return res
}
