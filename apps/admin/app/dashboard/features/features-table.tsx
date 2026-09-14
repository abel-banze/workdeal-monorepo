"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteFeatureFlag, toggleFlagDefault, toggleFlagEmergency } from "@/app/actions/admin";

export interface FlagListItem {
  key: string;
  name: string;
  group: string | null;
  defaultEnabled: boolean;
  emergencyDisabled: boolean;
  overridesCount: number;
}

export function FeaturesTable({ items, isAdmin }: { items: FlagListItem[]; isAdmin: boolean }) {
  const router = useRouter();

  async function onToggleDefault(flag: FlagListItem) {
    const res = await toggleFlagDefault(flag.key);
    if (!res.success) {
      alert(res.error?.message ?? "Falha ao alterar o estado por defeito");
      return;
    }
    router.refresh();
  }

  async function onToggleEmergency(flag: FlagListItem) {
    const res = await toggleFlagEmergency(flag.key);
    if (!res.success) {
      alert(res.error?.message ?? "Falha ao alterar o kill-switch");
      return;
    }
    router.refresh();
  }

  async function onDelete(flag: FlagListItem) {
    if (!confirm(`Remover o flag "${flag.key}"? As sobreposições são apagadas.`)) return;
    const res = await deleteFeatureFlag(flag.key);
    if (!res.success) {
      alert(res.error?.message ?? "Falha ao remover flag");
      return;
    }
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem flags para mostrar.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Feature</th>
            <th className="py-2 pr-4 font-medium">Grupo</th>
            <th className="py-2 pr-4 font-medium">Ligado por defeito</th>
            <th className="py-2 pr-4 font-medium">Kill-switch</th>
            <th className="py-2 pr-4 font-medium">Sobreposições</th>
            <th className="py-2 text-right font-medium">Acções</th>
          </tr>
        </thead>
        <tbody>
          {items.map((flag) => (
            <tr key={flag.key} className="border-b">
              <td className="py-2 pr-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{flag.name}</span>
                  <code className="text-xs text-muted-foreground">{flag.key}</code>
                </div>
              </td>
              <td className="py-2 pr-4">
                {flag.group ? (
                  <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">{flag.group}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-2 pr-4">
                <button
                  type="button"
                  disabled={!isAdmin}
                  aria-pressed={flag.defaultEnabled}
                  onClick={() => onToggleDefault(flag)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    flag.defaultEnabled ? "bg-emerald-600" : "bg-muted"
                  } ${isAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      flag.defaultEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </td>
              <td className="py-2 pr-4">
                <button
                  type="button"
                  disabled={!isAdmin}
                  aria-pressed={flag.emergencyDisabled}
                  onClick={() => onToggleEmergency(flag)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    flag.emergencyDisabled ? "bg-destructive" : "bg-muted"
                  } ${isAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                  title="Desliga a feature para todos os âmbitos, ignorando sobreposições"
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      flag.emergencyDisabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </td>
              <td className="py-2 pr-4">
                <Link href={`/dashboard/features/${flag.key}`} className="text-sm underline underline-offset-2">
                  {flag.overridesCount}
                </Link>
              </td>
              <td className="space-x-2 py-2 text-right whitespace-nowrap">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/features/${flag.key}`}>Gerir</Link>
                </Button>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => onDelete(flag)}>
                    Remover
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}