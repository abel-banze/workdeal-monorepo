"use client";

import Link from "next/link";
import { PLAN_INTERVAL_LABELS_PT, type PlanInterval, type SubscriptionStatus } from "@workdeal/shared";
import { formatDate, formatMzn } from "@/lib/format";
import type { SubscriptionListItem } from "./page";

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  active: "bg-emerald-600 text-white",
  trialing: "bg-blue-600 text-white",
  past_due: "bg-amber-500 text-white",
  paused: "bg-yellow-500 text-white",
  cancelled: "bg-red-600 text-white",
  expired: "bg-muted text-muted-foreground",
};

export function SubscriptionsTable({ items }: { items: SubscriptionListItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem subscrições para mostrar.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Subscrito</th>
            <th className="py-2 pr-4 font-medium">Plano</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 pr-4 font-medium">Período actual</th>
            <th className="py-2 pr-4 font-medium">Cancelamento</th>
            <th className="py-2 text-right font-medium">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="py-2 pr-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{s.organizationName ?? s.userName ?? s.userEmail}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.organizationName ? `${s.userName || s.userEmail} · empresa` : "pessoal"}
                  </span>
                </div>
              </td>
              <td className="py-2 pr-4">
                <div className="flex flex-col gap-0.5">
                  <span>{s.planName}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.planPriceMzn === 0 ? "Grátis" : formatMzn(s.planPriceMzn)} /{" "}
                    {PLAN_INTERVAL_LABELS_PT[s.planInterval as PlanInterval]}
                  </span>
                </div>
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[s.status as SubscriptionStatus] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.status}
                </span>
              </td>
              <td className="py-2 pr-4 text-muted-foreground">{formatDate(s.currentPeriodEnd)}</td>
              <td className="py-2 pr-4 text-muted-foreground">{s.cancelAt ? formatDate(s.cancelAt) : "—"}</td>
              <td className="py-2 text-right">
                <Link href={`/dashboard/subscriptions/${s.id}`} className="text-sm font-medium underline underline-offset-2">
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}