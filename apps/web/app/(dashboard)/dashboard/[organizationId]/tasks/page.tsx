import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { hasOrgPermission } from "@workdeal/shared"
import { TasksManager } from "./tasks-manager"

export type TaskListItem = {
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
  dueAt: string | null
  status: string
  proposalCount: number
  createdAt: string
}

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "open", label: "Aceitando propostas" },
  { key: "in_review", label: "Em análise" },
  { key: "in_progress", label: "Em execução" },
  { key: "completed", label: "Concluídas" },
  { key: "cancelled", label: "Canceladas" },
]

export default async function TasksPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<{ status?: string }> }) {
  const { organizationId } = await params
  const { status } = await searchParams
  const isPersonal = organizationId === "personal"
  const session = await requireAuth()

  let role: Awaited<ReturnType<typeof getOrgRole>> | undefined
  let orgName: string | null = null
  if (!isPersonal) {
    role = await getOrgRole(session.user.id, organizationId)
    if (!role || !hasOrgPermission(role, "tasks:view")) notFound()
    const { listUserOrganizations } = await import("@workdeal/auth/repository")
    const orgs = await listUserOrganizations(session.user.id)
    const org = orgs.find((o) => o.id === organizationId)
    if (!org) notFound()
    orgName = org.name
  }

  const allowed = STATUS_TABS.map((t) => t.key)
  const activeStatus = status && allowed.includes(status) ? status : "all"

  let tasks: TaskListItem[] = []
  let categories: { id: string; name: string; slug: string }[] = []
  try {
    const { apiFetch } = await import("@/lib/api")
    const cats = await apiFetch<{ id: string; name: string; slug: string }[]>("/api/v1/categories", { cache: "no-store" }).catch(() => ({ data: [] } as never))
    categories = (cats.data ?? []) as typeof categories
    const params = new URLSearchParams({ limit: "50" })
    if (activeStatus !== "all") params.set("status", activeStatus)
    const tRes = await apiFetch<{ items?: TaskListItem[] }>(`/api/v1/tasks/my?${params.toString()}`, { cache: "no-store" }).catch(() => ({ data: null } as never))
    tasks = ((tRes.data as { items?: TaskListItem[] } | null)?.items ?? []) as TaskListItem[]
  } catch {
    tasks = []
  }

  const canManage = isPersonal ? true : (role ? hasOrgPermission(role, "tasks:manage") : false)

  const activeTab = STATUS_TABS.find((t) => t.key === activeStatus)

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-5 pb-10">
      <div className="rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">TAREFAS · {isPersonal ? "PESSOAL" : String(orgName ?? organizationId).toUpperCase()}</p>
        <h1 className="mt-2 text-[22px] font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Pedidos de serviço
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[#0F1A2E]/60">
          Publica tarefas, gere propostas e adjudica em execução. Tarefas aparecem para fornecedores na directoria e nas oportunidades.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-[16px] border border-[#D9D2C2] bg-white p-2">
        {STATUS_TABS.map((t) => {
          const active = t.key === activeStatus
          return (
            <a
              key={t.key}
              href={`/dashboard/${organizationId}/tasks${t.key === "all" ? "" : `?status=${t.key}`}`}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${active ? "bg-[#0F1A2E] text-white" : "text-[#0F1A2E]/60 hover:bg-[#F6F3EE] hover:text-[#0F1A2E]"}`}
            >
              {t.label}
            </a>
          )
        })}
        <span className="ml-auto self-center pr-2 text-xs font-semibold text-[#0F1A2E]/45">{activeTab?.label ?? "Todas"}</span>
      </div>

      <TasksManager
        initial={tasks}
        categories={categories}
        canManage={canManage}
        requesterOrganizationId={isPersonal ? null : organizationId}
        organizationId={organizationId}
        orgName={isPersonal ? "Pessoal" : (orgName ?? organizationId)}
      />
    </div>
  )
}