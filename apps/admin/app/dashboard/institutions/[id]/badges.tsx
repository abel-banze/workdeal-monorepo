"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Award, Plus, X } from "lucide-react";
import { BADGE_TYPE_LABELS, BADGE_ORIGIN_LABELS, type AssignedBadgeView, type Badge } from "@workdeal/shared";
import { assignInstitutionBadge, revokeInstitutionBadge } from "@/app/actions/admin";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">{children}</p>;
}

function TypeChip({ type }: { type: AssignedBadgeView["type"] }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#0B5E56]/20 bg-[#0B5E56]/[0.06] px-2 py-0.5 text-[11px] font-medium text-[#0B5E56]">
      {BADGE_TYPE_LABELS[type]}
    </span>
  );
}

export function BadgesManager({
  institutionId,
  assigned,
  catalogue,
  isAdmin,
}: {
  institutionId: string;
  assigned: AssignedBadgeView[];
  catalogue: Badge[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const available = catalogue.filter((b) => b.isActive && !assigned.some((a) => a.badgeId === b.id));

  async function assign() {
    if (!selectedId) return;
    setBusy("assign");
    setError(null);
    try {
      const res = await assignInstitutionBadge(institutionId, { badgeId: selectedId });
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao atribuir selo");
        return;
      }
      setSelectedId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atribuir selo");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(assignedRow: AssignedBadgeView) {
    if (!confirm(`Revogar o selo "${assignedRow.name}" desta instituição?`)) return;
    setBusy(assignedRow.badgeId);
    setError(null);
    try {
      const res = await revokeInstitutionBadge(institutionId, assignedRow.badgeId);
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao revogar selo");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao revogar selo");
    } finally {
      setBusy(null);
    }
  }

  const activeCount = assigned.filter((a) => a.status === "active").length;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Eyebrow>Selos atribuídos</Eyebrow>
          <p className="mt-1 text-sm text-[#0F1A2E]/55">
            {assigned.length.toLocaleString("pt-PT")} selos · {activeCount.toLocaleString("pt-PT")} activos
          </p>
        </div>
        {isAdmin && available.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-9 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
              aria-label="Selo a atribuir"
            >
              <option value="">Seleccionar selo…</option>
              {available.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedId || busy === "assign"}
              onClick={() => void assign()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0B5E56] px-3 text-sm font-bold text-white transition hover:bg-[#0A4A44] disabled:opacity-50"
            >
              <Plus className="size-4" /> Atribuir
            </button>
          </div>
        )}
      </div>

      {error && <div className="rounded-xl border border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] px-3.5 py-2.5 text-sm text-[#FF3B1F]">{error}</div>}

      {assigned.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D9D2C2] bg-white py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-[#F6F3EE]">
            <Award className="size-5 text-[#0F1A2E]/35" />
          </span>
          <p className="mt-3 text-sm font-medium text-[#0F1A2E]/70">Ainda não há selos atribuídos</p>
          <p className="mt-1 max-w-xs text-xs text-[#0F1A2E]/45">
            {isAdmin && available.length > 0
              ? "Atribui um selo do catálogo acima para distinguir esta instituição."
              : "Quando um administrador atribuir um selo, aparece aqui."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {assigned.map((row) => (
            <article
              key={`${row.badgeId}`}
              className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-sm sm:flex-nowrap ${
                row.status === "active" ? "border-[#D9D2C2]" : "border-[#D9D2C2] opacity-70"
              }`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0B5E56]/[0.08] text-[#0B5E56]">
                <Award className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#0F1A2E]">{row.name}</p>
                  <TypeChip type={row.type} />
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${row.status === "active" ? "border-[#0B5E56]/25 bg-[#0B5E56]/[0.08] text-[#0B5E56]" : "border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] text-[#FF3B1F]"}`}>
                    {row.status === "active" ? "Activo" : "Revogado"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#0F1A2E]/45">
                  {BADGE_ORIGIN_LABELS[row.origin]}
                  {row.description ? ` · ${row.description}` : ""}
                </p>
                <p className="mt-0.5 text-[11px] text-[#0F1A2E]/35">
                  Atribuído em {new Date(row.awardedAt).toLocaleDateString("pt-MZ")}
                  {row.awardedBy?.name ? ` por ${row.awardedBy.name}` : ""}
                  {row.revokedAt ? ` · revogado em ${new Date(row.revokedAt).toLocaleDateString("pt-MZ")}` : ""}
                </p>
              </div>
              {isAdmin && row.status === "active" && (
                <button
                  type="button"
                  disabled={busy === row.badgeId}
                  onClick={() => void revoke(row)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#FF3B1F]/25 bg-[#FFF1EF] px-3 text-xs font-bold text-[#FF3B1F] transition hover:bg-[#FFE3DE] disabled:opacity-50"
                >
                  <X className="size-3.5" /> Revogar
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {isAdmin && available.length === 0 && assigned.length > 0 && (
        <p className="text-xs text-[#0F1A2E]/45">Não há mais selos activos disponíveis para atribuir.</p>
      )}
      {isAdmin && catalogue.length === 0 && (
        <p className="text-xs text-[#0F1A2E]/45">
          Não há selos no catálogo. <span className="font-medium text-[#0B5E56]">Cria um selo</span> primeiro em Perfis → Selos.
        </p>
      )}
    </section>
  );
}