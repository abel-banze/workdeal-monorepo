import { notFound } from "next/navigation";
import { getAdminSubscription, listAdminPlans } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import {
  PLAN_INTERVAL_LABELS_PT,
  PAYMENT_METHOD_LABELS_PT,
  PAYMENT_STATUS_LABELS_PT,
  SUBSCRIPTION_STATUS_LABELS_PT,
  type PlanInterval,
  type SubscriptionStatus,
} from "@workdeal/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMzn } from "@/lib/format";
import { SubscriptionActions } from "./subscription-actions";
import { PaymentConfirmButton } from "./payment-confirm-button";
import { PaymentValidateButton } from "./payment-validate-button";

export const metadata = {
  title: "Subscrição | Workdeal Admin",
};

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  active: "bg-emerald-600 text-white",
  trialing: "bg-blue-600 text-white",
  past_due: "bg-amber-500 text-white",
  paused: "bg-yellow-500 text-white",
  cancelled: "bg-red-600 text-white",
  expired: "bg-muted text-muted-foreground",
};

interface LineItem {
  description: string | null;
  quantity: number;
  unitPriceMzn: number | null;
  totalMzn: number | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotalMzn: number;
  discountMzn: number;
  taxMzn: number;
  totalMzn: number;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  lineItems: LineItem[];
}

interface PaymentProof {
  fileId?: string;
  url?: string;
  name?: string;
  reference?: string;
}

interface Payment {
  id: string;
  invoiceId: string | null;
  amountMzn: number;
  status: string;
  method: string | null;
  provider: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  refundAmountMzn: number | null;
  failureReason: string | null;
  metadata?: { kind?: string; proof?: PaymentProof } | null;
  createdAt: string;
  invoiceNumber: string | null;
}

interface AdminNote {
  status: string;
  note: string | null;
  at: string;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status as SubscriptionStatus] ?? "bg-muted text-muted-foreground"}`}>
      {SUBSCRIPTION_STATUS_LABELS_PT[status as SubscriptionStatus] ?? status}
    </span>
  );
}

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSystemRole("moderator", "admin");
  const { id } = await params;

  const [res, plansRes] = await Promise.all([getAdminSubscription(id), listAdminPlans({ includeInactive: true, limit: 100 })]);
  if (!res.success || !res.data) notFound();

  const d = res.data as Record<string, unknown>;
  const isAdmin = session.user.systemRole === "admin";
  const subscriber = d.organizationName ? `${d.organizationName} (empresa)` : `${d.userName || d.userEmail} (pessoal)`;

  const invoices = (Array.isArray(d.invoices) ? d.invoices : []) as unknown as Invoice[];
  const payments = (Array.isArray(d.payments) ? d.payments : []) as unknown as Payment[];
  const metadata = (d.metadata as Record<string, unknown> | null) ?? {};
  const adminNotes = (Array.isArray(metadata.adminNotes) ? metadata.adminNotes : []).filter(
    (n): n is AdminNote => !!n && typeof n === "object",
  );

  const plans = (Array.isArray(plansRes.data) ? plansRes.data : []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Subscrição</h1>
          <p className="text-sm text-muted-foreground">
            {subscriber} · {d.planName as string}
          </p>
          {(d.contactEmail as string | null) && (
            <p className="text-sm text-muted-foreground">Contacto: {d.contactEmail as string}</p>
          )}
        </div>
        <StatusBadge status={d.status as string} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Detalhes do plano</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <Row label="Plano" value={d.planName as string} />
            <Row label="Slug" value={d.planSlug as string} />
            <Row
              label="Preço"
              value={`${(d.planPriceMzn as number) === 0 ? "Grátis" : formatMzn(d.planPriceMzn as number)} / ${PLAN_INTERVAL_LABELS_PT[(d.planInterval as PlanInterval) ?? "monthly"]}`}
            />
            {Boolean(d.couponCode) && <Row label="Cupão" value={d.couponCode as string} />}
            {(d.discountMzn as number) > 0 && <Row label="Desconto" value={formatMzn(d.discountMzn as number)} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ciclo e prazos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <Row label="Período actual" value={`${formatDate(d.currentPeriodStart as string)} — ${formatDate(d.currentPeriodEnd as string)}`} />
            <Row label="Trial" value={d.trialEndsAt ? `termina a ${formatDate(d.trialEndsAt as string)}` : "—"} />
            <Row label="Cancelar a" value={d.cancelAt ? formatDateTime(d.cancelAt as string) : "—"} />
            {Boolean(d.cancelReason) && <Row label="Motivo de cancelamento" value={d.cancelReason as string} />}
            <Row label="Pausada a" value={d.pausedAt ? formatDateTime(d.pausedAt as string) : "—"} />
            <Row label="Retomar a" value={d.resumeAt ? formatDateTime(d.resumeAt as string) : "—"} />
            <Row label="Criada a" value={formatDateTime(d.createdAt as string)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Facturas ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">Sem facturas.</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{inv.invoiceNumber}</span>
                <span className="text-muted-foreground">{PAYMENT_STATUS_LABELS_PT[inv.status as keyof typeof PAYMENT_STATUS_LABELS_PT] ?? inv.status}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatDate(inv.periodStart)} — {formatDate(inv.periodEnd)} · {formatMzn(inv.totalMzn)}
              </div>
              {Array.isArray(inv.lineItems) && inv.lineItems.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {inv.lineItems.map((li, i) => (
                    <li key={i} className="flex justify-between gap-2 text-xs">
                      <span>{li.description ?? "Linha"}</span>
                      <span>{formatMzn(li.totalMzn ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pagamentos ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payments.length === 0 && <p className="text-sm text-muted-foreground">Sem pagamentos.</p>}
          {payments.map((p) => {
            const rawProof = p.metadata?.proof;
            const proof = rawProof && typeof rawProof === "object" ? rawProof : null;
            const proofUrl = typeof proof?.url === "string" ? proof.url : null;
            const proofName = typeof proof?.name === "string" ? proof.name : null;
            const proofReference = typeof proof?.reference === "string" ? proof.reference : null;
            const isActivation = p.metadata?.kind === "subscription_activation";
            return (
              <div key={p.id} className="rounded-md border p-3 text-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{formatMzn(p.amountMzn)}</span>
                    <span className="ml-2 text-muted-foreground">
                      {p.method ? (PAYMENT_METHOD_LABELS_PT[p.method as keyof typeof PAYMENT_METHOD_LABELS_PT] ?? p.method) : "—"}
                      {p.invoiceNumber ? ` · ${p.invoiceNumber}` : ""}
                      {isActivation ? " · activação" : ""}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {PAYMENT_STATUS_LABELS_PT[p.status as keyof typeof PAYMENT_STATUS_LABELS_PT] ?? p.status} · {formatDateTime(p.createdAt)}
                  </div>
                </div>
                {proofUrl ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Comprovativo:</span>
                    <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
                      {proofName || "ver ficheiro"}
                    </a>
                    {proofReference && <span className="text-muted-foreground">· ref: {proofReference}</span>}
                  </div>
                ) : (
                  isActivation && (
                    <p className="text-xs font-medium text-amber-600">Sem comprovativo anexado a este pagamento.</p>
                  )
                )}
                {isAdmin && p.status === "pending" && (
                  isActivation
                    ? <PaymentValidateButton paymentId={p.id} />
                    : <PaymentConfirmButton paymentId={p.id} />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notas internas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {adminNotes.length === 0 && <p className="text-sm text-muted-foreground">Sem notas registadas.</p>}
          {adminNotes.map((n, i) => (
            <div key={i} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{SUBSCRIPTION_STATUS_LABELS_PT[n.status as SubscriptionStatus] ?? n.status}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(n.at)}</span>
              </div>
              {n.note && <p className="mt-1 text-xs text-muted-foreground">{n.note}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Acções administrativas</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionActions
            subscription={{ id: d.id as string, status: d.status as string }}
            plans={plans}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}