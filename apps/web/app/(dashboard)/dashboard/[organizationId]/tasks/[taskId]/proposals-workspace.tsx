"use client"

import { useMemo, useState } from "react"
import { FiMessageCircle, FiSearch, FiUser } from "react-icons/fi"
import { acceptProposal, setProposalStatus, updateBidStatus, updateTask } from "@/app/actions/tasks"
import { CompanyDossierSheet } from "@/components/features/company-dossier-sheet"
import { NegotiationSheet } from "@/components/features/negotiation-sheet"
import {
  countProposalsByStatus,
  filterAndSortProposals,
  type ProposalSort,
  type ProposalStatusFilter,
} from "./proposals-filter"

type ProposalItem = {
  id: string
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
  providerProfileName: string | null
  providerProfileSlug: string | null
  agreedPriceMzn: number
  agreedDeadlineAt: string | null
  status: string
  reviewNote: string | null
}

const PROPOSAL_STYLES: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Submetida", cls: "bg-[#0F1A2E] text-white" },
  shortlisted: { label: "Pré-seleccionada", cls: "bg-[#0B5E56] text-white" },
  rejected: { label: "Recusada", cls: "bg-[#FF3B1F] text-white" },
  withdrawn: { label: "Retirada", cls: "bg-[#6B7280] text-white" },
  accepted: { label: "Aceite", cls: "bg-[#0F766E] text-white" },
}

const STATUS_ORDER: ProposalStatusFilter[] = ["submitted", "shortlisted", "accepted", "rejected", "withdrawn"]

const SORT_LABELS: Record<ProposalSort, string> = {
  recent: "Mais recentes",
  priceAsc: "Menor preço",
  priceDesc: "Maior preço",
  daysAsc: "Menor prazo",
}

const BID_STYLES: Record<string, { label: string; cls: string }> = {
  awarded: { label: "Adjudicada", cls: "bg-[#0F1A2E] text-white" },
  in_progress: { label: "Em execução", cls: "bg-[#D97706] text-white" },
  completed: { label: "Concluída", cls: "bg-[#0F766E] text-white" },
  cancelled: { label: "Cancelada", cls: "bg-[#FF3B1F] text-white" },
  disputed: { label: "Em disputa", cls: "bg-[#B91C1C] text-white" },
}

const TASK_STYLES: Record<string, { label: string; cls: string }> = {
  open: { label: "Aceitando propostas", cls: "bg-[#0B5E56] text-white" },
  in_review: { label: "Em análise", cls: "bg-[#0F1A2E] text-white" },
  in_progress: { label: "Em execução", cls: "bg-[#D97706] text-white" },
  completed: { label: "Concluída", cls: "bg-[#0F766E] text-white" },
  cancelled: { label: "Cancelada", cls: "bg-[#FF3B1F] text-white" },
  withdrawn: { label: "Retirada", cls: "bg-[#6B7280] text-white" },
}

function fmtMzn(v: number): string {
  return `${v.toLocaleString("pt-MZ")} MZN`
}

/** Mancha de orçamento: compara o preço proposto com o tecto da tarefa. */
function budgetNote(price: number | null, budgetMax: number | null): string | null {
  if (price == null || budgetMax == null) return null
  if (price <= budgetMax) return "dentro do orçamento"
  const over = Math.round(((price - budgetMax) / budgetMax) * 100)
  return `+${over}% acima do tecto`
}

export function ProposalsWorkspace({
  taskId,
  taskTitle,
  initialStatus,
  initialProposals,
  initialBid,
  canManage,
  budgetMin,
  budgetMax,
}: {
  taskId: string
  taskTitle: string
  initialStatus: string
  initialProposals: ProposalItem[]
  initialBid: BidItem | null
  canManage: boolean
  budgetMin: number | null
  budgetMax: number | null
}) {
  const [proposals, setProposals] = useState<ProposalItem[]>(initialProposals)
  const [bid, setBid] = useState<BidItem | null>(initialBid)
  const [taskStatus, setTaskStatus] = useState(initialStatus)
  const [awarding, setAwarding] = useState<string | null>(null)
  const [form, setForm] = useState<{ agreedPriceMzn: string; agreedDeadlineAt: string; reviewNote: string }>({ agreedPriceMzn: "", agreedDeadlineAt: "", reviewNote: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>("all")
  const [sort, setSort] = useState<ProposalSort>("recent")
  const [dossier, setDossier] = useState<{ slug: string | null; name: string | null } | null>(null)
  const [negotiation, setNegotiation] = useState<{ proposalId: string; providerName: string | null } | null>(null)

  const tStyle = TASK_STYLES[taskStatus] ?? { label: taskStatus, cls: "bg-[#6B7280] text-white" }
  const counts = useMemo(() => countProposalsByStatus(proposals), [proposals])
  const visible = useMemo(
    () => filterAndSortProposals(proposals, { q, status: statusFilter, sort }),
    [proposals, q, statusFilter, sort],
  )

  async function onMark(proposalId: string, status: "shortlisted" | "rejected") {
    setBusy(true)
    setError(null)
    try {
      await setProposalStatus({ taskId, proposalId, status })
      setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status } : p)))
      setMsg(status === "shortlisted" ? "Proposta pré-seleccionada." : "Proposta recusada.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setBusy(false)
    }
  }

  async function onAward(proposalId: string) {
    const price = Number.parseInt(form.agreedPriceMzn, 10)
    if (!Number.isFinite(price) || price < 0) {
      setError("Indica o valor acordado")
      return
    }
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const res = (await acceptProposal({
        taskId,
        proposalId,
        agreedPriceMzn: price,
        agreedDeadlineAt: form.agreedDeadlineAt ? new Date(form.agreedDeadlineAt) : null,
        reviewNote: form.reviewNote.trim() || null,
      })) as unknown as { data: BidItem }
      const created = res.data
      setBid(created)
      setTaskStatus("in_progress")
      setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status: "accepted" } : p.status === "submitted" ? { ...p, status: "rejected" } : p)))
      setAwarding(null)
      setForm({ agreedPriceMzn: "", agreedDeadlineAt: "", reviewNote: "" })
      setMsg("Proposta adjudicada — o trabalho está em execução.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adjudicar")
    } finally {
      setBusy(false)
    }
  }

  async function onBidStatus(status: string) {
    if (!bid) return
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await updateBidStatus({ id: bid.id, status })
      setBid({ ...bid, status })
      if (status === "completed") setTaskStatus("completed")
      if (status === "cancelled") setTaskStatus("cancelled")
      setMsg("Adjudicação actualizada.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setBusy(false)
    }
  }

  async function onTaskStatus(status: string) {
    setBusy(true)
    setError(null)
    try {
      await updateTask(taskId, { status })
      setTaskStatus(status)
      setMsg("Tarefa actualizada.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setBusy(false)
    }
  }

  function openAward(p: ProposalItem) {
    setAwarding(p.id)
    setForm({ agreedPriceMzn: p.priceMzn != null ? String(p.priceMzn) : "", agreedDeadlineAt: "", reviewNote: "" })
    setError(null)
  }

  function openDossier(p: Pick<ProposalItem, "providerProfileSlug" | "providerProfileName">) {
    setDossier({ slug: p.providerProfileSlug, name: p.providerProfileName })
  }

  function openNegotiation(p: Pick<ProposalItem, "id" | "providerProfileName">) {
    setNegotiation({ proposalId: p.id, providerName: p.providerProfileName })
  }

  return (
    <div className="space-y-5">
      {msg && <p className="rounded-lg border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-3 py-2 text-xs text-[#0B5E56]">{msg}</p>}
      {error && <p className="rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs text-[#7A1A0A]">{error}</p>}

      {/* Adjudicação activa */}
      {bid && (
        <div className="rounded-[20px] border border-[#0B5E56]/25 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${(BID_STYLES[bid.status] ?? BID_STYLES.awarded!).cls}`}>{BID_STYLES[bid.status]?.label ?? bid.status}</span>
              <h2 className="text-sm font-black text-[#0F1A2E]">Adjudicação activa</h2>
            </div>
            <span className="text-xs text-[#0F1A2E]/50">Tarefa: <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tStyle.cls}`}>{tStyle.label}</span></span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-[#0F1A2E]/70">
            <button
              type="button"
              onClick={() => setDossier({ slug: bid.providerProfileSlug, name: bid.providerProfileName })}
              className="font-bold text-[#0F1A2E] underline decoration-[#0B5E56]/40 decoration-2 underline-offset-2 hover:text-[#0B5E56]"
            >
              {bid.providerProfileName ?? "Fornecedor"}
            </button>
            <span><span className="font-mono font-bold tabular-nums text-[#0F1A2E]">{fmtMzn(bid.agreedPriceMzn)}</span> acordado</span>
            {bid.agreedDeadlineAt && <span>prazo {new Date(bid.agreedDeadlineAt).toLocaleDateString("pt-MZ")}</span>}
            {bid.reviewNote && <span className="text-[#0F1A2E]/55">“{bid.reviewNote}”</span>}
          </div>
          {canManage && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(bid.status === "awarded") && (
                <>
                  <button onClick={() => onBidStatus("in_progress")} disabled={busy} className="rounded-full bg-[#0B5E56] px-4 py-2 text-xs font-bold text-white hover:bg-[#0A4A44] disabled:opacity-50">Iniciar execução</button>
                  <button onClick={() => onBidStatus("disputed")} disabled={busy} className="rounded-full border border-[#B91C1C]/25 bg-white px-4 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-[#B91C1C]/10 disabled:opacity-50">Disputar</button>
                  <button onClick={() => onBidStatus("cancelled")} disabled={busy} className="rounded-full border border-[#FF3B1F]/25 bg-white px-4 py-2 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10 disabled:opacity-50">Cancelar adjudicação</button>
                </>
              )}
              {bid.status === "in_progress" && (
                <>
                  <button onClick={() => onBidStatus("completed")} disabled={busy} className="rounded-full bg-[#0F766E] px-4 py-2 text-xs font-bold text-white hover:bg-[#0B5E56] disabled:opacity-50">Concluir trabalho</button>
                  <button onClick={() => onBidStatus("disputed")} disabled={busy} className="rounded-full border border-[#B91C1C]/25 bg-white px-4 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-[#B91C1C]/10 disabled:opacity-50">Disputar</button>
                  <button onClick={() => onBidStatus("cancelled")} disabled={busy} className="rounded-full border border-[#FF3B1F]/25 bg-white px-4 py-2 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10 disabled:opacity-50">Cancelar</button>
                </>
              )}
              {bid.status === "disputed" && (
                <>
                  <button onClick={() => onBidStatus("in_progress")} disabled={busy} className="rounded-full bg-[#0F1A2E] px-4 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-50">Retomar execução</button>
                  <button onClick={() => onBidStatus("cancelled")} disabled={busy} className="rounded-full border border-[#FF3B1F]/25 bg-white px-4 py-2 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10 disabled:opacity-50">Cancelar</button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Acções rápidas da tarefa (sem adjudicação activa) */}
      {canManage && !bid && (taskStatus === "open" || taskStatus === "in_review" || taskStatus === "withdrawn") && (
        <div className="rounded-[16px] border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3 text-xs text-[#0F1A2E]/60">
          <span className="mr-3 font-bold text-[#0F1A2E]">Gestão da tarefa:</span>
          {taskStatus === "open" && (
            <button onClick={() => onTaskStatus("withdrawn")} disabled={busy} className="mr-2 rounded-full border border-[#D9D2C2] bg-white px-3 py-1.5 font-semibold text-[#0F1A2E]/70 hover:bg-white/60">Retirar</button>
          )}
          {(taskStatus === "open" || taskStatus === "in_review") && (
            <button onClick={() => onTaskStatus("cancelled")} disabled={busy} className="mr-2 rounded-full border border-[#FF3B1F]/25 bg-white px-3 py-1.5 font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10">Cancelar tarefa</button>
          )}
          {taskStatus === "withdrawn" && (
            <button onClick={() => onTaskStatus("open")} disabled={busy} className="rounded-full border border-[#0B5E56]/25 bg-white px-3 py-1.5 font-semibold text-[#0B5E56] hover:bg-[#0B5E56]/10">Reabrir tarefa</button>
          )}
        </div>
      )}

      {/* Mesa de decisão — propostas */}
      <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              Propostas recebidas
            </h2>
            {(budgetMin != null || budgetMax != null) && (
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[#0F1A2E]/55">
                orçamento {budgetMin != null ? fmtMzn(budgetMin) : "—"} – {budgetMax != null ? fmtMzn(budgetMax) : "—"}
              </p>
            )}
          </div>
          <span className="rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[11px] font-bold tabular-nums text-white">
            {visible.length} de {proposals.length}
          </span>
        </div>
        <p className="mt-2 rounded-xl border border-[#0B5E56]/20 bg-[#0B5E56]/5 px-3 py-2 text-[11px] leading-relaxed text-[#0F1A2E]/60">
          Toca no nome da empresa para ver a ficha — avaliações, serviços e dimensão — antes de decidir. A negociação corre no chat da tarefa.
        </p>

        {/* Barra de pesquisa, filtros e ordenação */}
        <div className="mt-3 space-y-2.5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#0F1A2E]/35" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar empresa ou mensagem…"
                className="w-full rounded-full border border-[#D9D2C2] bg-[#F6F3EE] py-2 pl-9 pr-3 text-[13px] text-[#0F1A2E] outline-none placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ProposalSort)}
              aria-label="Ordenar propostas"
              className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] font-semibold text-[#0F1A2E] outline-none focus:border-[#0B5E56]"
            >
              {(Object.keys(SORT_LABELS) as ProposalSort[]).map((s) => (
                <option key={s} value={s}>{SORT_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
            <FilterChip active={statusFilter === "all"} count={counts.all} label="Todas" onClick={() => setStatusFilter("all")} />
            {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                count={counts[s]}
                label={PROPOSAL_STYLES[s]?.label ?? s}
                onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              />
            ))}
          </div>
        </div>

        {proposals.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-[#D9D2C2] bg-[#F6F3EE] p-5 text-center text-sm text-[#0F1A2E]/50">
            Nenhuma proposta ainda — quando fornecedores se candidatarem, aparecem aqui para comparar, negociar e adjudicar.
          </p>
        )}

        {proposals.length > 0 && visible.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-[#D9D2C2] bg-[#F6F3EE] p-5 text-center text-sm text-[#0F1A2E]/50">
            Nada corresponde à pesquisa ou ao filtro — limpa para ver todas as propostas.
          </p>
        )}

        <div className="mt-3 space-y-3">
          {visible.map((p) => {
            const st = PROPOSAL_STYLES[p.status] ?? { label: p.status, cls: "bg-[#6B7280] text-white" }
            const note = budgetNote(p.priceMzn, budgetMax)
            return (
              <article key={p.id} className="rounded-[16px] border border-[#D9D2C2] bg-[#F6F3EE]/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0F1A2E] text-xs font-black text-white">
                      {p.providerProfileLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.providerProfileLogo} alt="" className="size-full object-cover" />
                      ) : (
                        (p.providerProfileName ?? "?").slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openDossier(p)}
                        title="Ver ficha da empresa"
                        className="block max-w-full truncate text-left text-sm font-bold text-[#0F1A2E] underline decoration-[#0B5E56]/40 decoration-2 underline-offset-2 hover:text-[#0B5E56]"
                      >
                        {p.providerProfileName ?? "Perfil de fornecedor"}
                      </button>
                      <p className="text-xs text-[#0F1A2E]/50">
                        {p.estimatedDays != null ? `entrega em ~${p.estimatedDays} dia${p.estimatedDays === 1 ? "" : "s"} · ` : ""}
                        recebida {new Date(p.createdAt).toLocaleDateString("pt-MZ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <p className="font-mono text-xl font-black tabular-nums tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                      {p.priceMzn != null ? fmtMzn(p.priceMzn) : "—"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {note && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${note.startsWith("+") ? "bg-[#D97706]/15 text-[#8A4B00]" : "bg-[#0B5E56]/10 text-[#0B5E56]"}`}>
                          {note}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-[#0F1A2E]/65">{p.message}</p>

                {canManage && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openDossier(p)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D2C2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"
                    >
                      <FiUser className="size-3.5" aria-hidden /> Ficha
                    </button>
                    <button
                      type="button"
                      onClick={() => openNegotiation(p)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#0B5E56]/25 bg-white px-3.5 py-1.5 text-xs font-bold text-[#0B5E56] hover:bg-[#0B5E56]/10"
                    >
                      <FiMessageCircle className="size-3.5" aria-hidden /> Negociar
                    </button>
                    {(p.status === "submitted" || p.status === "shortlisted") && !bid && (
                      <>
                        {p.status === "submitted" && (
                          <button onClick={() => onMark(p.id, "shortlisted")} disabled={busy} className="rounded-full bg-[#0B5E56] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0A4A44] disabled:opacity-50">
                            Pré-seleccionar
                          </button>
                        )}
                        {p.status !== "shortlisted" ? (
                          <button onClick={() => onMark(p.id, "rejected")} disabled={busy} className="rounded-full border border-[#FF3B1F]/25 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10 disabled:opacity-50">
                            Recusar
                          </button>
                        ) : (
                          <button onClick={() => openAward(p)} className="rounded-full bg-[#0F1A2E] px-4 py-1.5 text-xs font-bold text-white hover:bg-black">Adjudicar →</button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {awarding === p.id && (
                  <div className="mt-3 rounded-[14px] border border-[#D9D2C2] bg-white p-4">
                    <p className="text-xs font-black text-[#0F1A2E]">Adjudicar a {p.providerProfileName ?? "fornecedor"}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input value={form.agreedPriceMzn} onChange={(e) => setForm({ ...form, agreedPriceMzn: e.target.value })} type="number" min={0} placeholder="Valor acordado (MZN) *" className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                      <input value={form.agreedDeadlineAt} onChange={(e) => setForm({ ...form, agreedDeadlineAt: e.target.value })} type="datetime-local" className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                    </div>
                    <input value={form.reviewNote} onChange={(e) => setForm({ ...form, reviewNote: e.target.value })} placeholder="Nota interna (opcional)" maxLength={1000} className="mt-3 w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => onAward(p.id)} disabled={busy} className="rounded-full bg-[#0F1A2E] px-5 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-50">
                        {busy ? "A adjudicar…" : "Confirmar adjudicação"}
                      </button>
                      <button onClick={() => setAwarding(null)} className="rounded-full border border-[#D9D2C2] bg-white px-5 py-2 text-xs font-semibold">Cancelar</button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>

      <CompanyDossierSheet
        key={dossier?.slug ?? "none"}
        open={dossier !== null}
        onOpenChange={(o) => {
          if (!o) setDossier(null)
        }}
        slug={dossier?.slug ?? null}
        fallbackName={dossier?.name ?? null}
        onNegotiate={() => {
          const current = proposals.find((p) => p.providerProfileSlug === dossier?.slug)
            ?? proposals.find((p) => p.providerProfileName === dossier?.name)
          setDossier(null)
          if (current) setNegotiation({ proposalId: current.id, providerName: current.providerProfileName })
        }}
      />
      <NegotiationSheet
        key={negotiation?.proposalId ?? "none"}
        open={negotiation !== null}
        onOpenChange={(o) => {
          if (!o) setNegotiation(null)
        }}
        proposalId={negotiation?.proposalId ?? null}
        providerName={negotiation?.providerName ?? null}
        taskTitle={taskTitle}
      />
    </div>
  )
}

function FilterChip({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
        active ? "bg-[#0F1A2E] text-white" : "border border-[#D9D2C2] bg-white text-[#0F1A2E]/65 hover:bg-[#F6F3EE]"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-white/20" : "bg-[#F6F3EE]"}`}>{count}</span>
    </button>
  )
}
