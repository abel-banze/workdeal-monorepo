import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { hasOrgPermission } from "@workdeal/shared"
import { EventsManager } from "./events-manager"

export type EventListItem = {
  id: string
  organizerProfileId: string
  categoryId: string | null
  title: string
  slug: string
  description: string
  startAt: string
  endAt: string
  isOnline: boolean
  onlineUrl: string | null
  venueName: string | null
  province: string | null
  district: string | null
  address: string | null
  coverImage: string | null
  capacity: number | null
  status: string
  registrationCount: number
  createdAt: string
}

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "draft", label: "Rascunhos" },
  { key: "published", label: "Publicados" },
  { key: "cancelled", label: "Cancelados" },
  { key: "ended", label: "Concluídos" },
]

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { organizationId } = await params
  const { status } = await searchParams
  const isPersonal = organizationId === "personal"
  const session = await requireAuth()

  let canManage = true
  let orgName: string | null = null
  let orgSlug: string | null = null
  if (!isPersonal) {
    const role = await getOrgRole(session.user.id, organizationId)
    if (!role || !hasOrgPermission(role, "events:manage")) notFound()
    canManage = true
    const { listUserOrganizations } = await import("@workdeal/auth/repository")
    const orgs = await listUserOrganizations(session.user.id)
    const org = orgs.find((o) => o.id === organizationId)
    if (!org) notFound()
    orgName = org.name
    orgSlug = org.slug
  }

  const allowed = STATUS_TABS.map((t) => t.key)
  const activeStatus = status && allowed.includes(status) ? status : "all"

  let categories: { id: string; name: string; slug: string }[] = []
  let events: EventListItem[] = []
  let organizerProfileId: string | null = null
  let organizerName: string | null = null
  try {
    const { apiFetch } = await import("@/lib/api")
    const cats = await apiFetch<{ id: string; name: string; slug: string }[]>("/api/v1/categories", { cache: "no-store" }).catch(() => ({ data: [] } as never))
    categories = (cats.data ?? []) as typeof categories

    if (isPersonal) {
      const me = await apiFetch<{ id: string; name: string } | null>("/api/v1/profiles/me", { cache: "no-store" }).catch(() => ({ data: null } as never))
      organizerProfileId = me.data?.id ?? null
      organizerName = me.data?.name ?? null
    } else if (orgSlug) {
      const pRes = await apiFetch<{ id: string; name: string; slug: string } | null>(`/api/v1/profiles/${encodeURIComponent(orgSlug)}`, { cache: "no-store" }).catch(() => ({ data: null } as never))
      let profile = pRes.data ?? null
      if (!profile) {
        const list = await apiFetch<{ items: { id: string; name: string; slug: string }[] }>("/api/v1/profiles?limit=50&groupId=all", { cache: "no-store" }).catch(() => ({ data: null } as never))
        const items = ((list.data as { items?: { id: string; name: string; slug: string }[] } | null)?.items ?? []) as { id: string; name: string; slug: string }[]
        profile = items.find((it) => it.slug === orgSlug) ?? null
      }
      organizerProfileId = profile?.id ?? null
      organizerName = profile?.name ?? null
    }

    const params = new URLSearchParams({ limit: "50" })
    if (activeStatus !== "all") params.set("status", activeStatus)
    const eRes = await apiFetch<{ items?: EventListItem[] }>(`/api/v1/events/my?${params.toString()}`, { cache: "no-store" }).catch(() => ({ data: null } as never))
    events = ((eRes.data as { items?: EventListItem[] } | null)?.items ?? []) as EventListItem[]
  } catch {
    events = []
  }

  const activeTab = STATUS_TABS.find((t) => t.key === activeStatus)

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-5 pb-10">
      <div className="rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">EVENTOS · {isPersonal ? "PESSOAL" : String(orgName ?? organizationId).toUpperCase()}</p>
        <h1 className="mt-2 text-[22px] font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Os meus eventos
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[#0F1A2E]/60">
          Cria eventos, publica para a comunidade e faz check-in aos inscritos.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-[16px] border border-[#D9D2C2] bg-white p-2">
        {STATUS_TABS.map((t) => {
          const active = t.key === activeStatus
          return (
            <a
              key={t.key}
              href={`/dashboard/${organizationId}/events${t.key === "all" ? "" : `?status=${t.key}`}`}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${active ? "bg-[#0F1A2E] text-white" : "text-[#0F1A2E]/60 hover:bg-[#F6F3EE] hover:text-[#0F1A2E]"}`}
            >
              {t.label}
            </a>
          )
        })}
        <span className="ml-auto self-center pr-2 text-xs font-semibold text-[#0F1A2E]/45">{activeTab?.label ?? "Todos"}</span>
      </div>

      <EventsManager
        initial={events}
        categories={categories}
        canManage={canManage}
        organizerProfileId={organizerProfileId}
        organizerName={organizerName}
        orgName={isPersonal ? "Pessoal" : (orgName ?? organizationId)}
      />
    </div>
  )
}