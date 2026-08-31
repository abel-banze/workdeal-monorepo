"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateUserRole } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

interface RoleRow {
  id: string;
  name: string;
  email: string;
  systemRole: string;
}

const ROLE_OPTIONS = [
  { value: "user", label: "Utilizador" },
  { value: "moderator", label: "Moderador" },
  { value: "admin", label: "Admin" },
] as const;

export function RoleManager({ users, actorRole }: { users: RoleRow[]; actorRole: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(users.map((u) => [u.id, u.systemRole])),
  );

  async function onChange(userId: string, role: string) {
    setBusy(userId);
    setError(null);
    try {
      const res = await updateUserRole(userId, role as "user" | "moderator" | "admin");
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao actualizar papel");
        // reverter o draft local
        setDraft((d) => ({ ...d, [userId]: d[userId] }));
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao actualizar papel");
      setDraft((d) => ({ ...d, [userId]: d[userId] }));
    } finally {
      setBusy(null);
    }
  }

  if (actorRole !== "admin") {
    return (
      <p className="text-sm text-muted-foreground">
        Só administradores podem alterar papéis de sistema.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {users.map((u) => (
        <div key={u.id} className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={draft[u.id] ?? u.systemRole}
              disabled={busy === u.id}
              onChange={(e) => {
                const next = e.target.value;
                setDraft((d) => ({ ...d, [u.id]: next }));
                void onChange(u.id, next);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {busy === u.id && <span className="text-xs text-muted-foreground">a guardar…</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
