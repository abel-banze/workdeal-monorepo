import { notFound, redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { hasOrgPermission } from "@workdeal/shared"
import { PortfolioManager } from "./portfolio-manager"

export default async function PortfolioPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params
  if (organizationId === "personal") redirect("/dashboard/profile/edit")
  const session = await requireAuth()
  const role = await getOrgRole(session.user.id, organizationId)
  if (!role) notFound()
  if (!hasOrgPermission(role, "profile:edit")) notFound()

  const { listUserOrganizations } = await import("@workdeal/auth/repository")
  const orgs = await listUserOrganizations(session.user.id)
  const org = orgs.find((o) => o.id === organizationId)
  if (!org) notFound()

  let profile: { id: string; slug: string; name: string } | null = null
  let items: { id: string; title: string; description: string | null; imageUrl: string | null; sortOrder: number }[] = []
  try {
    const { apiFetch } = await import("@/lib/api")
    const pRes = await apiFetch<{ id: string; slug: string; name: string } | null>(`/api/v1/profiles/${encodeURIComponent(org.slug)}`, { cache: "no-store" }).catch(() => ({ data: null } as never))
    profile = pRes.data ?? null
    if (!profile) {
      const list = await apiFetch<{ items: { id: string; slug: string; name: string }[] }>(`/api/v1/profiles?limit=50`, { cache: "no-store" }).catch(() => ({ data: { items: [] } } as never))
      const found = (list.data?.items ?? []).find((it) => it.slug === org.slug) ?? null
      profile = found as never
    }
    if (profile?.id) {
      const { apiFetch: af } = await import("@/lib/api")
      const pr = await af<{ id: string; title: string; description: string | null; imageUrl: string | null; sortOrder: number }[]>(`/api/v1/portfolio/${encodeURIComponent(profile.id)}`, { cache: "no-store" }).catch(() => ({ data: [] } as never))
      items = (pr as { data?: typeof items }).data ?? []
    }
  } catch {}

  if (!profile) {
    return (
      <div className="mx-auto max-w-[760px] rounded-[20px] border border-dashed border-[#D9D2C2] bg-white p-8 text-center">
        <p className="text-sm font-bold text-[#0F1A2E]">Sem perfil</p>
        <p className="text-xs text-[#0F1A2E]/60">Cria o perfil da empresa primeiro.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[880px] space-y-5 pb-10">
      <div className="rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">PORTFÓLIO · {org.name}</p>
        <h1 className="mt-2 text-[22px] font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Obras e casos
        </h1>
        <p className="mt-1 text-sm text-[#0F1A2E]/60">
          Até 12 itens. Cada um com título, descrição e imagem. Conta para o selo <span className="font-semibold text-[#0F1A2E]">perfil-completo</span> (precisa ≥1).
        </p>
      </div>
      <PortfolioManager profileId={profile.id} initial={items} />
    </div>
  )
}
