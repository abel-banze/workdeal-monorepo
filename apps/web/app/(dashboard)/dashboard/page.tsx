import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"

export default async function DashboardRootPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>
}) {
  const session = await requireAuth()
  const params = searchParams ? await searchParams : {}
  const query = new URLSearchParams()
  if (params.welcome === "1") query.set("welcome", "1")
  const qs = query.size > 0 ? `?${query.toString()}` : ""

  // A organização é a área de prioridade: se o utilizador pertence a uma,
  // aterra directamente nela. Sem org, cai no dashboard pessoal.
  let orgTarget: string | null = null
  try {
    const { listUserOrganizations } = await import("@workdeal/auth/repository")
    const orgs = await listUserOrganizations(session.user.id)
    const firstOrg = orgs[0]
    if (firstOrg?.id) orgTarget = `/dashboard/${firstOrg.id}${qs}`
  } catch {
    // fallback silencioso para o dashboard pessoal se a listagem falhar
  }

  redirect(orgTarget ?? `/dashboard/personal${qs}`)
}