"use client"

import { useState } from "react"
import { acceptProposal, setProposalStatus, updateBidStatus, updateTask } from "@/app/actions/tasks"

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

export function ProposalReview({
  taskId,
  initialStatus,
  initialProposals,
  initialBid,
  canManage,
}: {
  taskId: string
  initialStatus: string
  initialProposals: ProposalItem[]
  initialBid: BidItem | null
  canManage: boolean
}) {
  const [proposals, setProposals] = useState<ProposalItem[]>(initialProposals)
  const [bid, setBid] = useState<BidItem | null>(initialBid)
  const [taskStatus, setTaskStatus] = useState(initialStatus)
  const [awarding, setAwarding] = useState<string | null>(null)
  const [form, setForm] = useState<{ agreedPriceMzn: string; agreedDeadlineAt: string; reviewNote: string }>({ agreedPriceMzn: "", agreedDeadlineAt: "", reviewNote: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const tStyle = TASK_STYLES[taskStatus] ?? { label: taskStatus, cls: "bg-[#6B7280] text-white" }

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
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[#0F1A2E]/70">
            <span>
              <span className="font-bold text-[#0F1A2E]">{bid.providerProfileName ?? "Fornecedor"}</span>
              {bid.providerProfileSlug && <a className="ml-1 text-[#0B5E56] hover:underline" href={`/profiles/${bid.providerProfileSlug}`}>ver perfil ↗</a>}
            </span>
            <span><span className="font-mono font-bold text-[#0F1A2E]">{bid.agreedPriceMzn.toLocaleString("pt-MZ")} MZN</span> acordado</span>
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

      {/* Propostas */}
      <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#0F1A2E]">Propostas recebidas</h2>
          <span className="rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[11px] font-bold text-white">{proposals.length}</span>
        </div>

        {proposals.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-[#D9D2C2] bg-[#F6F3EE] p-5 text-center text-sm text-[#0F1A2E]/50">
            Nenhuma proposta ainda — quando fornecedores se candidatarem, aparecem aqui para pré-selecção e adjudicação.
          </p>
        )}

        <div className="mt-3 space-y-3">
          {proposals.map((p) => {
            const st = PROPOSAL_STYLES[p.status] ?? { label: p.status, cls: "bg-[#6B7280] text-white" }
            return (
              <div key={p.id} className="rounded-[16px] border border-[#D9D2C2] bg-[#F6F3EE]/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[#0F1A2E] text-[11px] font-black text-white">
                      {(p.providerProfileName ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight text-[#0F1A2E]">{p.providerProfileName ?? "Perfil de fornecedor"}</p>
                      <p className="text-xs text-[#0F1A2E]/50">
                        {p.estimatedDays != null ? `entrega em ~${p.estimatedDays} dia${p.estimatedDays === 1 ? "" : "s"} · ` : ""}
                        recebida {new Date(p.createdAt).toLocaleDateString("pt-MZ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    <span className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#0F1A2E]">
                      {p.priceMzn != null ? `${p.priceMzn.toLocaleString("pt-MZ")} MZN` : "Sem preço"}
                    </span>
                  </div>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-[#0F1A2E]/65">{p.message}</p>

                {canManage && (p.status === "submitted" || p.status === "shortlisted") && !bid && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(p.status === "submitted" || p.status === "shortlisted") && (
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
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}