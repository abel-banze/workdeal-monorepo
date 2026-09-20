"use client"

import { useState } from "react"
import Link from "next/link"
import { FiArrowRight, FiMessageCircle } from "react-icons/fi"
import { updateBidStatus } from "@/app/actions/tasks"
import { NegotiationSheet } from "@/components/features/negotiation-sheet"
import type { ProposalSentItem, BidWonItem } from "./page"

const PROPOSAL_STYLES: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Submetida", cls: "bg-muted text-foreground" },
  shortlisted: { label: "Pré-seleccionada", cls: "bg-primary text-primary-foreground" },
  rejected: { label: "Recusada", cls: "bg-destructive/10 text-destructive" },
  withdrawn: { label: "Retirada", cls: "border border-border bg-card text-muted-foreground" },
  accepted: { label: "Aceite", cls: "bg-primary/10 text-primary" },
}

const BID_STYLES: Record<string, { label: string; cls: string }> = {
  awarded: { label: "Adjudicada", cls: "bg-primary text-primary-foreground" },
  in_progress: { label: "Em execução", cls: "bg-muted text-foreground" },
  completed: { label: "Concluída", cls: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/10 text-destructive" },
  disputed: { label: "Em disputa", cls: "border border-destructive/40 bg-card text-destructive" },
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
  const [negotiation, setNegotiation] = useState<{ proposalId: string; taskTitle: string } | null>(null)
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
      {msg && <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">{msg}</p>}
      {error && <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      {activeTab === "proposals" && (
        <div className="space-y-3">
          {proposals.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Ainda não enviaste nenhuma proposta. Candidata-te a tarefas do directório para aparecerem aqui.
            </p>
          )}
          {proposals.map((p) => {
            const st = PROPOSAL_STYLES[p.status] ?? { label: p.status, cls: "bg-muted text-muted-foreground" }
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold leading-tight text-foreground">{p.taskTitle ?? "Tarefa"}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.requesterUserName ? `${p.requesterUserName} · ` : ""}
                      enviada {new Date(p.createdAt).toLocaleDateString("pt-MZ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    {p.priceMzn != null && <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-xs font-bold text-foreground">{p.priceMzn.toLocaleString("pt-MZ")} MZN</span>}
                  </div>
                </div>
                {p.estimatedDays != null && <p className="mt-1 text-xs text-muted-foreground">Entrega em ~{p.estimatedDays} dias</p>}
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{p.message}</p>
                {(p.status === "submitted" || p.status === "shortlisted" || p.status === "accepted") && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setNegotiation({ proposalId: p.id, taskTitle: p.taskTitle ?? "Tarefa" })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
                    >
                      <FiMessageCircle className="size-3.5" aria-hidden /> Negociação
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <NegotiationSheet
        key={negotiation?.proposalId ?? "none"}
        open={negotiation !== null}
        onOpenChange={(o) => {
          if (!o) setNegotiation(null)
        }}
        proposalId={negotiation?.proposalId ?? null}
        providerName={null}
        taskTitle={negotiation?.taskTitle ?? "Tarefa"}
        viewerSide="provider"
      />

      {activeTab === "bids" && (
        <div className="space-y-3">
          {bids.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Nenhuma adjudicação ganha ainda. Quando um solicitante aceitar uma tua proposta, o trabalho aparece aqui.
            </p>
          )}
          {bids.map((b) => {
            const st = BID_STYLES[b.status] ?? { label: b.status, cls: "bg-muted text-muted-foreground" }
            return (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold leading-tight text-foreground">{b.taskTitle ?? "Tarefa"}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {b.requesterUserName ? `contratante ${b.requesterUserName} · ` : ""}
                      ganha a {new Date(b.createdAt).toLocaleDateString("pt-MZ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-xs font-bold text-foreground">{b.agreedPriceMzn.toLocaleString("pt-MZ")} MZN</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {b.taskStatus && <span>Tarefa: {b.taskStatus.replace("_", " ")}</span>}
                  {b.agreedDeadlineAt && <span>prazo {new Date(b.agreedDeadlineAt).toLocaleDateString("pt-MZ")}</span>}
                  {b.reviewNote && <span>“{b.reviewNote}”</span>}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canManage && b.status === "awarded" && (
                    <>
                      <button onClick={() => onBidStatus(b, "in_progress")} disabled={busy === b.id} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">Iniciar execução</button>
                      <button onClick={() => onBidStatus(b, "disputed")} disabled={busy === b.id} className="rounded-full border border-destructive/25 bg-card px-4 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Disputar</button>
                    </>
                  )}
                  {canManage && b.status === "in_progress" && (
                    <>
                      <button onClick={() => onBidStatus(b, "completed")} disabled={busy === b.id} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary disabled:opacity-50">Concluir trabalho</button>
                      <button onClick={() => onBidStatus(b, "disputed")} disabled={busy === b.id} className="rounded-full border border-destructive/25 bg-card px-4 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Disputar</button>
                    </>
                  )}
                  {canManage && b.status === "disputed" && (
                    <>
                      <button onClick={() => onBidStatus(b, "in_progress")} disabled={busy === b.id} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">Retomar execução</button>
                      <button onClick={() => onBidStatus(b, "cancelled")} disabled={busy === b.id} className="rounded-full border border-destructive/25 bg-card px-4 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Cancelar</button>
                    </>
                  )}
                  <Link href={`/dashboard/${organizationId}/tasks/${b.taskId}`} className="ml-auto inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                    Ver tarefa <FiArrowRight className="size-3.5" aria-hidden />
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