import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { hasOrgPermission } from "@workdeal/shared"
import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
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
  let tags: { id: string; slug: string; name: string; category?: string | null }[] = []
  try {
    const { apiFetch } = await import("@/lib/api")
    const cats = await apiFetch<{ id: string; name: string; slug: string }[]>("/api/v1/categories", { cache: "no-store" }).catch(() => ({ data: [] } as never))
    categories = (cats.data ?? []) as typeof categories
    const tagsRes = await apiFetch<{ id: string; slug: string; name: string; category?: string | null }[]>("/api/v1/tags", { cache: "no-store" }).catch(() => ({ data: [] } as never))
    tags = (tagsRes.data ?? []) as typeof tags
    const params = new URLSearchParams({ limit: "50" })
    if (activeStatus !== "all") params.set("status", activeStatus)
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

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-5 pb-10">
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tarefas · {isPersonal ? "Pessoal" : (orgName ?? organizationId)}</p>
          <CardTitle className="text-xl">Pedidos de serviço</CardTitle>
          <CardDescription>
            Publica tarefas, gere propostas e adjudica em execução. Tarefas aparecem para fornecedores na directoria e nas oportunidades.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1.5">
        {STATUS_TABS.map((t) => {
          const active = t.key === activeStatus
          return (
            <a
              key={t.key}
              href={`/dashboard/${organizationId}/tasks${t.key === "all" ? "" : `?status=${t.key}`}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {t.label}
            </a>
          )
        })}
        <span className="ml-auto self-center pr-2 text-xs text-muted-foreground">{activeTab?.label ?? "Todas"}</span>
      </div>

      <TasksManager
        initial={tasks}
        categories={categories}
        tags={tags}
        canManage={canManage}
        requesterOrganizationId={isPersonal ? null : organizationId}
        organizationId={organizationId}
        orgName={isPersonal ? "Pessoal" : (orgName ?? organizationId)}
      />
    </div>
  )
}