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
  proposalDeadlineAt: string | null
  contractType: string | null
  tags: { id: string; slug: string; name: string }[]
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

export default async function TasksPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<{ status?: string; q?: string; categoryId?: string; province?: string; contractType?: string }> }) {
  const { organizationId } = await params
  const { status, q, categoryId, province, contractType } = await searchParams
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
  const query = (q ?? "").trim()

  let tasks: TaskListItem[] = []
  let categories: { id: string; name: string; slug: string }[] = []
  let tags: { id: string; slug: string; name: string; category?: string | null }[] = []
  try {
    const { apiFetch } = await import("@/lib/api")
    const cats = await apiFetch<{ id: string; name: string; slug: string }[]>("/api/v1/categories", { cache: "no-store" }).catch(() => ({ data: [] } as never))
    categories = (cats.data ?? []) as typeof categories
    const tagsRes = await apiFetch<{ id: string; slug: string; name: string; category?: string | null }[]>("/api/v1/tags", { cache: "no-store" }).catch(() => ({ data: [] } as never))
    tags = (tagsRes.data ?? []) as typeof tags
    const params = new URLSearchParams({ limit: "50" })
    if (activeStatus !== "all") params.set("status", activeStatus)
    if (query) params.set("q", query)
    if (categoryId) params.set("categoryId", categoryId)
    if (province) params.set("province", province)
    if (contractType) params.set("contractType", contractType)
    // Contexto empresa: lista TODAS as tarefas da organização (qualquer membro
    // com tasks:view), não só as criadas pelo utilizador actual. Pessoal: /my.
    const tasksPath = isPersonal
      ? `/api/v1/tasks/my?${params.toString()}`
      : `/api/v1/tasks/by-organization/${organizationId}?${params.toString()}`
    const tRes = await apiFetch<TaskListItem[]>(tasksPath, { cache: "no-store" }).catch(() => ({ data: [] as TaskListItem[] } as never))
    tasks = (tRes.data ?? []) as TaskListItem[]
  } catch {
    tasks = []
  }

  const canManage = isPersonal ? true : (role ? hasOrgPermission(role, "tasks:manage") : false)

  const activeTab = STATUS_TABS.find((t) => t.key === activeStatus)

  // Filtros activos (para a barra de pesquisa e o estado vazio). O `status`
  // vive nas tabs e nunca é limpo pelo "Limpar filtros".
  const filterParams = new URLSearchParams()
  if (query) filterParams.set("q", query)
  if (categoryId) filterParams.set("categoryId", categoryId)
  if (province) filterParams.set("province", province)
  if (contractType) filterParams.set("contractType", contractType)
  const hasFilters = filterParams.size > 0

  function tabHref(key: string): string {
    const qs = new URLSearchParams(filterParams)
    if (key !== "all") qs.set("status", key)
    const s = qs.toString()
    return `/dashboard/${organizationId}/tasks${s ? `?${s}` : ""}`
  }

  const clearHref = activeStatus === "all" ? `/dashboard/${organizationId}/tasks` : `/dashboard/${organizationId}/tasks?status=${activeStatus}`

  const tabHrefs = Object.fromEntries(STATUS_TABS.map((t) => [t.key, tabHref(t.key)])) as Record<string, string>

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-5 pb-5">
      <TasksManager
        initial={tasks}
        categories={categories}
        tags={tags}
        canManage={canManage}
        requesterOrganizationId={isPersonal ? null : organizationId}
        organizationId={organizationId}
        orgName={isPersonal ? "Pessoal" : (orgName ?? organizationId)}
        statusTabs={STATUS_TABS}
        activeStatus={activeStatus}
        tabHrefs={tabHrefs}
        activeTabLabel={activeTab?.label ?? "Todas"}
        hasFilters={hasFilters}
        clearHref={clearHref}
      />
    </div>
  )
}