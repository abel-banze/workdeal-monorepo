"use client"

import { useState } from "react"
import Link from "next/link"
import { updateBidStatus } from "@/app/actions/tasks"
import type { ProposalSentItem, BidWonItem } from "./page"

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

export function OpportunitiesManager({
  activeTab,
  initialProposals,
  initialBids,
  canManage,
  organizationId,
}: {
  activeTab: string
  initialProposals: ProposalSentItem[]
  initialBids: BidWonItem[]
  canManage: boolean
  organizationId: string
}) {
  const [proposals] = useState<ProposalSentItem[]>(initialProposals)
  const [bids, setBids] = useState<BidWonItem[]>(initialBids)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function onBidStatus(bid: BidWonItem, status: string) {
    setBusy(bid.id)
    setError(null)
    setMsg(null)
    try {
      await updateBidStatus({ id: bid.id, status })
      setBids((prev) => prev.map((b) => (b.id === bid.id ? { ...b, status } : b)))
      setMsg("Adjudicação actualizada.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      {msg && <p className="rounded-lg border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-3 py-2 text-xs text-[#0B5E56]">{msg}</p>}
      {error && <p className="rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs text-[#7A1A0A]">{error}</p>}

      {activeTab === "proposals" && (
        <div className="space-y-3">
          {proposals.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#D9D2C2] bg-white p-6 text-center text-sm text-[#0F1A2E]/50">
              Ainda não enviaste nenhuma proposta. Candidata-te a tarefas do directório para aparecerem aqui.
            </p>
          )}
          {proposals.map((p) => {
            const st = PROPOSAL_STYLES[p.status] ?? { label: p.status, cls: "bg-[#6B7280] text-white" }
            return (
              <div key={p.id} className="rounded-[18px] border border-[#D9D2C2] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-black leading-tight text-[#0F1A2E]">{p.taskTitle ?? "Tarefa"}</h3>
                    <p className="mt-0.5 text-xs text-[#0F1A2E]/50">
                      {p.requesterUserName ? `solicitante ${p.requesterUserName} · ` : ""}
                      enviada {new Date(p.createdAt).toLocaleDateString("pt-MZ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    {p.priceMzn != null && <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 font-mono text-xs font-bold text-[#0F1A2E]">{p.priceMzn.toLocaleString("pt-MZ")} MZN</span>}
                  </div>
                </div>
                {p.estimatedDays != null && <p className="mt-1 text-xs text-[#0F1A2E]/55">Entrega em ~{p.estimatedDays} dias</p>}
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#0F1A2E]/60">{p.message}</p>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === "bids" && (
        <div className="space-y-3">
          {bids.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#D9D2C2] bg-white p-6 text-center text-sm text-[#0F1A2E]/50">
              Nenhuma adjudicação ganha ainda. Quando um solicitante aceitar uma tua proposta, o trabalho aparece aqui.
            </p>
          )}
          {bids.map((b) => {
            const st = BID_STYLES[b.status] ?? { label: b.status, cls: "bg-[#6B7280] text-white" }
            return (
              <div key={b.id} className="rounded-[18px] border border-[#D9D2C2] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-black leading-tight text-[#0F1A2E]">{b.taskTitle ?? "Tarefa"}</h3>
                    <p className="mt-0.5 text-xs text-[#0F1A2E]/50">
                      {b.requesterUserName ? `contratante ${b.requesterUserName} · ` : ""}
                      ganha a {new Date(b.createdAt).toLocaleDateString("pt-MZ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 font-mono text-xs font-bold text-[#0F1A2E]">{b.agreedPriceMzn.toLocaleString("pt-MZ")} MZN</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#0F1A2E]/55">
                  {b.taskStatus && <span>Tarefa: {b.taskStatus.replace("_", " ")}</span>}
                  {b.agreedDeadlineAt && <span>prazo {new Date(b.agreedDeadlineAt).toLocaleDateString("pt-MZ")}</span>}
                  {b.reviewNote && <span>“{b.reviewNote}”</span>}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canManage && b.status === "awarded" && (
                    <>
                      <button onClick={() => onBidStatus(b, "in_progress")} disabled={busy === b.id} className="rounded-full bg-[#0B5E56] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#0A4A44] disabled:opacity-50">Iniciar execução</button>
                      <button onClick={() => onBidStatus(b, "disputed")} disabled={busy === b.id} className="rounded-full border border-[#B91C1C]/25 bg-white px-4 py-1.5 text-xs font-semibold text-[#B91C1C] hover:bg-[#B91C1C]/10 disabled:opacity-50">Disputar</button>
                    </>
                  )}
                  {canManage && b.status === "in_progress" && (
                    <>
                      <button onClick={() => onBidStatus(b, "completed")} disabled={busy === b.id} className="rounded-full bg-[#0F766E] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#0B5E56] disabled:opacity-50">Concluir trabalho</button>
                      <button onClick={() => onBidStatus(b, "disputed")} disabled={busy === b.id} className="rounded-full border border-[#B91C1C]/25 bg-white px-4 py-1.5 text-xs font-semibold text-[#B91C1C] hover:bg-[#B91C1C]/10 disabled:opacity-50">Disputar</button>
                    </>
                  )}
                  {canManage && b.status === "disputed" && (
                    <>
                      <button onClick={() => onBidStatus(b, "in_progress")} disabled={busy === b.id} className="rounded-full bg-[#0F1A2E] px-4 py-1.5 text-xs font-bold text-white hover:bg-black disabled:opacity-50">Retomar execução</button>
                      <button onClick={() => onBidStatus(b, "cancelled")} disabled={busy === b.id} className="rounded-full border border-[#FF3B1F]/25 bg-white px-4 py-1.5 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10 disabled:opacity-50">Cancelar</button>
                    </>
                  )}
                  <Link href={`/dashboard/${organizationId}/tasks/${b.taskId}`} className="ml-auto rounded-full border border-[#D9D2C2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F1A2E]/70 hover:border-[#0F1A2E]">
                    Ver tarefa →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}