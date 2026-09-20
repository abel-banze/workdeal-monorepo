import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { featureAccessible } from "@/lib/features"
import { getOrgRole } from "@workdeal/auth/repository"
import { hasOrgPermission, TASK_CONTRACT_TYPE_LABELS_PT } from "@workdeal/shared"
import { TaskAgentSheet } from "@/components/features/task-agent-sheet"
import { ProposalsWorkspace } from "./proposals-workspace"
import { TASK_PROPOSALS_FETCH_LIMIT } from "./proposals-filter"
import { TaskBrief } from "./task-brief"

type ProviderBadgeLite = { slug: string; name: string; type: string }

type ProposalItem = {
  id: string
  taskId: string
  providerProfileId: string
  providerProfileName: string | null
  providerProfileSlug: string | null
  providerProfileLogo: string | null
  providerProvince: string | null
  providerDistrict: string | null
  providerBadges: ProviderBadgeLite[]
  message: string
  priceMzn: number | null
  estimatedDays: number | null
  status: string
  createdAt: string
}

type BidItem = {
  id: string
  taskId: string
  proposalId: string
  providerProfileId: string
  providerProfileName: string | null
  providerProfileSlug: string | null
  agreedPriceMzn: number
  agreedDeadlineAt: string | null
  status: string
  reviewNote: string | null
  createdAt: string
}

type TaskDetail = {
  id: string
  requesterUserId: string
  requesterOrganizationId: string | null
  categoryId: string | null
  title: string
  description: string
  priceMinMzn: number | null
  priceMaxMzn: number | null
  province: string | null
  district: string | null
  address: string | null
  dueAt: string | null
  proposalDeadlineAt: string | null
  contractType: string | null
  tags: { id: string; slug: string; name: string }[]
  status: string
  createdAt: string
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string; taskId: string }>
}) {
  const { organizationId, taskId } = await params
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

  let task: TaskDetail | null = null
  let proposals: ProposalItem[] = []
  let bid: BidItem | null = null
  let categories: { id: string; name: string }[] = []
  let error: string | null = null

  try {
    const { apiFetch } = await import("@/lib/api")
    const cats = await apiFetch<{ id: string; name: string }[]>("/api/v1/categories", { cache: "no-store" }).catch(() => ({ data: [] } as never))
    categories = (cats.data ?? []) as typeof categories

    const tRes = await apiFetch<TaskDetail | null>(`/api/v1/tasks/${encodeURIComponent(taskId)}`, { cache: "no-store" })
    task = tRes.data ?? null
    if (!task) notFound()
    const taskRow = task

    const isRequester = taskRow.requesterUserId === session.user.id
    if (isRequester) {
      const pRes = await apiFetch<ProposalItem[]>(`/api/v1/tasks/${encodeURIComponent(taskId)}/proposals?limit=${TASK_PROPOSALS_FETCH_LIMIT}`, { cache: "no-store" })
      proposals = (pRes.data ?? []).map((p) => ({
        ...p,
        providerProvince: p.providerProvince ?? null,
        providerDistrict: p.providerDistrict ?? null,
        providerBadges: p.providerBadges ?? [],
      }))
      const bRes = await apiFetch<BidItem[]>("/api/v1/tasks/bids?role=requester&limit=50", { cache: "no-store" }).catch(() => ({ data: [] as BidItem[] } as never))
      const items = (bRes.data ?? []) as BidItem[]
      bid = items.find((b) => b.taskId === taskRow.id) ?? null
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  if (!task) {
    return (
      <div className="mx-auto max-w-[800px] rounded-xl border border-dashed bg-card p-8 text-center">
        <p className="text-sm font-semibold">Tarefa não encontrada</p>
        <Link href={`/dashboard/${organizationId}/tasks`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden /> Voltar às tarefas
        </Link>
      </div>
    )
  }

  const catName = categories.find((c) => c.id === task.categoryId)?.name ?? null
  const isRequester = task.requesterUserId === session.user.id
  const aiScope = isPersonal ? null : organizationId
  const aiEnabled = await featureAccessible(aiScope, "ai_assistant").catch(() => false)

  return (
    <div className="mx-auto w-full max-w-[1024px] space-y-5 pb-10">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={`/dashboard/${organizationId}/tasks`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden /> Tarefas
        </Link>
        <span>/</span>
        <span className="truncate">{task.title}</span>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tarefa · {orgName ?? "Pessoal"}</p>
        <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight">
          {task.title}
        </h1>
      </div>

      <TaskBrief
        task={{
          title: task.title,
          description: task.description,
          statusLabel: task.status.replace("_", " "),
          statusCls: "bg-primary text-primary-foreground",
          budgetLabel:
            task.priceMinMzn != null || task.priceMaxMzn != null
              ? `${task.priceMinMzn != null ? `${task.priceMinMzn.toLocaleString("pt-MZ")} MZN` : "—"} – ${task.priceMaxMzn != null ? `${task.priceMaxMzn.toLocaleString("pt-MZ")} MZN` : "—"}`
              : null,
          categoryName: catName,
          contractLabel: task.contractType
            ? (TASK_CONTRACT_TYPE_LABELS_PT[task.contractType as keyof typeof TASK_CONTRACT_TYPE_LABELS_PT] ?? task.contractType)
            : null,
          locationLabel: [task.province, task.district, task.address].filter(Boolean).join(" · ") || null,
          dueLabel: task.dueAt
            ? `prazo ${new Date(task.dueAt).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}`
            : null,
          deadlineLabel: task.proposalDeadlineAt
            ? `propostas até ${new Date(task.proposalDeadlineAt).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}`
            : null,
          tags: task.tags,
        }}
      />

      {error && <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      {aiEnabled && <TaskAgentSheet organizationId={aiScope} taskRef={{ id: task.id, title: task.title }} />}

      {isRequester ? (
        <ProposalsWorkspace
          taskId={task.id}
          taskTitle={task.title}
          initialStatus={task.status}
          initialProposals={proposals}
          initialBid={bid}
          canManage={canManage}
          budgetMin={task.priceMinMzn}
          budgetMax={task.priceMaxMzn}
        />
      ) : (
        <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          Não és o solicitante desta tarefa — só o utilizador que a publicou gere as propostas.
        </div>
      )}
    </div>
  )
}