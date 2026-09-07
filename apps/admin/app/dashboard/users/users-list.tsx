"use client";

import * as React from "react";
import Image from "next/image";
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
  Inbox,
  MailX,
  MoreHorizontalIcon,
  Phone,
  Search,
  ShieldCheck,
  UserRoundX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu";
import { updateUserRole } from "@/app/actions/admin";

const DISPLAY_FONT = "var(--font-display)";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  systemRole: "user" | "moderator" | "admin";
  emailVerified: boolean;
  createdAt: string;
  deletedAt: string | null;
}

const ROLE_META: Record<UserRow["systemRole"], { label: string; chip: string; dot: string }> = {
  admin: { label: "Admin", chip: "border-[#0F1A2E] bg-[#0F1A2E] text-white", dot: "bg-white" },
  moderator: { label: "Moderador", chip: "border-[#B27300]/30 bg-[#B27300]/[0.1] text-[#B27300]", dot: "bg-[#B27300]" },
  user: { label: "Utilizador", chip: "border-[#D9D2C2] bg-[#F6F3EE] text-[#0F1A2E]/65", dot: "bg-[#C9C2B4]" },
};

const ROLE_OPTIONS: Array<{ value: UserRow["systemRole"]; label: string }> = [
  { value: "user", label: "Utilizador" },
  { value: "moderator", label: "Moderador" },
  { value: "admin", label: "Admin" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">{children}</p>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" });
}

function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function StatCard({
  label,
  value,
  caption,
  accent,
}: {
  label: string;
  value: number;
  caption: string;
  accent: "teal" | "navy" | "amber" | "vermilion";
}) {
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

export function UsersList({ users, isAdmin, total }: { users: UserRow[]; isAdmin: boolean; total?: number }) {
  const router = useRouter();
  const [now] = React.useState(() => Date.now());
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"all" | UserRow["systemRole"]>("all");
  const [verifiedFilter, setVerifiedFilter] = React.useState<"all" | "verified" | "unverified">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "deleted">("all");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 12 });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const stats = React.useMemo(() => {
    const out = { total: users.length, admins: 0, moderators: 0, members: 0, unverified: 0, deleted: 0 };
    for (const u of users) {
      if (u.systemRole === "admin") out.admins++;
      else if (u.systemRole === "moderator") out.moderators++;
      else out.members++;
      if (!u.emailVerified) out.unverified++;
      if (u.deletedAt) out.deleted++;
    }
    return out;
  }, [users]);

  const columns = React.useMemo<ColumnDef<UserRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (u) => u.name,
        header: "Utilizador",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-3">
              {u.image ? (
                <Image src={u.image} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full border border-[#D9D2C2] object-cover" />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0F1A2E] font-mono text-[11px] font-bold text-white">
                  {u.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#0F1A2E]">{u.name}</span>
                <span className="block truncate text-xs text-[#0F1A2E]/45">{u.email}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "phone",
        header: "Telefone",
        cell: ({ row }) => {
          const phone = row.original.phone;
          return phone ? (
            <span className="flex items-center gap-1.5 font-mono text-xs text-[#0F1A2E]/55">
              <Phone className="size-3 text-[#0B5E56]" />
              {phone}
            </span>
          ) : (
            <span className="text-[#0F1A2E]/35">—</span>
          );
        },
      },
      {
        id: "systemRole",
        accessorFn: (u) => u.systemRole,
        header: "Papel",
        cell: ({ row }) => {
          const meta = ROLE_META[row.original.systemRole];
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}>
              <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
              {meta.label}
            </span>
          );
        },
      },
      {
        id: "emailVerified",
        accessorFn: (u) => u.emailVerified,
        header: "Email",
        cell: ({ row }) => {
          const verified = row.original.emailVerified;
          return (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                verified ? "text-[#0B5E56]" : "text-[#B27300]"
              }`}
            >
              {verified ? <CheckCircle2 className="size-3.5" /> : <MailX className="size-3.5" />}
              {verified ? "Verificado" : "Não verificado"}
            </span>
          );
        },
      },
      {
        id: "createdAt",
        accessorFn: (u) => u.createdAt,
        header: "Registo",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[11px] text-[#0F1A2E]/55">
            {formatDate(row.original.createdAt)}
            <span className="block text-[10px] text-[#0F1A2E]/35">{timeAgo(row.original.createdAt, now)}</span>
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (u) => (u.deletedAt ? "deleted" : "active"),
        header: "Estado",
        cell: ({ row }) => {
          if (!row.original.deletedAt)
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0B5E56]">
                <span className="size-1.5 rounded-full bg-[#0B5E56]" aria-hidden /> Activa
              </span>
            );
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#FF3B1F]">
              <span className="size-1.5 rounded-full bg-[#FF3B1F]" aria-hidden /> Desactivada
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Acções</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RowActions
              user={row.original}
              isAdmin={isAdmin}
              busy={busy}
              onRoleChange={changeRole}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, isAdmin, now],
  );

  const table = useReactTable({
    data: users,
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
      const u = row.original;
      const hay = [u.name, u.email, u.email, u.phone, u.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(String(value).toLowerCase());
    },
  });

  const filtered =
    roleFilter === "all" && verifiedFilter === "all" && statusFilter === "all"
      ? table.getSortedRowModel().rows
      : table.getSortedRowModel().rows.filter((row) => {
          const u = row.original;
          if (roleFilter !== "all" && u.systemRole !== roleFilter) return false;
          if (verifiedFilter !== "all") {
            if (verifiedFilter === "verified" && !u.emailVerified) return false;
            if (verifiedFilter === "unverified" && u.emailVerified) return false;
          }
          if (statusFilter !== "all") {
            if (statusFilter === "active" && u.deletedAt) return false;
            if (statusFilter === "deleted" && !u.deletedAt) return false;
          }
          return true;
        });

  const pageRows = filtered.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));

  function resetPage() {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  async function changeRole(userId: string, role: UserRow["systemRole"]) {
    setBusy(userId);
    setError(null);
    try {
      const res = await updateUserRole(userId, role);
      if (!res.success) setError(res.error?.message ?? "Falha ao actualizar papel");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao actualizar papel");
    } finally {
      setBusy(null);
    }
  }

  const activeFilterCount =
    (globalFilter.trim() ? 1 : 0) +
    (roleFilter !== "all" ? 1 : 0) +
    (verifiedFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const truncated = typeof total === "number" && total > users.length;

  function clearFilters() {
    setGlobalFilter("");
    setRoleFilter("all");
    setVerifiedFilter("all");
    setStatusFilter("all");
    resetPage();
  }

  return (
    <div className="space-y-5">
      {/* Stats band */}
      <section aria-label="Resumo de utilizadores">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <Eyebrow>Comunidade</Eyebrow>
          <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/35 sm:block">
            Composição da base de contas
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatCard
            label="Contas"
            value={stats.total}
            caption={`${stats.admins + stats.moderators} na equipa · ${stats.members} utilizadores`}
            accent="navy"
          />
          <StatCard
            label="Equipa"
            value={stats.admins + stats.moderators}
            caption={`${stats.admins} admins · ${stats.moderators} moderadores`}
            accent="teal"
          />
          <StatCard
            label="Email por verificar"
            value={stats.unverified}
            caption="Contas sem email confirmado"
            accent="amber"
          />
          <StatCard
            label="Contas desactivadas"
            value={stats.deleted}
            caption="Soft-deleted, fora do fluxo"
            accent="vermilion"
          />
        </div>
      </section>

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
              placeholder="Pesquisar por nome, email ou telefone…"
              className="h-10 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] pl-10 pr-3 text-sm text-[#0F1A2E] outline-none transition placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as "all" | UserRow["systemRole"]);
                resetPage();
              }}
              className="h-10 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
              aria-label="Filtrar por papel"
            >
              <option value="all">Todos os papéis</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderador</option>
              <option value="user">Utilizador</option>
            </select>
            <select
              value={verifiedFilter}
              onChange={(e) => {
                setVerifiedFilter(e.target.value as "all" | "verified" | "unverified");
                resetPage();
              }}
              className="h-10 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
              aria-label="Filtrar por verificação de email"
            >
              <option value="all">Email: todos</option>
              <option value="verified">Email verificado</option>
              <option value="unverified">Email por verificar</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "active" | "deleted");
                resetPage();
              }}
              className="h-10 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
              aria-label="Filtrar por estado da conta"
            >
              <option value="all">Estado: todas</option>
              <option value="active">Activas</option>
              <option value="deleted">Desactivadas</option>
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] px-3.5 py-2.5 text-sm text-[#FF3B1F]">{error}</div>
      )}

      {/* Result bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm text-[#0F1A2E]/55">
          <span className="font-mono font-bold text-[#0F1A2E]/80">{filtered.length.toLocaleString("pt-PT")}</span>{" "}
          {filtered.length === 1 ? "utilizador" : "utilizadores"}
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
          <table className="w-full min-w-[900px] text-sm">
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
                  <tr
                    key={row.id}
                    className={`border-b border-[#D9D2C2]/60 align-top last:border-0 transition hover:bg-[#0B5E56]/[0.03] ${
                      row.original.deletedAt ? "bg-[#FF3B1F]/[0.02]" : ""
                    }`}
                  >
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
            const u = row.original;
            const meta = ROLE_META[u.systemRole];
            return (
              <article key={u.id} className={`rounded-2xl border border-[#D9D2C2] bg-white p-4 shadow-sm ${u.deletedAt ? "opacity-80" : ""}`}>
                <div className="flex items-start gap-3">
                  {u.image ? (
                    <Image src={u.image} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full border border-[#D9D2C2] object-cover" />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0F1A2E] font-mono text-xs font-bold text-white">
                      {u.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0F1A2E]">{u.name}</p>
                    <p className="truncate text-xs text-[#0F1A2E]/45">{u.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}>
                        <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
                        {meta.label}
                      </span>
                      {u.emailVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0B5E56]">
                          <CheckCircle2 className="size-3" /> Email verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B27300]">
                          <MailX className="size-3" /> Por verificar
                        </span>
                      )}
                      {u.deletedAt && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FF3B1F]">
                          <UserRoundX className="size-3" /> Desactivada
                        </span>
                      )}
                    </div>
                  </div>
                  <RowActions user={u} isAdmin={isAdmin} busy={busy} onRoleChange={changeRole} />
                </div>
                <dl className="mt-3 space-y-1.5 border-t border-[#D9D2C2]/60 pt-3 text-xs text-[#0F1A2E]/60">
                  {u.phone && (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F1A2E]/40">Telefone</dt>
                      <dd className="min-w-0">{u.phone}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F1A2E]/40">Registo</dt>
                    <dd>
                      {formatDate(u.createdAt)} · {timeAgo(u.createdAt, now)}
                    </dd>
                  </div>
                </dl>
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
  user,
  isAdmin,
  busy,
  onRoleChange,
}: {
  user: UserRow;
  isAdmin: boolean;
  busy: string | null;
  onRoleChange: (userId: string, role: UserRow["systemRole"]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={busy === user.id}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9D2C2] bg-white text-[#0F1A2E]/55 transition hover:bg-[#F6F3EE] hover:text-[#0F1A2E] disabled:opacity-50"
            aria-label={`Acções de ${user.name}`}
          >
            <MoreHorizontalIcon className="size-4" />
          </button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
        </DropdownMenuGroup>
        {isAdmin ? (
          <>
            <DropdownMenuLabel className="text-[11px]">Alterar papel</DropdownMenuLabel>
            {ROLE_OPTIONS.map((o) => (
              <DropdownMenuItem
                key={o.value}
                disabled={o.value === user.systemRole || busy === user.id}
                onClick={() => void onRoleChange(user.id, o.value)}
              >
                {o.value === user.systemRole ? <Check className="size-4" /> : <span className="size-4" />}
                {o.label}
                {busy === user.id && " · a guardar…"}
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <DropdownMenuItem disabled>
            <ShieldCheck className="size-4" /> Só admins gerem papéis
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-[#F6F3EE]">
        <Inbox className="size-5 text-[#0F1A2E]/35" />
      </span>
      <p className="text-sm font-medium text-[#0F1A2E]/70">{filtered ? "Nada corresponde aos filtros" : "Ainda não há utilizadores"}</p>
      <p className="max-w-xs text-xs text-[#0F1A2E]/45">
        {filtered ? "Ajusta a pesquisa ou limpa os filtros para veres todas as contas." : "As contas aparecem aqui assim que alguém se regista."}
      </p>
    </div>
  );
}