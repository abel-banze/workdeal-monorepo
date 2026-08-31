"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateOrgVerificationStatus } from "@/app/actions/admin";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  verificationStatus: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "in_review", label: "Em análise" },
  { value: "verified", label: "Verificada" },
  { value: "suspended", label: "Suspensa" },
] as const;

export function OrgStatusManager({ orgs, actorRole }: { orgs: OrgRow[]; actorRole: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(orgs.map((o) => [o.id, o.verificationStatus])),
  );

  async function onChange(orgId: string, status: string) {
    setBusy(orgId);
    setError(null);
    try {
      const res = await updateOrgVerificationStatus(orgId, status as "pending" | "in_review" | "verified" | "suspended");
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao actualizar estado");
        setDraft((d) => ({ ...d, [orgId]: d[orgId] }));
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao actualizar estado");
      setDraft((d) => ({ ...d, [orgId]: d[orgId] }));
    } finally {
      setBusy(null);
    }
  }

  if (actorRole !== "admin") {
    return <p className="text-sm text-muted-foreground">Só administradores podem alterar o estado de verificação.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {orgs.map((o) => (
        <div key={o.id} className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">{o.name}</p>
            <p className="text-xs text-muted-foreground">{o.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={draft[o.id] ?? o.verificationStatus}
              disabled={busy === o.id}
              onChange={(e) => {
                const next = e.target.value;
                setDraft((d) => ({ ...d, [o.id]: next }));
                void onChange(o.id, next);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {busy === o.id && <span className="text-xs text-muted-foreground">a guardar…</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
