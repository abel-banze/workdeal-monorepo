"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { regeneratePreRegisterToken } from "@/app/actions/admin";
import type { PreRegisterListItem } from "./page";

export function PreRegisterList({ items, isAdmin }: { items: PreRegisterListItem[]; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function regenerate(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await regeneratePreRegisterToken(id);
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao gerar novo link");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar novo link");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(org: PreRegisterListItem) {
    if (!org.completionUrl) return;
    try {
      await navigator.clipboard.writeText(org.completionUrl);
      setCopied(org.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há empresas pré-registadas.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium">Empresa</th>
              <th className="px-3 py-2 font-medium">Contacto</th>
              <th className="px-3 py-2 font-medium">Registada por</th>
              <th className="px-3 py-2 font-medium">Criada em</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">
                  {o.name}
                  <span className="block text-xs text-muted-foreground">{o.slug}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {o.contactName}
                  <span className="block">{o.contactPhone ?? "—"}</span>
                  <span className="block text-xs">{o.contactEmail ?? "—"}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{o.promoterEmail ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {o.preRegisteredAt ? new Date(o.preRegisteredAt).toLocaleDateString("pt-MZ") : new Date(o.createdAt).toLocaleDateString("pt-MZ")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy === o.id}
                        onClick={() => void regenerate(o.id)}
                      >
                        {busy === o.id ? "A gerar…" : "Novo link"}
                      </Button>
                    )}
                    {o.completionUrl && (
                      <Button variant="ghost" size="sm" onClick={() => void copyLink(o)}>
                        {copied === o.id ? "Copiado!" : "Copiar link"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
