import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { hasOrgPermission } from "@workdeal/shared"
import { ProposalReview } from "./proposal-review"

type ProposalItem = {
  id: string
  taskId: string
  providerProfileId: string
  providerProfileName: string | null
  providerProfileSlug: string | null
  providerProfileLogo: string | null
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
      const pRes = await apiFetch<ProposalItem[]>(`/api/v1/tasks/${encodeURIComponent(taskId)}/proposals?limit=50`, { cache: "no-store" })
      proposals = pRes.data ?? []
      const bRes = await apiFetch<{ items: BidItem[] }>("/api/v1/tasks/bids?role=requester&limit=50", { cache: "no-store" }).catch(() => ({ data: null } as never))
      const items = (bRes.data as { items: BidItem[] } | null)?.items ?? []
      bid = items.find((b) => b.taskId === taskRow.id) ?? null
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  if (!task) {
    return (
      <div className="mx-auto max-w-[800px] rounded-[20px] border border-dashed border-[#D9D2C2] bg-white p-8 text-center">
        <p className="text-sm font-bold text-[#0F1A2E]">Tarefa não encontrada</p>
        <Link href={`/dashboard/${organizationId}/tasks`} className="mt-3 inline-block text-xs font-bold text-[#0B5E56]">
          ← Voltar às tarefas
        </Link>
      </div>
    )
  }

  const catName = categories.find((c) => c.id === task.categoryId)?.name ?? null
  const isRequester = task.requesterUserId === session.user.id

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-5 pb-10">
      <div className="flex items-center gap-2 text-xs text-[#0F1A2E]/50">
        <Link href={`/dashboard/${organizationId}/tasks`} className="font-bold text-[#0B5E56] hover:underline">
          ← Tarefas
        </Link>
        <span>/</span>
        <span className="truncate">{task.title}</span>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">TAREFA · {orgName?.toUpperCase() ?? "PESSOAL"}</p>
        <h1 className="mt-2 text-[22px] font-black leading-tight tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          {task.title}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#0F1A2E]/70">{task.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 font-mono font-semibold text-[#0F1A2E]">
            {task.priceMinMzn != null ? `${task.priceMinMzn.toLocaleString("pt-MZ")} MZN` : "—"} – {task.priceMaxMzn != null ? `${task.priceMaxMzn.toLocaleString("pt-MZ")} MZN` : "—"}
          </span>
          {catName && <span className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 font-semibold text-[#0B5E56]">{catName}</span>}
          {[task.province, task.district, task.address].filter(Boolean).join(" · ") && (
            <span className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-[#0F1A2E]/70">📍 {[task.province, task.district, task.address].filter(Boolean).join(" · ")}</span>
          )}
          {task.dueAt && <span className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-[#0F1A2E]/70">prazo {new Date(task.dueAt).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}</span>}
          <span className="rounded-full bg-[#0F1A2E] px-2.5 py-1 font-bold text-white">{task.status.replace("_", " ")}</span>
        </div>
      </div>

      {error && <p className="rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs text-[#7A1A0A]">{error}</p>}

      {isRequester ? (
        <ProposalReview taskId={task.id} initialStatus={task.status} initialProposals={proposals} initialBid={bid} canManage={canManage} />
      ) : (
        <div className="rounded-[20px] border border-dashed border-[#D9D2C2] bg-white p-6 text-sm text-[#0F1A2E]/60">
          Não és o solicitante desta tarefa — só o utilizador que a publicou gere as propostas.
        </div>
      )}
    </div>
  )
}