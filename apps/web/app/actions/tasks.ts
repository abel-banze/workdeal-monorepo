"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { z } from "zod"
import { apiFetchWithAuth, apiFetch } from "@/lib/api"
import { requireAuth } from "@/lib/auth"
import {
  createBidSchema,
  createProposalSchema,
  createTaskSchema,
  taskStatusSchema,
  updateBidStatusSchema,
  updateProposalStatusSchema,
} from "@workdeal/shared"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function createTask(input: z.infer<typeof createTaskSchema>) {
  await requireAuth()
  const data = createTaskSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/tasks", token, { method: "POST", body: JSON.stringify(data) })
}

export async function updateTask(id: string, input: Record<string, unknown>) {
  await requireAuth()
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/tasks/${encodeURIComponent(id)}`, token, { method: "PATCH", body: JSON.stringify(input) })
}

export async function listMyTasks(query: { status?: z.infer<typeof taskStatusSchema>; page?: number; limit?: number } = {}) {
  await requireAuth()
  const params = new URLSearchParams()
  if (query.status) params.set("status", query.status)
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))
  const qs = params.toString()
  return apiFetch(`/api/v1/tasks/my${qs ? `?${qs}` : ""}`, { cache: "no-store" })
}

export async function listTaskProposals(taskId: string, query: { status?: string; page?: number; limit?: number } = {}) {
  await requireAuth()
  const params = new URLSearchParams()
  if (query.status) params.set("status", query.status)
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))
  const qs = params.toString()
  return apiFetch(`/api/v1/tasks/${encodeURIComponent(taskId)}/proposals${qs ? `?${qs}` : ""}`, { cache: "no-store" })
}

export async function setProposalStatus(input: { taskId: string; proposalId: string; status: "shortlisted" | "rejected" }) {
  await requireAuth()
  const data = updateProposalStatusSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/tasks/${encodeURIComponent(input.taskId)}/proposals/${encodeURIComponent(input.proposalId)}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function acceptProposal(input: z.infer<typeof createBidSchema> & { taskId: string }) {
  await requireAuth()
  const { taskId, ...rest } = input
  const data = createBidSchema.parse(rest)
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/tasks/${encodeURIComponent(taskId)}/proposals/${encodeURIComponent(data.proposalId)}/bid`, token, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export type SendableProfile = { id: string; name: string; kind: "personal" | "company" };

/** Perfis em nome dos quais o utilizador pode propor: pessoal + empresas onde é membro. */
export async function listSendableProfiles(): Promise<SendableProfile[]> {
  const session = await requireAuth()
  const out: SendableProfile[] = []
  const me = await apiFetch<{ id: string; name: string } | null>("/api/v1/profiles/me", { cache: "no-store" }).catch(
    () => ({ data: null }) as never,
  )
  if (me?.data) out.push({ id: me.data.id, name: me.data.name, kind: "personal" })
  const { listUserOrganizations } = await import("@workdeal/auth/repository")
  const orgs = await listUserOrganizations(session.user.id).catch(() => [])
  for (const org of orgs) {
    const p = await apiFetch<{ id: string; name: string } | null>(
      `/api/v1/profiles/by-organization/${encodeURIComponent(org.id)}`,
      { cache: "no-store" },
    ).catch(() => null)
    if (p?.data) out.push({ id: p.data.id, name: p.data.name ?? org.name, kind: "company" })
  }
  return [...new Map(out.map((p) => [p.id, p])).values()]
}

export async function submitProposal(input: {
  taskId: string
  providerProfileId: string
  message: string
  priceMzn?: number | null
  estimatedDays?: number | null
}) {
  await requireAuth()
  const allowed = await listSendableProfiles()
  if (allowed.length === 0) throw new Error("Cria primeiro o teu perfil antes de propores a uma tarefa.")
  if (!allowed.some((p) => p.id === input.providerProfileId)) {
    throw new Error("Escolhe um dos teus perfis para enviar a proposta.")
  }
  const data = createProposalSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/tasks/${encodeURIComponent(data.taskId)}/proposals`, token, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function listMyProposals(query: { status?: string; page?: number; limit?: number } = {}) {
  await requireAuth()
  const params = new URLSearchParams({ role: "sent" })
  if (query.status) params.set("status", query.status)
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))
  return apiFetch(`/api/v1/tasks/proposals?${params.toString()}`, { cache: "no-store" })
}

export async function listMyBids(query: { role?: "provider" | "requester"; status?: string; page?: number; limit?: number } = {}) {
  await requireAuth()
  const params = new URLSearchParams({ role: query.role ?? "provider" })
  if (query.status) params.set("status", query.status)
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))
  return apiFetch(`/api/v1/tasks/bids?${params.toString()}`, { cache: "no-store" })
}

export async function updateBidStatus(input: { id: string; status: string; reviewNote?: string | null }) {
  await requireAuth()
  const data = updateBidStatusSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth(`/api/v1/tasks/bids/${encodeURIComponent(input.id)}`, token, { method: "PATCH", body: JSON.stringify(data) })
}