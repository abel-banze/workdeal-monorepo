import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { hasOrgPermission } from "@workdeal/shared"
import { OpportunitiesManager } from "./opportunities-manager"

export type ProposalSentItem = {
  id: string
  taskId: string
  providerProfileId: string
  taskTitle: string | null
  taskStatus: string | null
  requesterUserName: string | null
  message: string
  priceMzn: number | null
  estimatedDays: number | null
  status: string
  createdAt: string
}

export type BidWonItem = {
  id: string
  taskId: string
  requesterUserName: string | null
  taskTitle: string | null
  taskStatus: string | null
  agreedPriceMzn: number
  agreedDeadlineAt: string | null
  status: string
  reviewNote: string | null
  createdAt: string
}

const TABS: { key: string; label: string }[] = [
  { key: "proposals", label: "Propostas enviadas" },
  { key: "bids", label: "Adjudicações ganhas" },
]

export default async function OpportunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { organizationId } = await params
  const { tab } = await searchParams
  const isPersonal = organizationId === "personal"
  const session = await requireAuth()

  let canManage = isPersonal
  let orgName: string | null = null
  if (!isPersonal) {
    const role = await getOrgRole(session.user.id, organizationId)
    if (!role || !hasOrgPermission(role, "tasks:view")) notFound()
    canManage = hasOrgPermission(role, "tasks:manage")
    const { listUserOrganizations } = await import("@workdeal/auth/repository")
    const orgs = await listUserOrganizations(session.user.id)
    orgName = orgs.find((o) => o.id === organizationId)?.name ?? null
  }

  const activeTab = TABS.some((t) => t.key === tab) ? tab! : "proposals"

  let proposals: ProposalSentItem[] = []
  let bids: BidWonItem[] = []
  try {
    const { apiFetch } = await import("@/lib/api")
    if (activeTab === "proposals") {
      const pRes = await apiFetch<{ items?: ProposalSentItem[] }>("/api/v1/tasks/proposals?role=sent&limit=50", { cache: "no-store" }).catch(() => ({ data: null } as never))
      proposals = (pRes.data as { items?: ProposalSentItem[] } | null)?.items ?? []
    } else {
      const bRes = await apiFetch<{ items?: BidWonItem[] }>("/api/v1/tasks/bids?role=provider&limit=50", { cache: "no-store" }).catch(() => ({ data: null } as never))
      bids = (bRes.data as { items?: BidWonItem[] } | null)?.items ?? []
    }
  } catch {
    proposals = []
    bids = []
  }

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-5 pb-10">
      <div className="rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">OPORTUNIDADES · {isPersonal ? "PESSOAL" : String(orgName ?? organizationId).toUpperCase()}</p>
        <h1 className="mt-2 text-[22px] font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Propostas e adjudicações
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[#0F1A2E]/60">
          Acompanha as propostas que enviaste e os trabalhos que ganhaste — desde a adjudicação até à conclusão.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-[16px] border border-[#D9D2C2] bg-white p-2">
        {TABS.map((t) => {
          const active = t.key === activeTab
          return (
            <a
              key={t.key}
              href={`/dashboard/${organizationId}/opportunities${t.key === "proposals" ? "" : `?tab=${t.key}`}`}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${active ? "bg-[#0F1A2E] text-white" : "text-[#0F1A2E]/60 hover:bg-[#F6F3EE] hover:text-[#0F1A2E]"}`}
            >
              {t.label}
            </a>
          )
        })}
      </div>

      <OpportunitiesManager activeTab={activeTab} initialProposals={proposals} initialBids={bids} canManage={canManage} organizationId={organizationId} />
    </div>
  )
}