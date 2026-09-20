"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"
import { createTask, updateTask } from "@/app/actions/tasks"
import { TASK_CONTRACT_TYPE_LABELS_PT } from "@workdeal/shared"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import type { TaskListItem } from "./page"

const PROVINCES = ["Cabo Delgado", "Cidade de Maputo", "Gaza", "Inhambane", "Manica", "Maputo", "Nampula", "Niassa", "Sofala", "Tete", "Zambézia"]

type ContractType = "service" | "recurring" | "consulting" | "emergency" | "project" | "public_tender"
type TagOption = { id: string; slug: string; name: string; category?: string | null }

// Concursos públicos são criados pela equipa Workdeal, não no dashboard
const CONTRACT_OPTIONS = (Object.keys(TASK_CONTRACT_TYPE_LABELS_PT) as ContractType[]).filter((k) => k !== "public_tender")

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

export function TasksManager({
  initial,
  categories,
  tags,
  canManage,
  requesterOrganizationId,
  organizationId,
  orgName,
}: {
  initial: TaskListItem[]
  categories: { id: string; name: string }[]
  tags: TagOption[]
  canManage: boolean
  requesterOrganizationId: string | null
  organizationId: string
  orgName: string
}) {
  const [tasks, setTasks] = useState<TaskListItem[]>(initial)
  const [openForm, setOpenForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

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
  const [form, setForm] = useState<Form>(emptyForm)

  const tagGroups = tags.reduce<Record<string, TagOption[]>>((acc, t) => {
    const cat = t.category?.trim() || "Outras"
    ;(acc[cat] ??= []).push(t)
    return acc
  }, {})

  function toggleTag(slug: string) {
    setForm((f) => {
      const has = f.tagSlugs.includes(slug)
      const next = has ? f.tagSlugs.filter((s) => s !== slug) : f.tagSlugs.length >= 10 ? f.tagSlugs : [...f.tagSlugs, slug]
      return { ...f, tagSlugs: next }
    })
  }

  function catName(id: string | null): string {
    if (!id) return ""
    return categories.find((c) => c.id === id)?.name ?? ""
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage) return
    if (form.title.trim().length < 5) {
      setError("Título deve ter pelo menos 5 caracteres")
      return
    }
    if (form.description.trim().length < 20) {
      setError("Descrição deve ter pelo menos 20 caracteres")
      return
    }
    setSaving(true)
    setError(null)
    setMsg(null)
    try {
      const priceMin = form.priceMin.trim() === "" ? null : Number.parseInt(form.priceMin, 10)
      const priceMax = form.priceMax.trim() === "" ? null : Number.parseInt(form.priceMax, 10)
      if (priceMin != null && priceMax != null && priceMin > priceMax) {
        setError("Orçamento mínimo deve ser ≤ máximo")
        return
      }
      const proposalDeadline = form.proposalDeadlineAt ? new Date(form.proposalDeadlineAt) : null
      if (proposalDeadline && form.dueAt && new Date(form.dueAt) < proposalDeadline) {
        setError("O prazo para propostas deve ser anterior ao prazo de execução")
        return
      }
      const res = (await createTask({
        requesterOrganizationId,
        categoryId: form.categoryId || null,
        title: form.title.trim(),
        description: form.description.trim(),
        priceMinMzn: priceMin,
        priceMaxMzn: priceMax,
        province: form.province || null,
        district: form.district.trim() || null,
        dueAt: form.dueAt ? new Date(form.dueAt) : null,
        proposalDeadlineAt: proposalDeadline,
        contractType: form.contractType || null,
        tagSlugs: form.tagSlugs,
        attachments: [],
      })) as unknown as { data: TaskListItem }
      const created = res.data
      setTasks((prev) => [created, ...prev])
      setForm(emptyForm)
      setOpenForm(false)
      setMsg("Tarefa publicada — já aceita propostas.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar tarefa")
    } finally {
      setSaving(false)
    }
  }

  async function onStatus(id: string, status: TaskStatus) {
    try {
      await updateTask(id, { status })
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
      setMsg("Tarefa actualizada.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    }
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Publicar tarefa</CardTitle>
                <CardDescription>Solicitante: {orgName}. Fornecedores que se candidatam aparecem em “propostas”.</CardDescription>
              </div>
              <button type="button" onClick={() => setOpenForm((v) => !v)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted">
                {openForm ? "Fechar" : (<><Plus className="size-3.5" aria-hidden /> Nova tarefa</>)}
              </button>
            </div>
          </CardHeader>
          {openForm && (
            <CardContent>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título * ex: Instalação de ar-condicionado 18K BTU" maxLength={120} className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground">
                  <option value="">Categoria (opcional)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value as ContractType })} className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground">
                  <option value="">Tipo de contrato (opcional)</option>
                  {CONTRACT_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {TASK_CONTRACT_TYPE_LABELS_PT[k]}
                    </option>
                  ))}
                </select>
                <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground">
                  <option value="">Província (opcional)</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Distrito (opcional)" maxLength={80} className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                <input value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value })} type="number" min={0} placeholder="Orçamento mín. (MZN)" className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                <input value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value })} type="number" min={0} placeholder="Orçamento máx. (MZN)" className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                <input value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} type="datetime-local" title="Prazo de execução da tarefa" className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                <input value={form.proposalDeadlineAt} onChange={(e) => setForm({ ...form, proposalDeadlineAt: e.target.value })} type="datetime-local" title="Data limite para receber propostas" className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
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
                              key={t.id}
                              type="button"
                              onClick={() => toggleTag(t.slug)}
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
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição detalhada * (mín. 20 caracteres)" rows={4} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                  {saving ? "A publicar…" : "Publicar tarefa"}
                </button>
                {error && <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
              </div>
            </form>
            </CardContent>
          )}
        </Card>
      )}

      {msg && <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">{msg}</p>}

      {tasks.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Ainda sem tarefas neste estado.</p>
      )}

      <div className="space-y-3">
        {tasks.map((t) => {
          const st = STATUS_STYLES[t.status] ?? { label: t.status, cls: "bg-muted text-muted-foreground" }
          return (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
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
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono font-semibold text-foreground">{fmtMzn(t.priceMinMzn)}–{fmtMzn(t.priceMaxMzn)}</span>
                  {t.dueAt && <span className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">prazo {new Date(t.dueAt).toLocaleDateString("pt-MZ")}</span>}
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
                <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">{t.proposalCount} {t.proposalCount === 1 ? "proposta" : "propostas"}</span>
                <Link
                  href={`/dashboard/${organizationId}/tasks/${t.id}`}
                  className="inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Ver propostas <ArrowRight className="size-3.5" aria-hidden />
                </Link>
                {canManage && (t.status === "open" || t.status === "in_review") && (
                  <>
                    {t.status === "open" && (
                      <button onClick={() => onStatus(t.id, "withdrawn")} className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                        Retirar
                      </button>
                    )}
                    <button onClick={() => onStatus(t.id, "cancelled")} className="rounded-full border border-destructive/25 bg-card px-3.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10">
                      Cancelar
                    </button>
                  </>
                )}
                {canManage && t.status === "withdrawn" && (
                  <button onClick={() => onStatus(t.id, "open")} className="rounded-full border border-primary/25 bg-card px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
                    Reabrir
                  </button>
                )}
                {!canManage && <span className="text-xs text-muted-foreground">Modo leitura · papel actual não gere tarefas</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}