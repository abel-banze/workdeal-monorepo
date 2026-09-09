"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_STATUS_LABELS_PT, SUBSCRIPTION_STATUSES, type SubscriptionStatus } from "@workdeal/shared";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  notifySubscriptionCompany,
  pauseSubscription,
  resumeSubscription,
  setSubscriptionStatus,
} from "@/app/actions/admin";

export interface SubscriptionActionsSubscription {
  id: string;
  status: string;
}

export function SubscriptionActions({
  subscription,
  plans,
  isAdmin,
}: {
  subscription: SubscriptionActionsSubscription;
  plans: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(subscription.status);
  const [note, setNote] = useState("");
  const [targetPlanId, setTargetPlanId] = useState("");
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [cancelReason, setCancelReason] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifySent, setNotifySent] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
  const labelClass = "text-xs font-medium text-muted-foreground";

  async function run(label: string, fn: () => Promise<{ success: boolean; error?: { message?: string } }>): Promise<boolean> {
    setError(null);
    setLoading(label);
    try {
      const res = await fn();
      if (!res.success) throw new Error(res.error?.message ?? "Falha na operação");
      setNote("");
      setCancelReason("");
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na operação");
      return false;
    } finally {
      setLoading(null);
    }
  }

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Só administradores podem gerir subscrições.</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-md border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Alterar estado</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelClass}>Novo estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {SUBSCRIPTION_STATUSES.map((st) => (
                <option key={st} value={st}>{SUBSCRIPTION_STATUS_LABELS_PT[st]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Nota interna (opcional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Motivo da alteração"
              className={inputClass}
            />
          </div>
        </div>
        <Button
          size="sm"
          disabled={loading !== null}
          onClick={() => run("status", () => setSubscriptionStatus(subscription.id, { status: status as SubscriptionStatus, note: note || undefined }))}
        >
          {loading === "status" ? "A guardar…" : "Aplicar estado"}
        </Button>
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Mudar de plano</h3>
        <div className="space-y-1">
          <label className={labelClass}>Novo plano</label>
          <select value={targetPlanId} onChange={(e) => setTargetPlanId(e.target.value)} className={inputClass}>
            <option value="">Selecciona um plano</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          disabled={loading !== null || !targetPlanId}
          onClick={() => run("plan", () => changeSubscriptionPlan(subscription.id, { planId: targetPlanId, prorate: true }))}
        >
          {loading === "plan" ? "A mudar…" : "Mudar plano"}
        </Button>
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Notificar empresa por email</h3>
        <p className="text-xs text-muted-foreground">
          Ex: pagamento por confirmar. A mensagem é enviada por email e fica registada nas notas internas.
        </p>
        <div className="space-y-1">
          <label className={labelClass}>Mensagem</label>
          <textarea
            value={notifyMessage}
            onChange={(e) => setNotifyMessage(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Ex.: Olá, ainda não confirmámos o pagamento da factura FT-… Por favor verifica…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        {notifySent && <p className="text-xs text-emerald-600">{notifySent}</p>}
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null || !notifyMessage.trim()}
          onClick={async () => {
            setNotifySent(null);
            const ok = await run("notify", () => notifySubscriptionCompany(subscription.id, notifyMessage.trim()));
            if (ok) {
              setNotifyMessage("");
              setNotifySent("Email enviado e registado nas notas.");
            }
          }}
        >
          {loading === "notify" ? "A enviar…" : "Enviar notificação"}
        </Button>
      </div>

      <div className="rounded-md border border-destructive/20 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Cancelamento</h3>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="cancelAtPeriodEnd"
            checked={cancelAtPeriodEnd}
            onChange={(e) => setCancelAtPeriodEnd(e.target.checked)}
            className="size-4 rounded border-input"
          />
          <label htmlFor="cancelAtPeriodEnd" className="text-sm font-medium">Cancelar no fim do período actual</label>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Motivo (opcional)</label>
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Motivo do cancelamento"
            className={inputClass}
          />
        </div>
        <Button
          size="sm"
          variant="destructive"
          disabled={loading !== null}
          onClick={() => run("cancel", () => cancelSubscription(subscription.id, { atPeriodEnd: cancelAtPeriodEnd, reason: cancelReason || undefined }))}
        >
          {loading === "cancel" ? "A cancelar…" : "Cancelar subscrição"}
        </Button>
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Pausa / retoma</h3>
        {subscription.status === "paused" ? (
          <Button size="sm" disabled={loading !== null} onClick={() => run("resume", () => resumeSubscription(subscription.id))}>
            {loading === "resume" ? "A retomar…" : "Retomar subscrição"}
          </Button>
        ) : (
          <>
            <div className="space-y-1">
              <label className={labelClass}>Retomar automaticamente em (opcional)</label>
              <input type="datetime-local" value={resumeAt} onChange={(e) => setResumeAt(e.target.value)} className={inputClass} />
            </div>
            <Button
              size="sm"
              disabled={loading !== null}
              onClick={() => run("pause", () => pauseSubscription(subscription.id, { resumeAt: resumeAt ? new Date(resumeAt) : undefined }))}
            >
              {loading === "pause" ? "A pausar…" : "Pausar subscrição"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}