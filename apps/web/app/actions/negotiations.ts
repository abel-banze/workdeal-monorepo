"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { z } from "zod"
import { apiFetchWithAuth, apiFetch } from "@/lib/api"
import { requireAuth } from "@/lib/auth"
import {
  createThreadSchema,
  negotiationListMessagesQuerySchema,
  negotiationListThreadsQuerySchema,
  sendNegotiationMessageSchema,
} from "@workdeal/shared"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function openThread(input: z.infer<typeof createThreadSchema>) {
  await requireAuth()
  const data = createThreadSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/negotiations/open", token, { method: "POST", body: JSON.stringify(data) })
}

export async function listNegotiations(query: z.infer<typeof negotiationListThreadsQuerySchema> = {}) {
  await requireAuth()
  const q = negotiationListThreadsQuerySchema.parse(query)
  const params = new URLSearchParams()
  if (q.role) params.set("role", q.role)
  if (q.status) params.set("status", q.status)
  if (q.page) params.set("page", String(q.page))
  if (q.limit) params.set("limit", String(q.limit))
  const qs = params.toString()
  return apiFetch(`/api/v1/negotiations${qs ? `?${qs}` : ""}`, { cache: "no-store" })
}

export async function getNegotiation(threadId: string) {
  await requireAuth()
  return apiFetch(`/api/v1/negotiations/${encodeURIComponent(threadId)}`, { cache: "no-store" })
}

export async function listNegotiationMessages(threadId: string, query: z.infer<typeof negotiationListMessagesQuerySchema> = {}) {
  await requireAuth()
  const q = negotiationListMessagesQuerySchema.parse(query)
  const params = new URLSearchParams()
  if (q.page) params.set("page", String(q.page))
  if (q.limit) params.set("limit", String(q.limit))
  const qs = params.toString()
  return apiFetch(`/api/v1/negotiations/${encodeURIComponent(threadId)}/messages${qs ? `?${qs}` : ""}`, { cache: "no-store" })
}

export async function sendNegotiationMessage(threadId: string, input: z.infer<typeof sendNegotiationMessageSchema>) {
  await requireAuth()
  const data = sendNegotiationMessageSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/negotiations/${encodeURIComponent(threadId)}/messages`, token, {
    method: "POST",
    body: JSON.stringify(data),
  })
}