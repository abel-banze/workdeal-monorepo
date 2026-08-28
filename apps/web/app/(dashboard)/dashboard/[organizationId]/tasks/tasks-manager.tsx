"use client"

import { useState } from "react"
import Link from "next/link"
import { createTask, updateTask } from "@/app/actions/tasks"
import type { TaskListItem } from "./page"

const PROVINCES = ["Cidade de Maputo", "Matola", "Gaza", "Inhambane", "Sofala", "Manica", "Tete", "Zambézia", "Nampula", "Niassa", "Cabo Delgado"]

type TaskStatus = "open" | "in_review" | "in_progress" | "completed" | "cancelled" | "withdrawn"

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  open: { label: "Aceitando propostas", cls: "bg-[#0B5E56] text-white" },
  in_review: { label: "Em análise", cls: "bg-[#0F1A2E] text-white" },
  in_progress: { label: "Em execução", cls: "bg-[#D97706] text-white" },
  completed: { label: "Concluída", cls: "bg-[#0F766E] text-white" },
  cancelled: { label: "Cancelada", cls: "bg-[#FF3B1F] text-white" },
  withdrawn: { label: "Retirada", cls: "bg-[#6B7280] text-white" },
}

function fmtMzn(v: number | null): string {
  return v == null ? "—" : `${v.toLocaleString("pt-MZ")} MZN`
}

export function TasksManager({
  initial,
  categories,
  canManage,
  requesterOrganizationId,
  organizationId,
  orgName,
}: {
  initial: TaskListItem[]
  categories: { id: string; name: string }[]
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
    province: string
    district: string
    priceMin: string
    priceMax: string
    dueAt: string
    description: string
  }
  const emptyForm: Form = { title: "", categoryId: "", province: "", district: "", priceMin: "", priceMax: "", dueAt: "", description: "" }
  const [form, setForm] = useState<Form>(emptyForm)

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
        <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#0F1A2E]">Publicar tarefa</h2>
              <p className="mt-0.5 text-xs text-[#0F1A2E]/55">Solicitante: {orgName}. Fornecedores que se candidatam aparecem em “propostas”.</p>
            </div>
            <button type="button" onClick={() => setOpenForm((v) => !v)} className="rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE]">
              {openForm ? "Fechar" : "Nova tarefa +"}
            </button>
          </div>
          {openForm && (
            <form onSubmit={onCreate} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título * ex: Instalação de ar-condicionado 18K BTU" maxLength={120} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]">
                  <option value="">Categoria (opcional)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]">
                  <option value="">Província (opcional)</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Distrito (opcional)" maxLength={80} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <input value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value })} type="number" min={0} placeholder="Orçamento mín. (MZN)" className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <input value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value })} type="number" min={0} placeholder="Orçamento máx. (MZN)" className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <input value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} type="datetime-local" className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
              </div>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição detalhada * (mín. 20 caracteres)" rows={4} className="w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving} className="rounded-full bg-[#0F1A2E] px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50">
                  {saving ? "A publicar…" : "Publicar tarefa"}
                </button>
                {error && <p className="rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs text-[#7A1A0A]">{error}</p>}
              </div>
            </form>
          )}
        </div>
      )}

      {msg && <p className="rounded-lg border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-3 py-2 text-xs text-[#0B5E56]">{msg}</p>}

      {tasks.length === 0 && (
        <p className="rounded-xl border border-dashed border-[#D9D2C2] bg-white p-6 text-center text-sm text-[#0F1A2E]/50">Ainda sem tarefas neste estado.</p>
      )}

      <div className="space-y-3">
        {tasks.map((t) => {
          const st = STATUS_STYLES[t.status] ?? { label: t.status, cls: "bg-[#6B7280] text-white" }
          return (
            <div key={t.id} className="rounded-[18px] border border-[#D9D2C2] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-black leading-tight text-[#0F1A2E]">{t.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#0F1A2E]/55">
                    {[t.province, t.district].filter(Boolean).join(" · ") || "Local a combinar"} · criada {new Date(t.createdAt).toLocaleDateString("pt-MZ")}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 font-mono font-semibold text-[#0F1A2E]">{fmtMzn(t.priceMinMzn)}–{fmtMzn(t.priceMaxMzn)}</span>
                  {t.dueAt && <span className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-[#0F1A2E]/60">prazo {new Date(t.dueAt).toLocaleDateString("pt-MZ")}</span>}
                </div>
              </div>

              {catName(t.categoryId) && <p className="mt-2 text-xs font-semibold text-[#0B5E56]">{catName(t.categoryId)}</p>}

              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#0F1A2E]/60">{t.description}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[11px] font-bold text-white">{t.proposalCount} {t.proposalCount === 1 ? "proposta" : "propostas"}</span>
                <Link
                  href={`/dashboard/${organizationId}/tasks/${t.id}`}
                  className="rounded-full border border-[#D9D2C2] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F1A2E] hover:border-[#0F1A2E]"
                >
                  Ver propostas →
                </Link>
                {canManage && (t.status === "open" || t.status === "in_review") && (
                  <>
                    {t.status === "open" && (
                      <button onClick={() => onStatus(t.id, "withdrawn")} className="rounded-full border border-[#D9D2C2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F1A2E]/70 hover:bg-[#F6F3EE]">
                        Retirar
                      </button>
                    )}
                    <button onClick={() => onStatus(t.id, "cancelled")} className="rounded-full border border-[#FF3B1F]/25 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10">
                      Cancelar
                    </button>
                  </>
                )}
                {canManage && t.status === "withdrawn" && (
                  <button onClick={() => onStatus(t.id, "open")} className="rounded-full border border-[#0B5E56]/25 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0B5E56] hover:bg-[#0B5E56]/10">
                    Reabrir
                  </button>
                )}
                {!canManage && <span className="text-xs text-[#0F1A2E]/40">Modo leitura · papel actual não gere tarefas</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}