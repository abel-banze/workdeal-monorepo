"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, MoreHorizontal, Plus, Search, X } from "lucide-react"
import { createTask, updateTask } from "@/app/actions/tasks"
import { TASK_CONTRACT_TYPE_LABELS_PT } from "@workdeal/shared"
import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import type { TaskListItem } from "./page"

const PROVINCES = ["Cabo Delgado", "Cidade de Maputo", "Gaza", "Inhambane", "Manica", "Maputo", "Nampula", "Niassa", "Sofala", "Tete", "Zambézia"]

type ContractType = "service" | "recurring" | "consulting" | "emergency" | "project" | "public_tender"
type TagOption = { id: string; slug: string; name: string; category?: string | null }

// Concursos públicos são criados pela equipa Workdeal, não no dashboard
const CONTRACT_OPTIONS = (Object.keys(TASK_CONTRACT_TYPE_LABELS_PT) as ContractType[]).filter((k) => k !== "public_tender")
const FILTER_CONTRACT_OPTIONS = Object.keys(TASK_CONTRACT_TYPE_LABELS_PT) as ContractType[]

type TaskStatus = "open" | "in_review" | "in_progress" | "completed" | "cancelled" | "withdrawn"

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  open: { label: "Aceitando propostas", cls: "bg-primary text-primary-foreground" },
  in_review: { label: "Em análise", cls: "border border-border bg-card text-foreground" },
  in_progress: { label: "Em execução", cls: "bg-muted text-foreground" },
  completed: { label: "Concluída", cls: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/10 text-destructive" },
  withdrawn: { label: "Retirada", cls: "border border-border bg-card text-muted-foreground" },
}

function fmtMzn(v: number | null): string {
  return v == null ? "—" : `${v.toLocaleString("pt-MZ")} MZN`
}

/** ISO/string de data → valor para <input type="datetime-local"> (hora local). */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Form = {
  title: string
  categoryId: string
  contractType: ContractType | ""
  province: string
  district: string
  priceMin: string
  priceMax: string
  dueAt: string
  proposalDeadlineAt: string
  tagSlugs: string[]
  description: string
}

const emptyForm: Form = { title: "", categoryId: "", contractType: "", province: "", district: "", priceMin: "", priceMax: "", dueAt: "", proposalDeadlineAt: "", tagSlugs: [], description: "" }

function validateForm(form: Form): string | null {
  if (form.title.trim().length < 5) return "Título deve ter pelo menos 5 caracteres"
  if (form.description.trim().length < 20) return "Descrição deve ter pelo menos 20 caracteres"
  const priceMin = form.priceMin.trim() === "" ? null : Number.parseInt(form.priceMin, 10)
  const priceMax = form.priceMax.trim() === "" ? null : Number.parseInt(form.priceMax, 10)
  if (priceMin != null && priceMax != null && priceMin > priceMax) return "Orçamento mínimo deve ser ≤ máximo"
  const proposalDeadline = form.proposalDeadlineAt ? new Date(form.proposalDeadlineAt) : null
  if (proposalDeadline && form.dueAt && new Date(form.dueAt) < proposalDeadline) return "O prazo para propostas deve ser anterior ao prazo de execução"
  return null
}

function buildPayload(form: Form, requesterOrganizationId?: string | null) {
  return {
    // Na edição a chave é omitida (o solicitante nunca muda); na criação vai sempre
    ...(requesterOrganizationId !== undefined ? { requesterOrganizationId } : {}),
    categoryId: form.categoryId || null,
    title: form.title.trim(),
    description: form.description.trim(),
    priceMinMzn: form.priceMin.trim() === "" ? null : Number.parseInt(form.priceMin, 10),
    priceMaxMzn: form.priceMax.trim() === "" ? null : Number.parseInt(form.priceMax, 10),
    province: form.province || null,
    district: form.district.trim() || null,
    dueAt: form.dueAt ? new Date(form.dueAt) : null,
    proposalDeadlineAt: form.proposalDeadlineAt ? new Date(form.proposalDeadlineAt) : null,
    contractType: form.contractType || null,
    tagSlugs: form.tagSlugs,
    attachments: [],
  }
}

function formFromTask(t: TaskListItem): Form {
  return {
    title: t.title,
    categoryId: t.categoryId ?? "",
    contractType: (t.contractType as ContractType) ?? "",
    province: t.province ?? "",
    district: t.district ?? "",
    priceMin: t.priceMinMzn != null ? String(t.priceMinMzn) : "",
    priceMax: t.priceMaxMzn != null ? String(t.priceMaxMzn) : "",
    dueAt: toDatetimeLocalValue(t.dueAt),
    proposalDeadlineAt: toDatetimeLocalValue(t.proposalDeadlineAt),
    tagSlugs: (t.tags ?? []).map((tag) => tag.slug),
    description: t.description,
  }
}

function TaskFormFields({
  form,
  setForm,
  categories,
  tagGroups,
  tags,
  idPrefix,
}: {
  form: Form
  setForm: (f: Form) => void
  categories: { id: string; name: string }[]
  tagGroups: Record<string, TagOption[]>
  tags: TagOption[]
  idPrefix: string
}) {
  function toggleTag(slug: string) {
    const has = form.tagSlugs.includes(slug)
    const next = has ? form.tagSlugs.filter((s) => s !== slug) : form.tagSlugs.length >= 10 ? form.tagSlugs : [...form.tagSlugs, slug]
    setForm({ ...form, tagSlugs: next })
  }

  const inputCls = "rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground"

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título * ex: Instalação de ar-condicionado 18K BTU" maxLength={120} aria-label="Título da tarefa" className={inputCls} />
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} aria-label="Categoria" className={inputCls}>
          <option value="">Categoria (opcional)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value as ContractType })} aria-label="Tipo de contrato" className={inputCls}>
          <option value="">Tipo de contrato (opcional)</option>
          {CONTRACT_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {TASK_CONTRACT_TYPE_LABELS_PT[k]}
            </option>
          ))}
        </select>
        <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} aria-label="Província" className={inputCls}>
          <option value="">Província (opcional)</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Distrito (opcional)" maxLength={80} aria-label="Distrito" className={inputCls} />
        <input value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value })} type="number" min={0} placeholder="Orçamento mín. (MZN)" aria-label="Orçamento mínimo em MZN" className={inputCls} />
        <input value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value })} type="number" min={0} placeholder="Orçamento máx. (MZN)" aria-label="Orçamento máximo em MZN" className={inputCls} />
        <input value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} type="datetime-local" title="Prazo de execução da tarefa" aria-label="Prazo de execução" className={inputCls} />
        <input value={form.proposalDeadlineAt} onChange={(e) => setForm({ ...form, proposalDeadlineAt: e.target.value })} type="datetime-local" title="Data limite para receber propostas" aria-label="Data limite para propostas" className={inputCls} />
      </div>
      {tags.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground">Área da tarefa / competências ({form.tagSlugs.length}/10)</p>
            {form.tagSlugs.length > 0 && (
              <button type="button" onClick={() => setForm({ ...form, tagSlugs: [] })} className="text-[11px] font-bold text-primary hover:underline">
                Limpar
              </button>
            )}
          </div>
          <div className="mt-2 space-y-2">
            {Object.entries(tagGroups).map(([cat, items]) => (
              <div key={cat} className="flex flex-wrap items-center gap-1.5">
                <span className="w-24 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{cat}</span>
                {items.map((t) => {
                  const on = form.tagSlugs.includes(t.slug)
                  return (
                    <button
                      key={`${idPrefix}-${t.id}`}
                      type="button"
                      onClick={() => toggleTag(t.slug)}
                      aria-pressed={on}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        on ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {t.name}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição detalhada * (mín. 20 caracteres)" rows={4} aria-label="Descrição da tarefa" className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
    </div>
  )
}

function FilterBar({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlQ = searchParams.get("q") ?? ""
  const [q, setQ] = useState(urlQ)
  const [lastUrlQ, setLastUrlQ] = useState(urlQ)

  // Sincroniza quando o URL muda por outra via (tabs, limpar filtros) —
  // ajuste durante o render, sem cascading renders de effects
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ)
    setQ(urlQ)
  }

  // Pesquisa com debounce — escreve `q` no URL, o servidor volta a-fetch
  useEffect(() => {
    const current = searchParams.get("q") ?? ""
    if (q === current) return
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString())
      if (q.trim()) next.set("q", q.trim())
      else next.delete("q")
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, pathname, router])

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function clearAll() {
    const next = new URLSearchParams(searchParams.toString())
    for (const k of ["q", "categoryId", "province", "contractType"]) next.delete(k)
    setQ("")
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const hasActive = Boolean(searchParams.get("q") || searchParams.get("categoryId") || searchParams.get("province") || searchParams.get("contractType"))
  const selectCls = "rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-ring"

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por título ou descrição…"
            aria-label="Pesquisar tarefas"
            className="w-full rounded-full border border-border bg-muted py-2 pl-9 pr-8 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:bg-card"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Limpar pesquisa" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select value={searchParams.get("categoryId") ?? ""} onChange={(e) => setParam("categoryId", e.target.value)} aria-label="Filtrar por categoria" className={`${selectCls} max-w-[180px]`}>
            <option value="">Todas categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={searchParams.get("province") ?? ""} onChange={(e) => setParam("province", e.target.value)} aria-label="Filtrar por província" className={selectCls}>
            <option value="">Todas províncias</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select value={searchParams.get("contractType") ?? ""} onChange={(e) => setParam("contractType", e.target.value)} aria-label="Filtrar por tipo de contrato" className={selectCls}>
            <option value="">Todos tipos</option>
            {FILTER_CONTRACT_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {TASK_CONTRACT_TYPE_LABELS_PT[k]}
              </option>
            ))}
          </select>
          {hasActive && (
            <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10">
              <X className="size-3.5" aria-hidden /> Limpar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function TasksManager({
  initial,
  categories,
  tags,
  canManage,
  requesterOrganizationId,
  organizationId,
  orgName,
  statusTabs,
  activeStatus,
  tabHrefs,
  activeTabLabel,
  hasFilters,
  clearHref,
}: {
  initial: TaskListItem[]
  categories: { id: string; name: string }[]
  tags: TagOption[]
  canManage: boolean
  requesterOrganizationId: string | null
  organizationId: string
  orgName: string
  statusTabs: { key: string; label: string }[]
  activeStatus: string
  tabHrefs: Record<string, string>
  activeTabLabel: string
  hasFilters: boolean
  clearHref: string
}) {
  const [tasks, setTasks] = useState<TaskListItem[]>(initial)
  const [lastInitial, setLastInitial] = useState<TaskListItem[]>(initial)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<TaskListItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [form, setForm] = useState<Form>(emptyForm)
  const [editForm, setEditForm] = useState<Form>(emptyForm)

  // O servidor volta a-fetch quando os filtros no URL mudam — sincroniza a
  // lista com os dados frescos (ajuste durante o render, sem effects)
  if (initial !== lastInitial) {
    setLastInitial(initial)
    setTasks(initial)
  }

  const tagGroups = tags.reduce<Record<string, TagOption[]>>((acc, t) => {
    const cat = t.category?.trim() || "Outras"
    ;(acc[cat] ??= []).push(t)
    return acc
  }, {})

  function catName(id: string | null): string {
    if (!id) return ""
    return categories.find((c) => c.id === id)?.name ?? ""
  }

  function openCreate() {
    setForm(emptyForm)
    setError(null)
    setCreateOpen(true)
  }

  function openEdit(t: TaskListItem) {
    setEditing(t)
    setEditForm(formFromTask(t))
    setError(null)
  }

  function closeDialogs() {
    setCreateOpen(false)
    setEditing(null)
    setError(null)
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage || saving) return
    const validation = validateForm(form)
    if (validation) {
      setError(validation)
      return
    }
    setSaving(true)
    setError(null)
    setMsg(null)
    try {
      const res = (await createTask(buildPayload(form, requesterOrganizationId))) as unknown as { data: TaskListItem }
      const created = { ...res.data, proposalCount: res.data.proposalCount ?? 0, tags: res.data.tags ?? [] }
      setTasks((prev) => [created, ...prev])
      closeDialogs()
      setMsg("Tarefa publicada — já aceita propostas.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar tarefa")
    } finally {
      setSaving(false)
    }
  }

  async function onEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage || !editing || saving) return
    const validation = validateForm(editForm)
    if (validation) {
      setError(validation)
      return
    }
    setSaving(true)
    setError(null)
    setMsg(null)
    try {
      const updatePayload = buildPayload(editForm)
      const res = (await updateTask(editing.id, updatePayload)) as unknown as { data: Record<string, unknown> }
      const updated = res.data as unknown as TaskListItem
      // O PATCH não devolve tags nem contagem — resolve localmente
      const resolvedTags = editForm.tagSlugs
        .map((slug) => tags.find((t) => t.slug === slug))
        .filter((t): t is TagOption => Boolean(t))
        .map((t) => ({ id: t.id, slug: t.slug, name: t.name }))
      const taskId = editing.id
      const prevCount = tasks.find((t) => t.id === taskId)?.proposalCount ?? 0
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                ...updated,
                id: taskId,
                proposalCount: prevCount,
                tags: resolvedTags,
                dueAt: updated.dueAt ? new Date(updated.dueAt as unknown as string).toISOString() : null,
                proposalDeadlineAt: updated.proposalDeadlineAt ? new Date(updated.proposalDeadlineAt as unknown as string).toISOString() : null,
              }
            : t,
        ),
      )
      closeDialogs()
      setMsg("Tarefa actualizada.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao actualizar tarefa")
    } finally {
      setSaving(false)
    }
  }

  async function onStatus(id: string, status: TaskStatus) {
    if (!canManage) return
    setError(null)
    try {
      await updateTask(id, { status })
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
      setMsg("Tarefa actualizada.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    }
  }

  const errorBanner = error ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tarefas · {orgName}</p>
              <CardTitle className="text-xl">Pedidos de serviço</CardTitle>
              <CardDescription>
                Publica tarefas, gere propostas e adjudica em execução. Tarefas aparecem para fornecedores na directoria e nas oportunidades.
              </CardDescription>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/80"
              >
                <Plus className="size-3.5" aria-hidden /> Nova tarefa
              </button>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1.5">
        {statusTabs.map((t) => {
          const active = t.key === activeStatus
          return (
            <a
              key={t.key}
              href={tabHrefs[t.key] ?? `/dashboard/${organizationId}/tasks`}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {t.label}
            </a>
          )
        })}
        <span className="ml-auto self-center pr-2 text-xs text-muted-foreground">{activeTabLabel}</span>
      </div>

      <Suspense fallback={<div className="h-[68px] animate-pulse rounded-xl border border-border bg-card" aria-hidden />}>
        <FilterBar categories={categories} />
      </Suspense>

      {msg && <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">{msg}</p>}
      {error && !createOpen && !editing && errorBanner}

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <p className="text-sm font-semibold text-foreground">{hasFilters ? "Nenhuma tarefa corresponde aos filtros." : "Ainda sem tarefas neste estado."}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            {hasFilters && (
              <a href={clearHref} className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted">
                <X className="size-3.5" aria-hidden /> Limpar filtros
              </a>
            )}
            {canManage && (
              <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/80">
                <Plus className="size-3.5" aria-hidden /> {hasFilters ? "Nova tarefa" : "Publicar a primeira tarefa"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => {
            const st = STATUS_STYLES[t.status] ?? { label: t.status, cls: "bg-muted text-muted-foreground" }
            const detailHref = `/dashboard/${organizationId}/tasks/${t.id}`
            return (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold leading-tight text-foreground">{t.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      {t.contractType && (
                        <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {TASK_CONTRACT_TYPE_LABELS_PT[t.contractType as ContractType] ?? t.contractType}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[t.province, t.district].filter(Boolean).join(" · ") || "Local a combinar"} · criada {new Date(t.createdAt).toLocaleDateString("pt-MZ")}
                      {t.proposalDeadlineAt && (
                        <> · propostas até {new Date(t.proposalDeadlineAt).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono font-semibold text-foreground">{fmtMzn(t.priceMinMzn)}–{fmtMzn(t.priceMaxMzn)}</span>
                    {t.dueAt && <span className="hidden rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground sm:inline">prazo {new Date(t.dueAt).toLocaleDateString("pt-MZ")}</span>}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Acções para ${t.title}`}
                          className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl border-border bg-card p-1.5 shadow-lg">
                          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            Gestão da tarefa
                          </p>
                          <DropdownMenuItem render={<Link href={detailHref} />} className="rounded-lg text-[13px]">
                            <ArrowRight className="size-3.5" aria-hidden /> Ver propostas ({t.proposalCount})
                          </DropdownMenuItem>
                          {(t.status === "open" || t.status === "in_review") && (
                            <DropdownMenuItem onSelect={() => openEdit(t)} className="rounded-lg text-[13px]">
                              Editar tarefa
                            </DropdownMenuItem>
                          )}
                          {t.status === "open" && (
                            <DropdownMenuItem onSelect={() => onStatus(t.id, "in_review")} className="rounded-lg text-[13px]">
                              Colocar em análise
                            </DropdownMenuItem>
                          )}
                          {t.status === "in_review" && (
                            <DropdownMenuItem onSelect={() => onStatus(t.id, "open")} className="rounded-lg text-[13px]">
                              Voltar a aceitar propostas
                            </DropdownMenuItem>
                          )}
                          {t.status === "open" && (
                            <DropdownMenuItem onSelect={() => onStatus(t.id, "withdrawn")} className="rounded-lg text-[13px]">
                              Retirar (pausar propostas)
                            </DropdownMenuItem>
                          )}
                          {t.status === "withdrawn" && (
                            <DropdownMenuItem onSelect={() => onStatus(t.id, "open")} className="rounded-lg text-[13px] text-primary">
                              Reabrir tarefa
                            </DropdownMenuItem>
                          )}
                          {(t.status === "open" || t.status === "in_review") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => onStatus(t.id, "cancelled")} className="rounded-lg text-[13px] text-destructive">
                                Cancelar tarefa
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {catName(t.categoryId) && <p className="mt-2 text-xs font-semibold text-primary">{catName(t.categoryId)}</p>}

                {canManage && (t.tags ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(t.tags ?? []).map((tag) => (
                      <span key={tag.id} className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{t.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={detailHref}
                    className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/80"
                  >
                    {t.proposalCount} {t.proposalCount === 1 ? "proposta" : "propostas"}
                  </Link>
                  {!canManage && <span className="text-xs text-muted-foreground">Modo leitura · papel actual não gere tarefas</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Criar — Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => (open ? setCreateOpen(true) : closeDialogs())}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
            <DialogDescription>
              Solicitante: {orgName}. Fornecedores que se candidatam aparecem em “propostas”.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <TaskFormFields form={form} setForm={setForm} categories={categories} tagGroups={tagGroups} tags={tags} idPrefix="create" />
            {errorBanner}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                {saving ? "A publicar…" : "Publicar tarefa"}
              </button>
              <button type="button" onClick={closeDialogs} className="rounded-full border px-5 py-2.5 text-sm font-semibold hover:bg-muted">
                Cancelar
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Editar — Dialog */}
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) closeDialogs() }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar tarefa</DialogTitle>
            <DialogDescription>
              Actualiza os detalhes do pedido. Fornecedores vêem as alterações de imediato.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-3">
              <TaskFormFields form={editForm} setForm={setEditForm} categories={categories} tagGroups={tagGroups} tags={tags} idPrefix="edit" />
              {errorBanner}
              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                  {saving ? "A guardar…" : "Guardar alterações"}
                </button>
                <button type="button" onClick={closeDialogs} className="rounded-full border px-5 py-2.5 text-sm font-semibold hover:bg-muted">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
