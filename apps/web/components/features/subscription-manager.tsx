"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { uploadFilesAction } from "@/app/actions/files"
import {
  CheckCircle2,
  ChevronRight,
  CircleOff,
  CreditCard,
  Loader2,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@workspace/ui/components/dialog"
import { SUBSCRIPTION_STATUS_LABELS_PT, VERIFICATION_TRUST_PAYMENT } from "@workdeal/shared"
import { cancelMyPlan, changeMyPlan, pauseMyPlan, resumeMyPlan, subscribeMyPlan, type CurrentSubscription, type PublicPlan, type SubscribePayment } from "@/app/actions/subscriptions"

const STATUS_STYLES: Record<string, string> = {
  active: "bg-[#0B5E56] text-white",
  past_due: "bg-[#FF3B1F] text-white",
  trialing: "bg-[#0F1A2E] text-white",
  cancelled: "bg-[#6B7280] text-white",
  paused: "bg-[#B45309] text-white",
  expired: "bg-[#6B7280] text-white",
}

const INTERVAL_SUFFIX: Record<string, string> = {
  monthly: "/mês",
  quarterly: "/trimestre",
  yearly: "/ano",
}

function formatMzn(value: number | undefined | null): string {
  if (value == null) return "—"
  return `${value.toLocaleString("pt-MZ")} MZN`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" })
}

function FeaturePill({ label }: { label: string | null }) {
  return (
    <li className="flex items-start gap-2 text-xs leading-relaxed text-[#0F1A2E]/70">
      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#0B5E56]" />
      <span>{label ?? "Sem descrição"}</span>
    </li>
  )
}

export function SubscriptionManager({
  organizationId,
  orgName,
  initial,
  plans,
}: {
  organizationId: string
  orgName?: string
  initial: CurrentSubscription | null
  plans: PublicPlan[]
}) {
  const router = useRouter()
  const [busyAction, setBusyAction] = useState<string | null>(null)

  // Change plan dialog
  const [changeOpen, setChangeOpen] = useState(false)
  const [changePlan, setChangePlan] = useState<PublicPlan | null>(null)

  // Comprovativo de pagamento (só na activação de planos pagos — mesmos
  // dados e formato do pedido de verificação de identidade)
  const [proof, setProof] = useState<{ fileId: string; url: string; name: string } | null>(null)
  const [proofReference, setProofReference] = useState("")
  const [uploadingProof, setUploadingProof] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const proofInputRef = useRef<HTMLInputElement>(null)

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true)

  // Pause dialog
  const [pauseOpen, setPauseOpen] = useState(false)
  const [resumeAt, setResumeAt] = useState("")

  const sub = initial?.subscription ?? null
  const currentPlan = initial?.plan ?? null
  const status = sub?.status ?? null
  const canManage = sub != null
  // Pedido pago ainda por validar: fica em pausa até o admin confirmar.
  const awaitingPayment = ((sub?.metadata as Record<string, unknown> | null) ?? {}).awaitingPayment === true

  async function runAction(key: string, fn: () => Promise<unknown>, successMessage?: string) {
    setBusyAction(key)
    try {
      await fn()
      toast.success(successMessage ?? "Subscrição actualizada.")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao actualizar a subscrição.")
    } finally {
      setBusyAction(null)
    }
  }

  function openChangePlan(plan: PublicPlan) {
    setChangePlan(plan)
    setProof(null)
    setProofReference("")
    setDialogError(null)
    setChangeOpen(true)
  }

  async function handleProof(file: File) {
    setUploadingProof(true)
    setDialogError(null)
    try {
      const fd = new FormData()
      fd.set("file", file, file.name)
      fd.set("purpose", "subscription")
      const res = await uploadFilesAction(fd)
      if (!res.ok || !res.file) {
        setDialogError(res.error ?? "Falha ao carregar o comprovativo.")
        return
      }
      setProof({ fileId: res.file.id, url: res.file.url, name: res.file.originalFilename ?? file.name })
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Falha ao carregar o comprovativo.")
    } finally {
      setUploadingProof(false)
      if (proofInputRef.current) proofInputRef.current.value = ""
    }
  }

  // Sem subscrição — ou com subscrição cancelada/expirada — o botão da
  // grelha activa (cria ou reactiva) em vez de mudar de plano.
  const needsSubscribe = !canManage || status === "cancelled" || status === "expired"

  // A activação de um plano pago exige comprovativo (o backend rejeita
  // com PROOF_REQUIRED sem ele); planos gratuitos activam sem pagamento.
  const paidActivation = needsSubscribe && (changePlan?.priceMzn ?? 0) > 0

  async function confirmChangePlan() {
    if (!changePlan) return
    if (paidActivation && !proof) {
      setDialogError("Anexa o comprovativo de pagamento para activar este plano.")
      return
    }
    const planId = changePlan.id
    const activate = needsSubscribe
    const payment: SubscribePayment | undefined =
      activate && proof
        ? { method: "bank_transfer", fileId: proof.fileId, url: proof.url, name: proof.name, reference: proofReference.trim() || undefined }
        : undefined
    setChangeOpen(false)
    if (activate) {
      await runAction(
        "subscribe",
        () => subscribeMyPlan(organizationId, planId, payment),
        paidActivation
          ? "Pedido enviado — enviámos a factura por email. A subscrição activa após confirmação do pagamento."
          : "Subscrição activada.",
      )
    } else {
      await runAction("change", () => changeMyPlan(organizationId, planId))
    }
  }

  async function confirmCancel() {
    setCancelOpen(false)
    await runAction("cancel", () =>
      cancelMyPlan(organizationId, { atPeriodEnd: cancelAtPeriodEnd, reason: cancelReason.trim() || undefined }),
    )
    setCancelReason("")
    setCancelAtPeriodEnd(true)
  }

  async function confirmPause() {
    setPauseOpen(false)
    await runAction("pause", () => pauseMyPlan(organizationId, resumeAt || null))
    setResumeAt("")
  }

  const busy = busyAction != null

  return (
    <div className="space-y-5">
      {/* ── Cabeçalho ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-black leading-none tracking-[-0.04em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            Subscrição
          </h1>
          <p className="mt-1.5 text-[13px] text-[#0F1A2E]/60">
            Plano, facturação e gestão da subscrição {orgName ? `— ${orgName}` : "da organização"}.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-1.5 text-xs font-bold text-[#0F1A2E]/70">
          <CreditCard className="size-3.5 text-[#0B5E56]" /> Facturação
        </span>
      </div>

      {/* ── Plano actual ── */}
      <section className="space-y-4">
        <div className="relative overflow-hidden rounded-[22px] border border-[#D9D2C2] bg-white shadow-[0_8px_32px_rgba(15,26,46,0.07)]">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(to right, #0F1A2E 1px, transparent 1px), linear-gradient(to bottom, #0F1A2E 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                    {currentPlan?.name ?? sub?.planName ?? "Plano"}
                  </h2>
                  {status && (
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[status] ?? STATUS_STYLES.active}`}>
                      {SUBSCRIPTION_STATUS_LABELS_PT[status as keyof typeof SUBSCRIPTION_STATUS_LABELS_PT] ?? status}
                    </span>
                  )}
                  {sub?.planSlug === "free" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#0B5E56]/25 bg-[#0B5E56]/5 px-2.5 py-1 text-[11px] font-bold text-[#0B5E56]">
                      <ShieldCheck className="size-3.5" /> Plano gratuito
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[26px] font-black leading-none tracking-[-0.04em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                  {currentPlan ? `${formatMzn(currentPlan.priceMzn)}${INTERVAL_SUFFIX[currentPlan.interval] ?? ""}` : formatMzn(sub?.planPriceMzn)}
                  <span className="ml-2 align-middle text-xs font-bold tracking-wide text-[#0F1A2E]/45">MZN</span>
                </p>
                <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-[#0F1A2E]/60">{currentPlan?.description}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#0F1A2E]/55">
                  {sub?.trialEndsAt && (
                    <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1">Trial até {formatDate(sub.trialEndsAt)}</span>
                  )}
                  {sub?.currentPeriodEnd && ["active", "past_due", "trialing"].includes(status!) && (
                    <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1">Período até {formatDate(sub.currentPeriodEnd)}</span>
                  )}
                  {status === "paused" && sub?.resumeAt && (
                    <span className="rounded-full border border-[#B45309]/30 bg-[#B45309]/5 px-2.5 py-1 text-[#B45309]">Retoma a {formatDate(sub.resumeAt)}</span>
                  )}
                  {status === "cancelled" && sub?.cancelReason && (
                    <span className="rounded-full border border-[#6B7280]/30 bg-[#6B7280]/5 px-2.5 py-1 text-[#6B7280]">Motivo: {sub.cancelReason}</span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {canManage && ["active", "past_due", "trialing"].includes(status!) && (
                  <>
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => { setPauseOpen(true) }}>
                      {busyAction === "pause" ? <Loader2 className="size-4 animate-spin" /> : <PauseCircle className="size-4" />}
                      Pausar
                    </Button>
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => { setCancelOpen(true) }}>
                      {busyAction === "cancel" ? <Loader2 className="size-4 animate-spin" /> : <CircleOff className="size-4" />}
                      Cancelar
                    </Button>
                  </>
                )}
                {canManage && status === "paused" && !awaitingPayment && (
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => runAction("resume", () => resumeMyPlan(organizationId))}>
                    {busyAction === "resume" ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                    Retomar
                  </Button>
                )}
                {awaitingPayment && (
                  <span className="rounded-full border border-[#B45309]/30 bg-[#B45309]/5 px-3 py-1.5 text-xs font-semibold text-[#B45309]">
                    Aguarda confirmação do pagamento
                  </span>
                )}
                {!canManage && (
                  <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-1.5 text-xs font-semibold text-[#0F1A2E]/55">
                    Sem subscrição activa
                  </span>
                )}
              </div>
            </div>

            {(status === "cancelled" || status === "expired") && (
              <div className="mt-5 rounded-[16px] border border-[#FF3B1F]/25 bg-[#FF3B1F]/5 px-4 py-3 text-[13px] leading-relaxed text-[#0F1A2E]/75">
                Esta subscrição está {SUBSCRIPTION_STATUS_LABELS_PT[status as keyof typeof SUBSCRIPTION_STATUS_LABELS_PT].toLowerCase()}. Podes reativar um plano diferente na grelha abaixo.
              </div>
            )}
          </div>
        </div>

        {/* Pagamento em validação (comprovativo anexado no pedido) */}
        {initial?.pendingPayment && (
          <div className="rounded-[20px] border border-[#B45309]/30 bg-[#B45309]/[0.04] p-5 sm:p-6">
            <h3 className="text-sm font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              Pagamento em validação
            </h3>
            <div className="mt-3 space-y-1.5 text-[13px] text-[#0F1A2E]/75">
              <p>
                <span className="font-bold text-[#0F1A2E]">{formatMzn(initial.pendingPayment.amountMzn)}</span>
                {initial.pendingPayment.invoiceNumber && (
                  <span className="text-[#0F1A2E]/55"> · Factura {initial.pendingPayment.invoiceNumber}</span>
                )}
              </p>
              {initial.pendingPayment.proof?.url ? (
                <p>
                  Comprovativo:{" "}
                  <a href={initial.pendingPayment.proof.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#0B5E56] underline underline-offset-2">
                    {initial.pendingPayment.proof.name || "ver ficheiro"}
                  </a>
                  {initial.pendingPayment.proof.reference && (
                    <span className="text-[#0F1A2E]/55"> · ref: {initial.pendingPayment.proof.reference}</span>
                  )}
                </p>
              ) : (
                <p className="text-[#0F1A2E]/55">Comprovativo registado — a equipa Workdeal está a validar.</p>
              )}
              <p className="text-xs text-[#0F1A2E]/50">A subscrição activa automaticamente quando o pagamento for confirmado.</p>
            </div>
          </div>
        )}

        {/* Features do plano actual */}
        {initial && initial.features.length > 0 && (
          <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5 sm:p-6">
            <h3 className="text-sm font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              O que está incluído
            </h3>
            <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {initial.features.map((f) => (
                <FeaturePill key={f.featureKey} label={f.label} />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Grelha de planos ── */}
      {plans.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              Planos disponíveis
            </h2>
            <span className="text-xs text-[#0F1A2E]/45">Mudanças de plano aplicam-se na hora.</span>
          </div>

          <div className={`grid gap-4 ${plans.length > 2 ? "lg:grid-cols-3" : "sm:grid-cols-2"}`}>
            {plans.map((plan) => {
              const isCurrent = currentPlan?.id === plan.id
              const disabled = isCurrent || busy
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-[20px] border bg-white p-5 transition ${isCurrent ? "border-[#0B5E56]/40 ring-1 ring-[#0B5E56]/20" : "border-[#D9D2C2] hover:border-[#0B5E56]/30"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                      {plan.name}
                    </h3>
                    {isCurrent && (
                      <span className="rounded-full bg-[#0B5E56] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                        Actual
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[22px] font-black leading-none tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                    {formatMzn(plan.priceMzn)}
                    <span className="ml-1 text-xs font-bold tracking-wide text-[#0F1A2E]/45">{INTERVAL_SUFFIX[plan.interval] ?? ""}</span>
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#0F1A2E]/60">{plan.description}</p>

                  <ul className="mt-4 flex-1 space-y-2">
                    {plan.features.slice(0, 6).map((f) => (
                      <FeaturePill key={f.featureKey} label={f.label} />
                    ))}
                    {plan.features.length > 6 && (
                      <li className="pl-5 text-[11px] text-[#0F1A2E]/45">+{plan.features.length - 6} funcionalidades</li>
                    )}
                  </ul>

                  <Button
                    className="mt-5 w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={disabled}
                    onClick={() => openChangePlan(plan)}
                  >
                    {isCurrent ? "Plano actual" : busy ? "A processar…" : needsSubscribe ? `Activar ${plan.name}` : `Mudar para ${plan.name}`}
                  </Button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Dialog: confirmar mudança de plano ── */}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="max-w-[440px] rounded-[22px] border-[#D9D2C2] bg-white p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[17px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              {needsSubscribe ? `Activar ${changePlan?.name}` : `Mudar para ${changePlan?.name}`}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/55">
              {changePlan
                ? needsSubscribe
                  ? paidActivation
                    ? `O pedido do plano ${changePlan.name} (${formatMzn(changePlan.priceMzn)}${INTERVAL_SUFFIX[changePlan.interval] ?? ""}) fica em pausa até confirmarmos o pagamento. Enviamos a factura por email (Codebaz SU, Lda).`
                    : `A organização fica com o plano ${changePlan.name} (${formatMzn(changePlan.priceMzn)}${INTERVAL_SUFFIX[changePlan.interval] ?? ""}). A activação é imediata e os limites do novo plano aplicam-se de seguida.`
                  : `A subscrição passa para ${changePlan.name} (${formatMzn(changePlan.priceMzn)}${INTERVAL_SUFFIX[changePlan.interval] ?? ""}). A mudança é imediata e os limites do novo plano aplicam-se de seguida.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {paidActivation && (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-[#0B5E56]/25 bg-[#0B5E56]/[0.04] p-4">
                <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">PAGAMENTO — {VERIFICATION_TRUST_PAYMENT.planName.toUpperCase()}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/70">
                  Faz a transferência para a conta abaixo e anexa o comprovativo. A equipa Workdeal confirma em 24–48h úteis.
                </p>
                <div className="mt-3 space-y-1 rounded-xl border border-[#D9D2C2] bg-white px-4 py-3 font-mono text-xs leading-relaxed text-[#0F1A2E]">
                  <p>Banco: <span className="font-bold">{VERIFICATION_TRUST_PAYMENT.bankName}</span></p>
                  <p>NIB: <span className="font-bold tracking-wide">{VERIFICATION_TRUST_PAYMENT.nib}</span></p>
                  <p>Conta: <span className="font-bold">{VERIFICATION_TRUST_PAYMENT.accountNumber}</span></p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Referência do pagamento (opcional)</label>
                <input
                  value={proofReference}
                  onChange={(e) => setProofReference(e.target.value)}
                  placeholder="Ex.: nome do titular, referência bancária"
                  className="h-9 w-full rounded-md border border-[#D9D2C2] bg-white px-3 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">
                  Comprovativo de pagamento <span className="text-[#FF3B1F]">*</span>
                </label>
                <p className="text-xs text-[#0F1A2E]/50">PDF ou imagem, máx 10 MB.</p>
                {proof ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#0B5E56]/30 bg-[#0B5E56]/[0.04] p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-sm text-white">✓</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-[#0F1A2E]">{proof.name || "Comprovativo anexado"}</p>
                        <p className="truncate text-xs text-[#0F1A2E]/55">
                          <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-[#0B5E56] underline underline-offset-2">ver</a>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setProof(null); setProofReference("") }}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0F1A2E]/55 ring-1 ring-[#D9D2C2] transition hover:bg-[#FF3B1F]/10 hover:text-[#7A1A0A]"
                      aria-label="Remover comprovativo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <input ref={proofInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" disabled={uploadingProof} onChange={(e) => e.target.files?.[0] && void handleProof(e.target.files[0])} />
                    <Button type="button" variant="outline" size="sm" onClick={() => proofInputRef.current?.click()} disabled={uploadingProof}>
                      {uploadingProof ? <Loader2 className="size-4 animate-spin" /> : null}
                      {uploadingProof ? "A carregar…" : "Anexar comprovativo"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {dialogError && (
            <p className="mt-3 rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs font-medium text-[#7A1A0A]">{dialogError}</p>
          )}

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setChangeOpen(false)}>
              Voltar
            </Button>
            <Button onClick={confirmChangePlan} disabled={uploadingProof || (paidActivation && !proof)}>
              {busyAction === "subscribe" || busyAction === "change" ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
              {needsSubscribe ? "Confirmar activação" : "Confirmar mudança"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: cancelar subscrição ── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-[460px] rounded-[22px] border-[#D9D2C2] bg-white p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-[17px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <XCircle className="size-5 text-[#FF3B1F]" /> Cancelar subscrição
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/55">
              Podes manter o acesso até ao fim do período corrente ou cancelar de imediato. Perde-se o acesso às funcionalidades do plano.
            </DialogDescription>
          </DialogHeader>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[14px] border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3">
            <input type="checkbox" checked={cancelAtPeriodEnd} onChange={(e) => setCancelAtPeriodEnd(e.target.checked)} className="mt-0.5 size-4 accent-[#0B5E56]" />
            <span className="text-xs leading-relaxed text-[#0F1A2E]/75">
              Cancelar no fim do período ({sub ? formatDate(sub.currentPeriodEnd) : "—"}) — sem interrupção imediata.
            </span>
          </label>

          <label className="mt-3 block text-xs font-bold text-[#0F1A2E]/70">
            Motivo <span className="font-normal text-[#0F1A2E]/40">(opcional)</span>
          </label>
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            maxLength={1000}
            placeholder="Ex: custo, falta de uso, mudança de estratégia…"
            className="mt-1 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm outline-none focus:border-[#0B5E56]"
          />

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={busyAction === "cancel"}>
              {busyAction === "cancel" ? <Loader2 className="size-4 animate-spin" /> : null}
              {cancelAtPeriodEnd ? "Cancelar no fim do período" : "Cancelar agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: pausar ── */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent className="max-w-[440px] rounded-[22px] border-[#D9D2C2] bg-white p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-[17px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <PauseCircle className="size-5 text-[#B45309]" /> Pausar subscrição
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/55">
              A subscrição fica suspensa e o período corrente não avança. Retomas quando quiseres.
            </DialogDescription>
          </DialogHeader>

          <label className="mt-4 block text-xs font-bold text-[#0F1A2E]/70">
            Retomar automaticamente em <span className="font-normal text-[#0F1A2E]/40">(opcional)</span>
          </label>
          <input
            type="date"
            value={resumeAt}
            onChange={(e) => setResumeAt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm outline-none focus:border-[#0B5E56]"
          />

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setPauseOpen(false)}>
              Voltar
            </Button>
            <Button onClick={confirmPause} disabled={busyAction === "pause"}>
              {busyAction === "pause" ? <Loader2 className="size-4 animate-spin" /> : <PauseCircle className="size-4" />}
              Pausar subscrição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}