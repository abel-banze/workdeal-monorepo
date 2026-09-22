"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { apiFetchWithAuth, apiFetch } from "@/lib/api"
import { requireAuth } from "@/lib/auth"
import { notificationPrefsSchema, type NotificationPrefs } from "@workdeal/shared"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function getOrganizationNotificationPrefs(organizationId: string): Promise<NotificationPrefs> {
  await requireAuth()
  const res = await apiFetch<NotificationPrefs>(`/api/v1/organizations/${encodeURIComponent(organizationId)}/notification-prefs`, {
    cache: "no-store",
  })
  return notificationPrefsSchema.parse(res.data)
}

export async function updateOrganizationNotificationPrefs(organizationId: string, input: NotificationPrefs) {
  await requireAuth()
  const data = notificationPrefsSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/organizations/${encodeURIComponent(organizationId)}/notification-prefs`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}
