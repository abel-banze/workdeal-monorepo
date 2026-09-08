"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLAN_INTERVAL_LABELS_PT } from "@workdeal/shared";
import { Button } from "@/components/ui/button";
import { formatMzn } from "@/lib/format";
import { deletePlan, togglePlanActive } from "@/app/actions/admin";

export interface PlansTableItem {
  id: string;
  slug: string;
  name: string;
  inheritFromPlanId: string | null;
  priceMzn: number;
  interval: keyof typeof PLAN_INTERVAL_LABELS_PT;
  trialDays: number;
  isPublic: boolean;
  isActive: boolean;
}

export function PlansTable({ items, isAdmin }: { items: PlansTableItem[]; isAdmin: boolean }) {
  const router = useRouter();

  async function onToggle(plan: PlansTableItem) {
    const res = await togglePlanActive(plan.id);
    if (!res.success) {
      alert(res.error?.message ?? "Falha ao alterar estado do plano");
      return;
    }
    router.refresh();
  }

  async function onDelete(plan: PlansTableItem) {
    if (!confirm(`Eliminar o plano "${plan.name}"?`)) return;
    const res = await deletePlan(plan.id);
    if (!res.success) {
      alert(res.error?.message ?? "Falha ao eliminar plano");
      return;
    }
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem planos para mostrar.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Plano</th>
            <th className="py-2 pr-4 font-medium">Preço</th>
            <th className="py-2 pr-4 font-medium">Período</th>
            <th className="py-2 pr-4 font-medium">Teste</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 text-right font-medium">Acções</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2 pr-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.slug}</span>
                </div>
              </td>
              <td className="py-2 pr-4">{p.priceMzn === 0 ? "Grátis" : formatMzn(p.priceMzn)}</td>
              <td className="py-2 pr-4">{PLAN_INTERVAL_LABELS_PT[p.interval]}</td>
              <td className="py-2 pr-4">{p.trialDays > 0 ? `${p.trialDays} dias` : "—"}</td>
              <td className="py-2 pr-4">
                {p.isActive ? (
                  <span className="inline-flex rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
                    Activo
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Inactivo
                  </span>
                )}
              </td>
              <td className="space-x-2 py-2 text-right whitespace-nowrap">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/plans/${p.id}/edit`}>Editar</Link>
                </Button>
                {isAdmin && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => onToggle(p)}>
                      {p.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => onDelete(p)}>
                      Eliminar
                    </Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}