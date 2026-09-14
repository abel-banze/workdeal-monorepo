import "server-only"
import { cache } from "react"
import { apiFetch } from "@/lib/api"
import { requireAuth } from "@/lib/auth"

/**
 * Estado de features do âmbito (UI reflecte; o gate/autorização real vive na API Hono).
 * A API é o ponto único de enforcement — estes helpers servem para desenhar a UI
 * (mostrar gating/upgrade) e para um pré-check amigável em Server Actions com scope
 * de organização conhecido. Nunca autorizam por si só.
 */

export interface FeatureAccessEntry {
  key: string
  label: string
  entitled: boolean
  enabled: boolean
  accessible: boolean
}

/** Busca do endpoint de subscrição actual (o envelope já vem com featureAccess). */
const fetchFeatureAccess = cache(async (organizationId: string | null): Promise<FeatureAccessEntry[]> => {
  await requireAuth()
  const qs = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ""
  const res = await apiFetch<{ featureAccess: FeatureAccessEntry[] | undefined }>(
    `/api/v1/subscriptions/current${qs}`,
    { cache: "no-store" },
  )
  return res.data?.featureAccess ?? []
})

export async function getFeatureAccess(organizationId: string | null): Promise<Map<string, FeatureAccessEntry>> {
  const items = await fetchFeatureAccess(organizationId)
  return new Map(items.map((e) => [e.key, e]))
}

export async function featureAccessible(organizationId: string | null, key: string): Promise<boolean> {
  const map = await getFeatureAccess(organizationId)
  return map.get(key)?.accessible ?? false
}

/**
 * Pré-check amigável para Server Actions com scope de org conhecido.
 * Não substitui o gate da API — só falha cedo com mensagem clara.
 */
export async function requireFeature(organizationId: string | null, key: string, message?: string): Promise<FeatureAccessEntry> {
  const map = await getFeatureAccess(organizationId)
  const entry = map.get(key)
  if (!entry?.accessible) {
    throw new Error(message ?? "Funcionalidade indisponível para a sua subscrição")
  }
  return entry
}