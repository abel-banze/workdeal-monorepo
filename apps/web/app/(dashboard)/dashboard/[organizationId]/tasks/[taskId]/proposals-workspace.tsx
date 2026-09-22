"use client"

import { useMemo, useState } from "react"
import { FiArrowRight, FiMessageCircle, FiMoreHorizontal, FiSearch, FiSliders, FiUser, FiX } from "react-icons/fi"
import { acceptProposal, setProposalStatus, updateBidStatus, updateTask } from "@/app/actions/tasks"
import { CompanyDossierSheet } from "@/components/features/company-dossier-sheet"
import { NegotiationSheet } from "@/components/features/negotiation-sheet"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@workspace/ui/components/select"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import {
  DEFAULT_PROPOSAL_QUERY,
  countActiveFilters,
  countProposalsByStatus,
  filterAndSortProposals,
  proposalFacets,
  type ProposalQuery,
  type ProposalSort,
  type ProposalStatusFilter,
  type ProposalSummary,
} from "./proposals-filter"

type ProposalItem = ProposalSummary & {
  providerProfileId: string
  providerProfileSlug: string | null
  providerProfileLogo: string | null
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

const PAGE_SIZE = 15

const PROPOSAL_STYLES: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Submetida", cls: "bg-muted text-foreground" },
  shortlisted: { label: "Pré-seleccionada", cls: "bg-primary text-primary-foreground" },
  rejected: { label: "Recusada", cls: "bg-destructive/10 text-destructive" },
  withdrawn: { label: "Retirada", cls: "border border-border bg-card text-muted-foreground" },
  accepted: { label: "Aceite", cls: "bg-primary/10 text-primary" },
}

const STATUS_ORDER: ProposalStatusFilter[] = ["submitted", "shortlisted", "accepted", "rejected", "withdrawn"]

const SORT_LABELS: Record<ProposalSort, string> = {
  recent: "Mais recentes",
  priceAsc: "Menor preço",
  priceDesc: "Maior preço",
  daysAsc: "Menor prazo",
}

const DAYS_OPTIONS = [
  { value: "", label: "Qualquer prazo" },
  { value: "3", label: "Até 3 dias" },
  { value: "7", label: "Até 7 dias" },
  { value: "14", label: "Até 14 dias" },
  { value: "30", label: "Até 30 dias" },
]

const BID_STYLES: Record<string, { label: string; cls: string }> = {
  awarded: { label: "Adjudicada", cls: "bg-primary text-primary-foreground" },
  in_progress: { label: "Em execução", cls: "bg-muted text-foreground" },
  completed: { label: "Concluída", cls: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/10 text-destructive" },
  disputed: { label: "Em disputa", cls: "border border-destructive/40 bg-card text-destructive" },
}

const TASK_STYLES: Record<string, { label: string; cls: string }> = {
  open: { label: "Aceitando propostas", cls: "bg-primary text-primary-foreground" },
  in_review: { label: "Em análise", cls: "border border-border bg-card text-foreground" },
  in_progress: { label: "Em execução", cls: "bg-muted text-foreground" },
  completed: { label: "Concluída", cls: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/10 text-destructive" },
  withdrawn: { label: "Retirada", cls: "border border-border bg-card text-muted-foreground" },
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

  const [query, setQuery] = useState<ProposalQuery>(DEFAULT_PROPOSAL_QUERY)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [priceMinDraft, setPriceMinDraft] = useState("")
  const [priceMaxDraft, setPriceMaxDraft] = useState("")
  const [dossier, setDossier] = useState<{ slug: string | null; name: string | null } | null>(null)
  const [negotiation, setNegotiation] = useState<{ proposalId: string; providerName: string | null } | null>(null)

  const tStyle = TASK_STYLES[taskStatus] ?? { label: taskStatus, cls: "bg-muted text-muted-foreground" }
  const counts = useMemo(() => countProposalsByStatus(proposals), [proposals])
  const facets = useMemo(() => proposalFacets(proposals), [proposals])
  const visible = useMemo(() => filterAndSortProposals(proposals, query), [proposals, query])
  const shown = useMemo(() => visible.slice(0, page * PAGE_SIZE), [visible, page])
  const activeFilters = countActiveFilters(query)

  function patchQuery(patch: Partial<ProposalQuery>) {
    setQuery((q) => ({ ...q, ...patch }))
    setPage(1)
  }

  function clearFilters() {
    setQuery((q) => ({ ...q, priceMin: null, priceMax: null, maxDays: null, provinces: [], badgeSlugs: [] }))
    setPriceMinDraft("")
    setPriceMaxDraft("")
    setPage(1)
  }

  function toggleProvince(province: string) {
    const has = query.provinces.includes(province)
    patchQuery({ provinces: has ? query.provinces.filter((p) => p !== province) : [...query.provinces, province] })
  }

  function toggleBadge(slug: string) {
    const has = query.badgeSlugs.includes(slug)
    patchQuery({ badgeSlugs: has ? query.badgeSlugs.filter((s) => s !== slug) : [...query.badgeSlugs, slug] })
  }

  function applyPriceDrafts() {
    const min = priceMinDraft.trim() === "" ? null : Number.parseInt(priceMinDraft, 10)
    const max = priceMaxDraft.trim() === "" ? null : Number.parseInt(priceMaxDraft, 10)
    patchQuery({
      priceMin: min != null && Number.isFinite(min) && min >= 0 ? min : null,
      priceMax: max != null && Number.isFinite(max) && max >= 0 ? max : null,
    })
  }

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

  const taskActionsAvailable = canManage && !bid && (taskStatus === "open" || taskStatus === "in_review" || taskStatus === "withdrawn")

  return (
    <div className="space-y-5">
      {msg && <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">{msg}</p>}
      {error && <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      {/* Adjudicação activa */}
      {bid && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${(BID_STYLES[bid.status] ?? BID_STYLES.awarded!).cls}`}>{BID_STYLES[bid.status]?.label ?? bid.status}</span>
              <h2 className="text-sm font-semibold">Adjudicação activa</h2>
            </div>
            <span className="text-xs text-muted-foreground">Tarefa: <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tStyle.cls}`}>{tStyle.label}</span></span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-muted-foreground">
            <button
              type="button"
              onClick={() => setDossier({ slug: bid.providerProfileSlug, name: bid.providerProfileName })}
              className="font-bold text-foreground underline decoration-primary/40 decoration-2 underline-offset-2 hover:text-primary"
            >
              {bid.providerProfileName ?? "Fornecedor"}
            </button>
            <span><span className="font-mono font-bold tabular-nums text-foreground">{fmtMzn(bid.agreedPriceMzn)}</span> acordado</span>
            {bid.agreedDeadlineAt && <span>prazo {new Date(bid.agreedDeadlineAt).toLocaleDateString("pt-MZ")}</span>}
            {bid.reviewNote && <span className="text-muted-foreground">“{bid.reviewNote}”</span>}
          </div>
          {canManage && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(bid.status === "awarded") && (
                <>
                  <button onClick={() => onBidStatus("in_progress")} disabled={busy} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">Iniciar execução</button>
                  <button onClick={() => onBidStatus("disputed")} disabled={busy} className="rounded-full border border-destructive/25 bg-card px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Disputar</button>
                  <button onClick={() => onBidStatus("cancelled")} disabled={busy} className="rounded-full border border-destructive/25 bg-card px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Cancelar adjudicação</button>
                </>
              )}
              {bid.status === "in_progress" && (
                <>
                  <button onClick={() => onBidStatus("completed")} disabled={busy} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">Concluir trabalho</button>
                  <button onClick={() => onBidStatus("disputed")} disabled={busy} className="rounded-full border border-destructive/25 bg-card px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Disputar</button>
                  <button onClick={() => onBidStatus("cancelled")} disabled={busy} className="rounded-full border border-destructive/25 bg-card px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Cancelar</button>
                </>
              )}
              {bid.status === "disputed" && (
                <>
                  <button onClick={() => onBidStatus("in_progress")} disabled={busy} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">Retomar execução</button>
                  <button onClick={() => onBidStatus("cancelled")} disabled={busy} className="rounded-full border border-destructive/25 bg-card px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Cancelar</button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mesa de decisão — propostas */}
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Propostas
            </h2>
            {(budgetMin != null || budgetMax != null) && (
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                orçamento {budgetMin != null ? fmtMzn(budgetMin) : "—"} – {budgetMax != null ? fmtMzn(budgetMax) : "—"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold tabular-nums text-primary-foreground">
              {visible.length} de {proposals.length}
            </span>
            {taskActionsAvailable && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Gestão da tarefa"
                  className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <FiMoreHorizontal className="size-4" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl border-border bg-card p-1.5 shadow-lg">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Gestão da tarefa
                  </p>
                  {taskStatus === "open" && (
                    <DropdownMenuItem onClick={() => onTaskStatus("withdrawn")} disabled={busy} className="rounded-xl text-[13px]">
                      Retirar (pausar propostas)
                    </DropdownMenuItem>
                  )}
                  {(taskStatus === "open" || taskStatus === "in_review") && (
                    <DropdownMenuItem onClick={() => onTaskStatus("cancelled")} disabled={busy} className="rounded-xl text-[13px] text-destructive">
                      Cancelar tarefa
                    </DropdownMenuItem>
                  )}
                  {taskStatus === "withdrawn" && (
                    <DropdownMenuItem onClick={() => onTaskStatus("open")} disabled={busy} className="rounded-xl text-[13px] text-primary">
                      Reabrir tarefa
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="rounded-xl text-[11px] text-muted-foreground">
                    Adjudicar faz-se por proposta, abaixo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Barra fixa: pesquisa, filtros, ordenação */}
        <div className="sticky top-0 z-10 -mx-4 mt-3 space-y-2 bg-card/95 px-4 py-2 backdrop-blur-sm sm:-mx-5 sm:px-5">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                value={query.q}
                onChange={(e) => patchQuery({ q: e.target.value })}
                placeholder="Pesquisar empresa ou mensagem…"
                aria-label="Pesquisar propostas"
                className="w-full rounded-full border border-border bg-muted py-2 pl-9 pr-8 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:bg-card"
              />
              {query.q && (
                <button
                  type="button"
                  onClick={() => patchQuery({ q: "" })}
                  aria-label="Limpar pesquisa"
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <FiX className="size-3.5" aria-hidden />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-bold transition-colors ${
                activeFilters > 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <FiSliders className="size-4" aria-hidden />
              Filtros
              {activeFilters > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-card text-[11px] font-bold tabular-nums text-foreground">
                  {activeFilters}
                </span>
              )}
            </button>
            <Select value={query.sort} onValueChange={(v) => patchQuery({ sort: v as ProposalSort })}>
              <SelectTrigger aria-label="Ordenar propostas" className="h-auto w-auto shrink-0 rounded-full border-border bg-card py-2 text-[13px] font-semibold">
                <span className="max-w-[110px] truncate">
                  {SORT_LABELS[query.sort]}
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {(Object.keys(SORT_LABELS) as ProposalSort[]).map((s) => (
                  <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
            <FilterChip active={query.status === "all"} count={counts.all} label="Todas" onClick={() => patchQuery({ status: "all" })} />
            {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
              <FilterChip
                key={s}
                active={query.status === s}
                count={counts[s]}
                label={PROPOSAL_STYLES[s]?.label ?? s}
                onClick={() => patchQuery({ status: query.status === s ? "all" : s })}
              />
            ))}
          </div>
        </div>

        {proposals.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-muted p-5 text-center text-sm text-muted-foreground">
            Nenhuma proposta ainda — quando fornecedores se candidatarem, aparecem aqui para comparar, negociar e adjudicar.
          </p>
        )}

        {proposals.length > 0 && visible.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted p-5 text-center">
            <p className="text-sm text-muted-foreground">Nada corresponde à pesquisa ou aos filtros.</p>
            <button
              type="button"
              onClick={() => {
                clearFilters()
                patchQuery({ q: "", status: "all" })
              }}
              className="mt-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/5"
            >
              Limpar tudo
            </button>
          </div>
        )}

        <div className="mt-3 space-y-2">
          {shown.map((p) => {
            const st = PROPOSAL_STYLES[p.status] ?? { label: p.status, cls: "bg-muted text-muted-foreground" }
            const note = budgetNote(p.priceMzn, budgetMax)
            const location = [p.providerDistrict, p.providerProvince].filter(Boolean).join(" · ")
            return (
              <article key={p.id} className="rounded-xl border border-border bg-muted/50 px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-primary-foreground">
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
                        className="block max-w-full truncate text-left text-sm font-bold text-foreground underline decoration-primary/40 decoration-2 underline-offset-2 hover:text-primary"
                      >
                        {p.providerProfileName ?? "Perfil de fornecedor"}
                      </button>
                      <p className="truncate text-xs text-muted-foreground">
                        {[location || null, p.estimatedDays != null ? `~${p.estimatedDays}d` : null, new Date(p.createdAt).toLocaleDateString("pt-MZ")].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="font-mono text-[15px] font-bold tabular-nums tracking-tight text-foreground">
                      {p.priceMzn != null ? fmtMzn(p.priceMzn) : <span className="text-xs font-semibold text-muted-foreground">sob consulta</span>}
                    </p>
                    <div className="flex items-center gap-1">
                      {note && (
                        <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${note.startsWith("+") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                          {note}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                  </div>
                </div>

                {(p.providerBadges?.length ?? 0) > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(p.providerBadges ?? []).slice(0, 3).map((b) => (
                      <span key={b.slug} className="rounded-full bg-card px-2 py-px text-[10px] font-bold text-primary ring-1 ring-primary/20">
                        {b.name}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{p.message}</p>

                {canManage && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => openDossier(p)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                    >
                      <FiUser className="size-3" aria-hidden /> Ficha
                    </button>
                    <button
                      type="button"
                      onClick={() => openNegotiation(p)}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-bold text-primary hover:bg-primary/10"
                    >
                      <FiMessageCircle className="size-3" aria-hidden /> Negociar
                    </button>
                    {(p.status === "submitted" || p.status === "shortlisted") && !bid && (
                      <>
                        {p.status === "submitted" && (
                          <button onClick={() => onMark(p.id, "shortlisted")} disabled={busy} className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                            Pré-seleccionar
                          </button>
                        )}
                        {p.status !== "shortlisted" ? (
                          <button onClick={() => onMark(p.id, "rejected")} disabled={busy} className="rounded-full border border-destructive/25 bg-card px-3 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">
                            Recusar
                          </button>
                        ) : (
                          <button onClick={() => openAward(p)} className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/80">Adjudicar <FiArrowRight className="size-3" aria-hidden /></button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {awarding === p.id && (
                  <div className="mt-2.5 rounded-xl border border-border bg-card p-3.5">
                    <p className="text-xs font-bold text-foreground">Adjudicar a {p.providerProfileName ?? "fornecedor"}</p>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                      <input value={form.agreedPriceMzn} onChange={(e) => setForm({ ...form, agreedPriceMzn: e.target.value })} type="number" min={0} placeholder="Valor acordado (MZN) *" className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                      <input value={form.agreedDeadlineAt} onChange={(e) => setForm({ ...form, agreedDeadlineAt: e.target.value })} type="datetime-local" className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                    </div>
                    <input value={form.reviewNote} onChange={(e) => setForm({ ...form, reviewNote: e.target.value })} placeholder="Nota interna (opcional)" maxLength={1000} className="mt-2.5 w-full rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                    <div className="mt-2.5 flex gap-2">
                      <button onClick={() => onAward(p.id)} disabled={busy} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                        {busy ? "A adjudicar…" : "Confirmar adjudicação"}
                      </button>
                      <button onClick={() => setAwarding(null)} className="rounded-full border border-border bg-card px-5 py-2 text-xs font-semibold">Cancelar</button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {visible.length > shown.length && (
          <button
            type="button"
            onClick={() => setPage((n) => n + 1)}
            className="mt-3 w-full rounded-full border border-border bg-card py-2.5 text-[13px] font-bold text-foreground hover:bg-muted"
          >
            Mostrar mais ({visible.length - shown.length} restantes)
          </button>
        )}
      </div>

      {/* Sheet de filtros */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="flex w-[94vw] flex-col bg-card p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border px-5 pb-4 pt-6 text-left">
            <SheetTitle className="text-base font-bold tracking-tight text-foreground">
              Filtros
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Refina a lista por preço, prazo, localização e selos.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Preço (MZN)</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input
                  value={priceMinDraft}
                  onChange={(e) => setPriceMinDraft(e.target.value)}
                  onBlur={applyPriceDrafts}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Mínimo"
                  aria-label="Preço mínimo"
                  className="rounded-xl border-border bg-muted tabular-nums focus:border-ring focus:bg-card"
                />
                <Input
                  value={priceMaxDraft}
                  onChange={(e) => setPriceMaxDraft(e.target.value)}
                  onBlur={applyPriceDrafts}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Máximo"
                  aria-label="Preço máximo"
                  className="rounded-xl border-border bg-muted tabular-nums focus:border-ring focus:bg-card"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Propostas “sob consulta” passam sempre.</p>
            </section>

            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Prazo de entrega</h3>
              <Select
                value={query.maxDays != null ? String(query.maxDays) : ""}
                onValueChange={(v) => patchQuery({ maxDays: v == null || v === "" ? null : Number.parseInt(v, 10) })}
              >
                <SelectTrigger className="mt-2 h-11 w-full rounded-xl border-border bg-muted text-sm focus:border-ring focus:bg-card">
                  <span>{DAYS_OPTIONS.find((o) => o.value === (query.maxDays != null ? String(query.maxDays) : ""))?.label}</span>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {DAYS_OPTIONS.map((o) => (
                    <SelectItem key={o.value || "any"} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Localização do proponente
              </h3>
              {facets.provinces.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Sem localização registada nas propostas.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {facets.provinces.map((prov) => (
                    <li key={prov}>
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-[13px] font-semibold text-foreground hover:bg-muted">
                        <Checkbox
                          checked={query.provinces.includes(prov)}
                          onCheckedChange={() => toggleProvince(prov)}
                          aria-label={`Filtrar por ${prov}`}
                        />
                        {prov}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Selos</h3>
              {facets.badges.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Nenhum selo entre os proponentes.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {facets.badges.map((b) => (
                    <li key={b.slug}>
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-[13px] font-semibold text-foreground hover:bg-muted">
                        <Checkbox
                          checked={query.badgeSlugs.includes(b.slug)}
                          onCheckedChange={() => toggleBadge(b.slug)}
                          aria-label={`Filtrar pelo selo ${b.name}`}
                        />
                        {b.name}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="flex gap-2 border-t border-border bg-muted/60 p-4">
            <button
              type="button"
              onClick={clearFilters}
              className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm font-bold text-foreground hover:bg-muted"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="h-11 flex-1 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/80"
            >
              Ver {visible.length} proposta{visible.length === 1 ? "" : "s"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
    </button>
  )
}
