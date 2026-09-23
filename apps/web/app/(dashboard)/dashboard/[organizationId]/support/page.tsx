import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { SupportManager } from "./support-manager"

export type TicketListItem = {
  id: string
  subject: string
  category: string
  status: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

export type TicketMessage = {
  id: string
  senderUserId: string
  body: string
  isInternal: boolean
  createdAt: string
  senderName: string | null
}

export type FeedbackListItem = {
  id: string
  kind: string
  message: string
  status: string
  createdAt: string
}

export default async function SupportPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>
  searchParams: Promise<{ tab?: string; ticket?: string }>
}) {
  const { organizationId } = await params
  const { tab, ticket } = await searchParams
  const session = await requireAuth()

  const isPersonal = organizationId === "personal"
  let orgName: string | null = null
  if (!isPersonal) {
    const role = await getOrgRole(session.user.id, organizationId)
    if (!role) notFound()
    const { listUserOrganizations } = await import("@workdeal/auth/repository")
    const orgs = await listUserOrganizations(session.user.id)
    orgName = orgs.find((o) => o.id === organizationId)?.name ?? null
    if (!orgName) notFound()
  }

  let tickets: TicketListItem[] = []
  let feedbacks: FeedbackListItem[] = []
  try {
    const { apiFetch } = await import("@/lib/api")
    const tRes = await apiFetch<TicketListItem[]>("/api/v1/support/my?limit=50", { cache: "no-store" }).catch(() => ({ data: [] as TicketListItem[] }) as never)
    tickets = (tRes.data ?? []) as TicketListItem[]
    const fRes = await apiFetch<FeedbackListItem[]>("/api/v1/feedback/my?limit=50", { cache: "no-store" }).catch(() => ({ data: [] as FeedbackListItem[] }) as never)
    feedbacks = (fRes.data ?? []) as FeedbackListItem[]
  } catch {
    tickets = []
    feedbacks = []
  }

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-5 pb-5">
      <SupportManager
        initialTickets={tickets}
        initialFeedbacks={feedbacks}
        organizationId={isPersonal ? null : organizationId}
        orgName={isPersonal ? "Pessoal" : (orgName ?? organizationId)}
        userId={session.user.id}
        initialTab={tab === "feedback" ? "feedback" : "tickets"}
        initialTicketId={ticket ?? null}
      />
    </div>
  )
}
