"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Inbox,
  Link as LinkIcon,
  MailX,
  RefreshCcw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { createAdminInvite, regenerateAdminInvite, revokeAdminInvite } from "@/app/actions/admin";

const DISPLAY_FONT = "var(--font-display)";

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type InviteRole = "moderator" | "admin";

export interface InviteRow {
  id: string;
  email: string;
  role: "user" | "moderator" | "admin";
  status: InviteStatus;
  token: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  invitedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  link?: string;
}

const STATUS_META: Record<InviteStatus, { label: string; chip: string; dot: string; icon: React.ReactNode }> = {
  pending: { label: "Pendente", chip: "border-[#B27300]/30 bg-[#B27300]/[0.08] text-[#B27300]", dot: "bg-[#B27300]", icon: <Clock3 className="size-3.5" /> },
  accepted: { label: "Aceite", chip: "border-[#0B5E56]/25 bg-[#0B5E56]/[0.08] text-[#0B5E56]", dot: "bg-[#0B5E56]", icon: <CheckCircle2 className="size-3.5" /> },
  revoked: { label: "Revogado", chip: "border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] text-[#FF3B1F]", dot: "bg-[#FF3B1F]", icon: <XCircle className="size-3.5" /> },
  expired: { label: "Expirado", chip: "border-[#B9B2A4] bg-[#F6F3EE] text-[#0F1A2E]/55", dot: "bg-[#B9B2A4]", icon: <MailX className="size-3.5" /> },
};

const ROLE_META: Record<InviteRow["role"], { label: string; chip: string; dot: string }> = {
  admin: { label: "Admin", chip: "border-[#0F1A2E] bg-[#0F1A2E] text-white", dot: "bg-white" },
  moderator: { label: "Moderador", chip: "border-[#B27300]/30 bg-[#B27300]/[0.1] text-[#B27300]", dot: "bg-[#B27300]" },
  user: { label: "Utilizador", chip: "border-[#D9D2C2] bg-[#F6F3EE] text-[#0F1A2E]/65", dot: "bg-[#C9C2B4]" },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">{children}</p>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" });
}

function daysLeft(iso: string, now: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const ms = d.getTime() - now;
  if (ms < 0) return "expirado";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 1) return "expira hoje";
  return `expira em ${days}d`;
}

function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("Clipboard indisponível"));
}

function StatusChip({ status }: { status: InviteStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function StatCard({ label, value, caption, accent }: { label: string; value: number; caption: string; accent: "teal" | "navy" | "amber" | "vermilion" }) {
  const dot =
    accent === "teal"
      ? "bg-[#0B5E56]"
      : accent === "navy"
        ? "bg-[#0F1A2E]"
        : accent === "amber"
          ? "bg-[#B27300]"
          : "bg-[#FF3B1F]";
  return (
    <div className="rounded-2xl border border-[#D9D2C2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${dot}`} aria-hidden />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/50">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#0F1A2E] sm:text-4xl" style={{ fontFamily: DISPLAY_FONT }}>
        {value.toLocaleString("pt-PT")}
      </p>
      <p className="mt-1 text-xs text-[#0F1A2E]/45">{caption}</p>
    </div>
  );
}

export function InvitesList({ invites, isAdmin, total }: { invites: InviteRow[]; isAdmin: boolean; total?: number }) {
  const router = useRouter();
  const [now] = React.useState(() => Date.now());
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | InviteStatus>("all");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ id: string; link: string } | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // --- formulário de criação (admin) ---
  const [draftEmail, setDraftEmail] = React.useState("");
  const [draftRole, setDraftRole] = React.useState<InviteRole>("moderator");
  const [draftExpiry, setDraftExpiry] = React.useState(7);
  const [creating, setCreating] = React.useState(false);

  const stats = React.useMemo(() => {
    const out = { total: invites.length, pending: 0, accepted: 0, revoked: 0, expired: 0 };
    for (const it of invites) {
      if (it.status === "pending") out.pending++;
      else if (it.status === "accepted") out.accepted++;
      else if (it.status === "revoked") out.revoked++;
      else out.expired++;
    }
    return out;
  }, [invites]);

  const columns = React.useMemo<ColumnDef<InviteRow, unknown>[]>(
    () => [
      {
        id: "email",
        accessorFn: (it) => it.email,
        header: "Convidado",
        cell: ({ row }) => {
          const it = row.original;
          return (
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[#0F1A2E]">{it.email}</span>
              <span className="block truncate text-xs text-[#0F1A2E]/45">
                {it.invitedByEmail ? `Convidado por ${it.invitedByEmail}` : "—"}
              </span>
            </div>
          );
        },
      },
      {
        id: "role",
        accessorFn: (it) => it.role,
        header: "Papel",
        cell: ({ row }) => {
          const meta = ROLE_META[row.original.role];
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}>
              <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
              {meta.label}
            </span>
          );
        },
      },
      {
        id: "status",
        accessorFn: (it) => it.status,
        header: "Estado",
        cell: ({ row }) => <StatusChip status={row.original.status} />,
      },
      {
        id: "expiresAt",
        accessorFn: (it) => it.expiresAt ?? "",
        header: "Validade",
        cell: ({ row }) => {
          const it = row.original;
          if (!it.expiresAt) return <span className="text-[#0F1A2E]/35">—</span>;
          const expired = new Date(it.expiresAt).getTime() < now && it.status === "pending";
          return (
            <div className="whitespace-nowrap">
              <span className="block font-mono text-[11px] text-[#0F1A2E]/65">{formatDate(it.expiresAt)}</span>
              <span className={`block text-[10px] ${expired ? "text-[#FF3B1F]" : "text-[#0F1A2E]/40"}`}>{daysLeft(it.expiresAt, now)}</span>
            </div>
          );
        },
      },
      {
        id: "createdAt",
        accessorFn: (it) => it.createdAt,
        header: "Criado",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[11px] text-[#0F1A2E]/55">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Acções</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RowActions invite={row.original} isAdmin={isAdmin} busy={busy} onAction={runAction} />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, isAdmin, now],
  );

  const table = useReactTable({
    data: invites,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _, value) => {
      const it = row.original;
      const hay = [it.email, it.invitedByEmail, it.id].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(String(value).toLowerCase());
    },
  });

  const filtered =
    statusFilter === "all"
      ? table.getSortedRowModel().rows
      : table.getSortedRowModel().rows.filter((row) => row.original.status === statusFilter);

  const pageRows = filtered.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));

  function resetPage() {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  async function copyLink(invite: InviteRow) {
    const link = invite.link ?? `${window.location.origin}/invite/${invite.token}`;
    try {
      await copyText(link);
      setCopiedId(invite.id);
      setNotice(null);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setNotice({ id: invite.id, link });
    }
  }

  async function runAction(action: "regenerate" | "revoke", invite: InviteRow) {
    setBusy(invite.id);
    setError(null);
    try {
      if (action === "revoke") {
        const res = await revokeAdminInvite(invite.id);
        if (!res.success) {
          setError("Sem permissão para revogar — só administradores.");
          return;
        }
        router.refresh();
      } else {
        const res = await regenerateAdminInvite(invite.id);
        if (!res.success) {
          setError("Sem permissão para gerar novo link — só administradores.");
          return;
        }
        const record = res.data as InviteRow;
        const link = `${window.location.origin}/invite/${record.token}`;
        await copyText(link).catch(() => undefined);
        setNotice({ id: record.id, link });
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na operação");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await createAdminInvite({ email: draftEmail, role: draftRole, expiresInDays: draftExpiry });
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao criar convite");
        return;
      }
      const record = res.data;
      await copyText(record.link).catch(() => undefined);
      setNotice({ id: record.id, link: record.link });
      setDraftEmail("");
      setDraftRole("moderator");
      setDraftExpiry(7);
      resetPage();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar convite");
    } finally {
      setCreating(false);
    }
  }

  const activeFilterCount = (globalFilter.trim() ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);
  const truncated = typeof total === "number" && total > invites.length;

  function clearFilters() {
    setGlobalFilter("");
    setStatusFilter("all");
    resetPage();
  }

  return (
    <div className="space-y-5">
      {/* Stats band */}
      <section aria-label="Resumo de convites">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <Eyebrow>Fluxo de convites</Eyebrow>
          <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/35 sm:block">
            Quem foi convidado e como está cada link
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatCard label="Convites" value={stats.total} caption="Todos os enviados" accent="navy" />
          <StatCard label="Pendentes" value={stats.pending} caption="Links activos por aceitar" accent="amber" />
          <StatCard label="Aceites" value={stats.accepted} caption="Já entraram na equipa" accent="teal" />
          <StatCard label="Revogados" value={stats.revoked + stats.expired} caption={`${stats.revoked} revogados · ${stats.expired} expirados`} accent="vermilion" />
        </div>
      </section>

      {/* Create form (admin) */}
      {isAdmin && (
        <section className="rounded-2xl border border-[#D9D2C2] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#0B5E56]/10">
              <ShieldCheck className="size-4 text-[#0B5E56]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#0F1A2E]">Convidar para a equipa</p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/40">
                Só administradores
              </p>
            </div>
          </div>
          <form onSubmit={createInvite} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <input
              type="email"
              required
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              placeholder="email@empresa.co.mz"
              className="h-10 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            />
            <select
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value as InviteRole)}
              className="h-10 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
              aria-label="Papel do convite"
            >
              <option value="moderator">Moderador</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={draftExpiry}
              onChange={(e) => setDraftExpiry(Number(e.target.value))}
              className="h-10 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
              aria-label="Validade do convite"
            >
              <option value={1}>Vence em 1 dia</option>
              <option value={7}>Vence em 7 dias</option>
              <option value={14}>Vence em 14 dias</option>
              <option value={30}>Vence em 30 dias</option>
            </select>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0F1A2E] px-4 text-sm font-semibold text-white transition hover:bg-[#0B5E56] disabled:pointer-events-none disabled:opacity-60"
            >
              {creating ? "A criar…" : "Criar convite"}
            </button>
          </form>
        </section>
      )}

      {/* Toolbar */}
      <section className="rounded-2xl border border-[#D9D2C2] bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#0F1A2E]/35" />
            <input
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                resetPage();
              }}
              placeholder="Pesquisar por email…"
              className="h-10 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] pl-10 pr-3 text-sm text-[#0F1A2E] outline-none transition placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | InviteStatus);
              resetPage();
            }}
            className="h-10 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            aria-label="Filtrar por estado"
          >
            <option value="all">Estado: todos</option>
            <option value="pending">Pendentes</option>
            <option value="accepted">Aceites</option>
            <option value="revoked">Revogados</option>
            <option value="expired">Expirados</option>
          </select>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] px-3.5 py-2.5 text-sm text-[#FF3B1F]">{error}</div>
      )}

      {notice && (
        <div className="rounded-xl border border-[#0B5E56]/25 bg-[#0B5E56]/[0.06] px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-[#0B5E56]">
              <LinkIcon className="size-4" />
              Link do convite criado — copiado para a área de transferência.
            </p>
            <div className="flex items-center gap-2">
              <code className="max-w-[320px] truncate font-mono text-[11px] text-[#0F1A2E]/70">{notice.link}</code>
              <button
                type="button"
                onClick={() => copyText(notice.link).catch(() => undefined)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0B5E56]/25 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0B5E56] transition hover:bg-[#0B5E56]/10"
              >
                <Copy className="size-3.5" /> Copiar
              </button>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="rounded-lg px-2 py-1.5 text-xs text-[#0F1A2E]/45 hover:text-[#0F1A2E]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm text-[#0F1A2E]/55">
          <span className="font-mono font-bold text-[#0F1A2E]/80">{filtered.length.toLocaleString("pt-PT")}</span>{" "}
          {filtered.length === 1 ? "convite" : "convites"}
          {activeFilterCount > 0 && " · filtrado"}
          {truncated && !activeFilterCount && (
            <span className="ml-1 text-xs text-[#B27300]/80">dos {total!.toLocaleString("pt-PT")} mais recentes</span>
          )}
        </p>
        {activeFilterCount > 0 && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0B5E56] hover:underline">
            Limpar filtros ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Table (desktop) */}
      <div className="hidden overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-[#D9D2C2] bg-[#F6F3EE]">
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    return (
                      <th key={header.id} className="px-4 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#0F1A2E]/45">
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 hover:text-[#0B5E56]"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <ArrowUp className="size-3.5 text-[#0B5E56]" />,
                              desc: <ArrowDown className="size-3.5 text-[#0B5E56]" />,
                            }[header.column.getIsSorted() as string] ?? <ArrowUpDown className="size-3.5 opacity-40" />}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16">
                    <EmptyState filtered={activeFilterCount > 0} />
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#D9D2C2]/60 align-top last:border-0 transition hover:bg-[#0B5E56]/[0.03]">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards (mobile) */}
      <div className="space-y-3 lg:hidden">
        {pageRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D9D2C2] bg-white py-16">
            <EmptyState filtered={activeFilterCount > 0} />
          </div>
        ) : (
          pageRows.map((row) => {
            const it = row.original;
            const meta = ROLE_META[it.role];
            return (
              <article key={it.id} className="rounded-2xl border border-[#D9D2C2] bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0F1A2E]">{it.email}</p>
                    <p className="truncate text-xs text-[#0F1A2E]/45">
                      {it.invitedByEmail ? `por ${it.invitedByEmail}` : "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}>
                        <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
                        {meta.label}
                      </span>
                      <StatusChip status={it.status} />
                    </div>
                  </div>
                  <RowActions invite={it} isAdmin={isAdmin} busy={busy} onAction={runAction} />
                </div>
                <dl className="mt-3 space-y-1.5 border-t border-[#D9D2C2]/60 pt-3 text-xs text-[#0F1A2E]/60">
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F1A2E]/40">Criado</dt>
                    <dd>{formatDate(it.createdAt)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F1A2E]/40">Validade</dt>
                    <dd>
                      {formatDate(it.expiresAt)} {it.expiresAt && `· ${daysLeft(it.expiresAt, now)}`}
                    </dd>
                  </div>
                  {it.acceptedAt && (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F1A2E]/40">Aceite</dt>
                      <dd>{formatDate(it.acceptedAt)}</dd>
                    </div>
                  )}
                </dl>
                {it.status === "pending" && isAdmin && (
                  <button
                    type="button"
                    onClick={() => copyLink(it)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1.5 text-xs font-medium text-[#0F1A2E]/70 transition hover:border-[#0B5E56]/40 hover:text-[#0B5E56]"
                  >
                    {copiedId === it.id ? <Check className="size-3.5 text-[#0B5E56]" /> : <Copy className="size-3.5" />}
                    {copiedId === it.id ? "Copiado!" : "Copiar link"}
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="font-mono text-[11px] text-[#0F1A2E]/45">
          {filtered.length === 0 ? "0" : pagination.pageIndex * pagination.pageSize + 1}–
          {Math.min(filtered.length, (pagination.pageIndex + 1) * pagination.pageSize).toLocaleString("pt-PT")} de{" "}
          {filtered.length.toLocaleString("pt-PT")}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={pagination.pageIndex <= 0}
            onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9D2C2] bg-white text-[#0F1A2E]/60 transition hover:border-[#0B5E56]/40 hover:text-[#0B5E56] disabled:pointer-events-none disabled:opacity-40"
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-2 font-mono text-[11px] font-bold text-[#0F1A2E]/55">
            {pagination.pageIndex + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.pageIndex >= totalPages - 1}
            onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9D2C2] bg-white text-[#0F1A2E]/60 transition hover:border-[#0B5E56]/40 hover:text-[#0B5E56] disabled:pointer-events-none disabled:opacity-40"
            aria-label="Página seguinte"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RowActions({
  invite,
  isAdmin,
  busy,
  onAction,
}: {
  invite: InviteRow;
  isAdmin: boolean;
  busy: string | null;
  onAction: (action: "regenerate" | "revoke", invite: InviteRow) => void;
}) {
  const canAct = isAdmin && invite.status === "pending";
  if (!canAct) return <span className="text-xs text-[#0F1A2E]/35">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        title="Gerar novo link (o anterior deixa de funcionar)"
        disabled={busy === invite.id}
        onClick={() => onAction("regenerate", invite)}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9D2C2] bg-white text-[#0F1A2E]/55 transition hover:border-[#0B5E56]/40 hover:text-[#0B5E56] disabled:opacity-50"
        aria-label="Gerar novo link"
      >
        <RefreshCcw className="size-4" />
      </button>
      <button
        type="button"
        title="Revogar convite"
        disabled={busy === invite.id}
        onClick={() => onAction("revoke", invite)}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9D2C2] bg-white text-[#0F1A2E]/55 transition hover:border-[#FF3B1F]/40 hover:text-[#FF3B1F] disabled:opacity-50"
        aria-label="Revogar convite"
      >
        <XCircle className="size-4" />
      </button>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-[#F6F3EE]">
        {filtered ? <Search className="size-5 text-[#0F1A2E]/35" /> : <Inbox className="size-5 text-[#0F1A2E]/35" />}
      </span>
      <p className="text-sm font-medium text-[#0F1A2E]/70">
        {filtered ? "Nada corresponde aos filtros" : "Ainda não há convites"}
      </p>
      <p className="max-w-xs text-xs text-[#0F1A2E]/45">
        {filtered
          ? "Ajusta a pesquisa ou limpa os filtros para veres todos os convites."
          : "Os convites aparecem aqui assim que convidares alguém para a equipa de moderação."}
      </p>
    </div>
  );
}