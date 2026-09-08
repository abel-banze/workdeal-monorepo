"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, ShieldCheck, Users } from "lucide-react";
import { updateUserRole } from "@/app/actions/admin";

interface RoleRow {
  id: string;
  name: string;
  email: string;
  systemRole: string;
  image?: string | null;
}

const ROLE_OPTIONS = [
  { value: "user", label: "Utilizador" },
  { value: "moderator", label: "Moderador" },
  { value: "admin", label: "Admin" },
] as const;

const ROLE_META: Record<string, { chip: string; dot: string }> = {
  admin: { chip: "border-[#0F1A2E] bg-[#0F1A2E] text-white", dot: "bg-white" },
  moderator: { chip: "border-[#B27300]/30 bg-[#B27300]/[0.1] text-[#B27300]", dot: "bg-[#B27300]" },
  user: { chip: "border-[#D9D2C2] bg-[#F6F3EE] text-[#0F1A2E]/65", dot: "bg-[#C9C2B4]" },
};

export function RoleManager({ users, actorRole }: { users: RoleRow[]; actorRole: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const canManage = actorRole === "admin";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.name + " " + u.email).toLowerCase().includes(q));
  }, [users, search]);

  const counts = useMemo(() => {
    const out = { admin: 0, moderator: 0, user: 0 };
    for (const u of users) {
      if (u.systemRole in out) out[u.systemRole as keyof typeof out] += 1;
    }
    return out;
  }, [users]);

  async function onChange(userId: string, role: string) {
    setBusy(userId);
    setError(null);
    setOk(null);
    try {
      const res = await updateUserRole(userId, role as "user" | "moderator" | "admin");
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao actualizar papel");
      } else {
        setOk(userId);
        const t = setTimeout(() => setOk(null), 2000);
        return () => clearTimeout(t);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao actualizar papel");
    } finally {
      setBusy(null);
    }
  }

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-[#D9D2C2] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#FF3B1F]/[0.08]">
            <ShieldCheck className="size-5 text-[#FF3B1F]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0F1A2E]">Acesso restrito</p>
            <p className="text-xs text-[#0F1A2E]/50">Só administradores podem alterar papéis de sistema.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* Resumo da equipa */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D2C2] bg-white px-3 py-1.5 font-mono text-[11px] font-bold text-[#0F1A2E]/60">
          <Users className="size-3.5 text-[#0B5E56]" />
          {users.length.toLocaleString("pt-PT")} contas
        </span>
        {(["admin", "moderator", "user"] as const).map((role) => {
          const meta = ROLE_META[role];
          return (
            <span key={role} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold ${meta.chip}`}>
              <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
              <span className="capitalize">{role}</span> · {counts[role]}
            </span>
          );
        })}
      </div>

      <section className="rounded-2xl border border-[#D9D2C2] bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#0F1A2E]/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome ou email…"
            className="h-10 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] pl-10 pr-3 text-sm text-[#0F1A2E] outline-none transition placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
          />
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] px-3.5 py-2.5 text-sm text-[#FF3B1F]">{error}</div>
        )}

        <div className="mt-4 divide-y divide-[#D9D2C2]/60">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#0F1A2E]/45">Nenhuma conta corresponde à pesquisa.</p>
          ) : (
            filtered.map((u) => {
              const meta = ROLE_META[u.systemRole] ?? ROLE_META.user;
              const saving = busy === u.id;
              return (
                <div key={u.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {u.image ? (
                      <Image src={u.image} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full border border-[#D9D2C2] object-cover" />
                    ) : (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0F1A2E] font-mono text-[11px] font-bold text-white">
                        {u.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#0F1A2E]">{u.name}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${meta.chip}`}>
                          <span className={`size-1 rounded-full ${meta.dot}`} aria-hidden />
                          {ROLE_OPTIONS.find((o) => o.value === u.systemRole)?.label ?? u.systemRole}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[#0F1A2E]/45">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={u.systemRole}
                      disabled={saving}
                      onChange={(e) => {
                        if (e.target.value !== u.systemRole) void onChange(u.id, e.target.value);
                      }}
                      className="h-9 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15 disabled:opacity-50"
                      aria-label={`Papel de ${u.name}`}
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {saving && <span className="font-mono text-[11px] text-[#0F1A2E]/45">a guardar…</span>}
                    {ok === u.id && <span className="font-mono text-[11px] font-bold text-[#0B5E56]">guardado</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}