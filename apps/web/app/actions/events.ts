"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { z } from "zod"
import { apiFetchWithAuth, apiFetch } from "@/lib/api"
import { requireAuth } from "@/lib/auth"
import { createEventSchema, eventStatusSchema, updateEventRegistrationSchema } from "@workdeal/shared"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function createEvent(input: z.infer<typeof createEventSchema>) {
  await requireAuth()
  const data = createEventSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/events", token, { method: "POST", body: JSON.stringify(data) })
}

export async function updateEvent(id: string, input: Record<string, unknown>) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/events/${encodeURIComponent(id)}`, token, { method: "PATCH", body: JSON.stringify(input) })
}

export async function listMyEvents(query: { status?: z.infer<typeof eventStatusSchema>; page?: number; limit?: number } = {}) {
  await requireAuth()
  const params = new URLSearchParams()
  if (query.status) params.set("status", query.status)
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))
  const qs = params.toString()
  return apiFetch(`/api/v1/events/my${qs ? `?${qs}` : ""}`, { cache: "no-store" })
}

export async function listEventRegistrations(eventId: string, query: { status?: string; page?: number; limit?: number } = {}) {
  await requireAuth()
  const params = new URLSearchParams()
  if (query.status) params.set("status", query.status)
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))
  const qs = params.toString()
  return apiFetch(`/api/v1/events/${encodeURIComponent(eventId)}/registrations${qs ? `?${qs}` : ""}`, { cache: "no-store" })
}

export async function updateRegistrationStatus(input: { registrationId: string; status: "cancelled" | "checked_in" }) {
  await requireAuth()
  const data = updateEventRegistrationSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/events/registrations/${encodeURIComponent(input.registrationId)}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function registerForEvent(eventId: string) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/events/${encodeURIComponent(eventId)}/registrations`, token, {
    method: "POST",
    body: JSON.stringify({ eventId }),
  })
}

export async function cancelMyRegistration(eventId: string) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/events/${encodeURIComponent(eventId)}/registrations`, token, {
    method: "DELETE",
  })
}