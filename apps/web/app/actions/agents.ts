"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { AI_API_TIMEOUT_MS, apiFetchWithAuth } from "@/lib/api"
import { requireAuth } from "@/lib/auth"
import { requireFeature } from "@/lib/features"
import { assistantChatSchema, profileAssistantChatSchema, proposalDraftSchema, responseDraftSchema } from "@workdeal/shared"
import { z } from "zod"

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

/** Chat com o Assistente Comercial (draft efémero — nunca persiste). */
export async function chatWithAssistant(input: z.infer<typeof assistantChatSchema>) {
  await requireAuth()
  // Pré-check amigável (a API Hono mantém-se o ponto único de enforcement).
  await requireFeature(input.organizationId ?? null, "ai_assistant")
  const data = assistantChatSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth<{ reply: string }>("/api/v1/ai/assistant/chat", token, { method: "POST", body: JSON.stringify(data), timeoutMs: AI_API_TIMEOUT_MS })
}

/** Rascunho de proposta preenchido num formulário (o utilizador revê e envia). */
export async function draftProposalAction(input: Omit<z.infer<typeof proposalDraftSchema>, "providerProfileId"> & { providerProfileId?: string }) {
  await requireAuth()
  await requireFeature(input.organizationId ?? null, "ai_proposal_generation")
  const providerProfileId = input.providerProfileId ?? (await resolveProviderProfileId())
  const data = proposalDraftSchema.parse({ ...input, providerProfileId })
  const token = await getAuthToken()
  return apiFetchWithAuth<{ message: string }>("/api/v1/ai/proposals/draft", token, { method: "POST", body: JSON.stringify(data), timeoutMs: AI_API_TIMEOUT_MS })
}

async function resolveProviderProfileId(): Promise<string> {
  const me = await apiFetchWithAuth<{ id: string } | null>("/api/v1/profiles/me", await getAuthToken(), { cache: "no-store" as const })
  const providerProfileId = me.data?.id
  if (!providerProfileId) throw new Error("Cria primeiro o teu perfil antes de gerar um rascunho de proposta.")
  return providerProfileId
}

/** Rascunho de resposta a um pedido de orçamento/oportunidade/contacto. */
export async function draftResponseAction(input: z.infer<typeof responseDraftSchema>) {
  await requireAuth()
  await requireFeature(input.organizationId ?? null, "ai_response_support")
  const data = responseDraftSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth<{ message: string }>("/api/v1/ai/responses/draft", token, { method: "POST", body: JSON.stringify(data), timeoutMs: AI_API_TIMEOUT_MS })
}

/** Chat com o assistente de IA de um perfil público (visitor autenticado). */
export async function chatWithCompanyAssistant(input: z.infer<typeof profileAssistantChatSchema>, slug: string) {
  await requireAuth()
  const data = profileAssistantChatSchema.parse(input)
  const token = await getAuthToken()
  return apiFetchWithAuth<{ reply: string; suggest: "none" | "quote" | "whatsapp" | "bookmark" }>(
    `/api/v1/profiles/${encodeURIComponent(slug)}/assistant/chat`,
    token,
    { method: "POST", body: JSON.stringify(data), timeoutMs: AI_API_TIMEOUT_MS },
  )
}