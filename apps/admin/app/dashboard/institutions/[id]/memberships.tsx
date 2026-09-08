"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Inbox, Search, X } from "lucide-react";
import {
  membershipStatusLabels,
  MEMBERSHIP_STATUSES,
  membershipTypeLabels,
  type InstitutionMembershipAdminRow,
  type MembershipStatus,
} from "@workdeal/shared";
import { approveMembership, rejectMembership, verifyMembership, revokeMembership } from "@/app/actions/admin";

const STATUS_META: Record<MembershipStatus, { label: string; chip: string; dot: string }> = {
  pending: { label: "Pendente", chip: "border-[#B27300]/30 bg-[#B27300]/[0.08] text-[#B27300]", dot: "bg-[#B27300]" },
  approved: { label: "Aprovada", chip: "border-[#0B5E56]/25 bg-[#0B5E56]/[0.08] text-[#0B5E56]", dot: "bg-[#0B5E56]" },
  rejected: { label: "Rejeitada", chip: "border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] text-[#FF3B1F]", dot: "bg-[#FF3B1F]" },
  revoked: { label: "Revogada", chip: "border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] text-[#FF3B1F]", dot: "bg-[#FF3B1F]" },
  verified: { label: "Verificada", chip: "border-[#0B5E56] bg-[#0B5E56] text-white", dot: "bg-white" },
  expired: { label: "Expirada", chip: "border-[#6B7280]/30 bg-[#6B7280]/[0.08] text-[#6B7280]", dot: "bg-[#6B7280]" },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">{children}</p>;
}

function StatusChip({ meta }: { meta: { label: string; chip: string; dot: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}

export function MembershipsManager({
  memberships,
  total,
  isAdmin,
}: {
  memberships: InstitutionMembershipAdminRow[];
  total?: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | MembershipStatus>("all");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const filtered = React.useMemo(
    () =>
      memberships.filter(
        (m) =>
          (statusFilter === "all" || m.status === statusFilter) &&
          (search.trim() === "" || `${m.company.name} ${m.company.slug}`.toLowerCase().includes(search.toLowerCase())),
      ),
    [memberships, statusFilter, search],
  );

  const pendingCount = memberships.filter((m) => m.status === "pending").length;
  const verifiedCount = memberships.filter((m) => m.status === "verified").length;

  async function runAction(action: "approve" | "reject" | "verify" | "revoke", m: InstitutionMembershipAdminRow) {
    setBusy(m.id);
    setError(null);
    try {
      const res =
        action === "approve"
          ? await approveMembership(m.id)
          : action === "reject"
            ? await rejectMembership(m.id)
            : action === "verify"
              ? await verifyMembership(m.id)
              : await revokeMembership(m.id);
      if (!res.success) {
        setError(res.error?.message ?? "Operação falhou");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operação falhou");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Eyebrow>Empresas membros</Eyebrow>
          <p className="mt-1 text-sm text-[#0F1A2E]/55">
            {memberships.length.toLocaleString("pt-PT")} membresias · {pendingCount} pendentes · {verifiedCount} verificadas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#0F1A2E]/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar empresa…"
              className="h-9 w-56 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] pl-9 pr-3 text-sm outline-none transition placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | MembershipStatus)}
            className="h-9 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            aria-label="Filtrar por estado"
          >
            <option value="all">Estado: todos</option>
            {MEMBERSHIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {membershipStatusLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="rounded-xl border border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] px-3.5 py-2.5 text-sm text-[#FF3B1F]">{error}</div>}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D9D2C2] bg-white py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-[#F6F3EE]">
            <Inbox className="size-5 text-[#0F1A2E]/35" />
          </span>
          <p className="mt-3 text-sm font-medium text-[#0F1A2E]/70">
            {memberships.length === 0 ? "Ainda não há empresas membros" : "Nada corresponde aos filtros"}
          </p>
          <p className="mt-1 max-w-xs text-xs text-[#0F1A2E]/45">
            {memberships.length === 0
              ? "Quando uma empresa pedir associação, aparece aqui para aprovação."
              : "Ajusta a pesquisa ou limpa os filtros."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((m) => (
            <article key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#D9D2C2] bg-white p-3.5 shadow-sm sm:flex-nowrap">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D9D2C2] bg-[#F6F3EE] text-[10px] font-black text-[#0F1A2E]">
                {m.company.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.company.logoUrl} alt="" className="size-full object-cover" />
                ) : (
                  m.company.name.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="block truncate text-sm font-semibold text-[#0F1A2E]">{m.company.name}</p>
                <p className="truncate text-xs text-[#0F1A2E]/45">
                  {m.company.slug} · {membershipTypeLabels[m.membershipType]} {m.company.province ? `· ${m.company.province}` : ""}
                </p>
              </div>
              <StatusChip meta={STATUS_META[m.status]} />
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  {m.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={busy === m.id}
                        onClick={() => runAction("approve", m)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0B5E56] px-3 text-xs font-bold text-white transition hover:bg-[#0A4A44] disabled:opacity-50"
                      >
                        <Check className="size-3.5" /> Aprovar
                      </button>
                      <button
                        type="button"
                        disabled={busy === m.id}
                        onClick={() => runAction("reject", m)}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9D2C2] bg-white text-[#0F1A2E]/55 transition hover:border-[#FF3B1F]/40 hover:text-[#FF3B1F] disabled:opacity-50"
                        aria-label="Rejeitar"
                      >
                        <X className="size-4" />
                      </button>
                    </>
                  )}
                  {m.status === "approved" && (
                    <button
                      type="button"
                      disabled={busy === m.id}
                      onClick={() => runAction("verify", m)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0F1A2E] px-3 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
                    >
                      <Check className="size-3.5" /> Verificar
                    </button>
                  )}
                  {(m.status === "approved" || m.status === "verified") && (
                    <button
                      type="button"
                      disabled={busy === m.id}
                      onClick={() => {
                        if (confirm("Revogar esta membresia? A empresa deixará de constar como membro.")) runAction("revoke", m);
                      }}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#FF3B1F]/25 bg-[#FFF1EF] px-3 text-xs font-bold text-[#FF3B1F] transition hover:bg-[#FFE3DE] disabled:opacity-50"
                    >
                      <X className="size-3.5" /> Revogar
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {typeof total === "number" && total > memberships.length && (
        <p className="text-center font-mono text-[11px] text-[#0F1A2E]/40">
          A mostrar as {memberships.length.toLocaleString("pt-PT")} membresias mais recentes de {total.toLocaleString("pt-PT")}.
        </p>
      )}
    </section>
  );
}