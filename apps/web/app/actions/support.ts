"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { apiFetchWithAuth, apiFetch } from "@/lib/api"
import { requireAuth } from "@/lib/auth"
import {
  createSupportTicketSchema,
  replySupportTicketSchema,
  createFeedbackSchema,
  type CreateSupportTicketInput,
  type CreateFeedbackInput,
} from "@workdeal/shared"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function createSupportTicket(input: CreateSupportTicketInput) {
  await requireAuth()
  const data = createSupportTicketSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/support", token, { method: "POST", body: JSON.stringify(data) })
}

export async function listMySupportTickets(query: { status?: string; page?: number; limit?: number } = {}) {
  await requireAuth()
  const params = new URLSearchParams()
  if (query.status) params.set("status", query.status)
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))
  const qs = params.toString()
  return apiFetch(`/api/v1/support/my${qs ? `?${qs}` : ""}`, { cache: "no-store" })
}

export async function getSupportTicket(id: string) {
  await requireAuth()
  return apiFetch(`/api/v1/support/my/${encodeURIComponent(id)}`, { cache: "no-store" })
}

export async function replySupportTicket(id: string, message: string) {
  await requireAuth()
  const data = replySupportTicketSchema.parse({ message })
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/support/my/${encodeURIComponent(id)}/replies`, token, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function closeSupportTicket(id: string) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/support/my/${encodeURIComponent(id)}/close`, token, { method: "POST" })
}

export async function submitFeedback(input: CreateFeedbackInput) {
  await requireAuth()
  const data = createFeedbackSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/feedback", token, { method: "POST", body: JSON.stringify(data) })
}

export async function listMyFeedback(query: { page?: number; limit?: number } = {}) {
  await requireAuth()
  const params = new URLSearchParams()
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))
  const qs = params.toString()
  return apiFetch(`/api/v1/feedback/my${qs ? `?${qs}` : ""}`, { cache: "no-store" })
}
