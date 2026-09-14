"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeFlagOverride, setFlagOverride } from "@/app/actions/admin";

export interface FlagOverrideItem {
  organizationId: string;
  organizationName: string | null;
  enabled: boolean;
  note: string | null;
  expiresAt: string | null;
}

export function OverridesManager({ flagKey, overrides, isAdmin }: { flagKey: string; overrides: FlagOverrideItem[]; isAdmin: boolean }) {
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId.trim()) return;
    setSaving(true);
    try {
      const res = await setFlagOverride(flagKey, orgId.trim(), {
        enabled,
        note: note || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });
      if (!res.success) {
        alert(res.error?.message ?? "Falha ao guardar sobreposição");
        return;
      }
      setOrgId("");
      setNote("");
      setExpiresAt("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(item: FlagOverrideItem) {
    if (!confirm(`Remover a sobreposição de "${item.organizationName || item.organizationId}"?`)) return;
    const res = await removeFlagOverride(flagKey, item.organizationId);
    if (!res.success) {
      alert(res.error?.message ?? "Falha ao remover sobreposição");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <form onSubmit={onSave} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="grid gap-1 text-xs font-medium sm:col-span-2">
            Organização (id)
            <input
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="id da organização"
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Estado
            <select value={enabled ? "true" : "false"} onChange={(e) => setEnabled(e.target.value === "true")} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
              <option value="true">Ligado</option>
              <option value="false">Desligado</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Expira a
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-medium sm:col-span-2 lg:col-span-5">
            Nota
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="motivo da sobreposição (opcional)" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
          </label>
          <div className="sm:col-span-2 lg:col-span-5">
            <Button type="submit" size="sm" disabled={saving || !orgId.trim()}>{saving ? "A guardar…" : "Guardar sobreposição"}</Button>
          </div>
        </form>
      )}

      {overrides.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem sobreposições — o estado global aplica-se a todas as organizações.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Organização</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Expira</th>
                <th className="py-2 pr-4 font-medium">Nota</th>
                {isAdmin && <th className="py-2 text-right font-medium">Acções</th>}
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.organizationId} className="border-b">
                  <td className="py-2 pr-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{o.organizationName ?? "?"}</span>
                      <code className="text-xs text-muted-foreground">{o.organizationId}</code>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    {o.enabled ? (
                      <span className="inline-flex rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">Ligado</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-white">Desligado</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{o.expiresAt ? new Date(o.expiresAt).toLocaleDateString("pt-MZ") : "—"}</td>
                  <td className="py-2 pr-4">{o.note ?? "—"}</td>
                  {isAdmin && (
                    <td className="py-2 text-right">
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => onRemove(o)}>Remover</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}