import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { hasOrgPermission } from "@workdeal/shared"
import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
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
      const pRes = await apiFetch<ProposalSentItem[]>("/api/v1/tasks/proposals?role=sent&limit=50", { cache: "no-store" }).catch(() => ({ data: [] as ProposalSentItem[] } as never))
      proposals = (pRes.data ?? []) as ProposalSentItem[]
    } else {
      const bRes = await apiFetch<BidWonItem[]>("/api/v1/tasks/bids?role=provider&limit=50", { cache: "no-store" }).catch(() => ({ data: [] as BidWonItem[] } as never))
      bids = (bRes.data ?? []) as BidWonItem[]
    }
  } catch {
    proposals = []
    bids = []
  }

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-5 pb-10">
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Oportunidades · {isPersonal ? "Pessoal" : (orgName ?? organizationId)}</p>
          <CardTitle className="text-xl">Propostas e adjudicações</CardTitle>
          <CardDescription>
            Acompanha as propostas que enviaste e os trabalhos que ganhaste — desde a adjudicação até à conclusão.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1.5">
        {TABS.map((t) => {
          const active = t.key === activeTab
          return (
            <a
              key={t.key}
              href={`/dashboard/${organizationId}/opportunities${t.key === "proposals" ? "" : `?tab=${t.key}`}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
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