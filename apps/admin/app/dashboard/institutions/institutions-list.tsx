"use client";

import * as React from "react";
import Link from "next/link";
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
  Building2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
  ShieldOff,
  ShieldCheck,
} from "lucide-react";
import { institutionTypeLabels, INSTITUTION_TYPES, type InstitutionType } from "@workdeal/shared";
import { unverifyAdminInstitution, verifyAdminInstitution } from "@/app/actions/admin";

const DISPLAY_FONT = "var(--font-display)";

export type InstitutionStatus = "draft" | "active" | "suspended";
export type InstitutionVerification = "pending" | "in_review" | "verified" | "suspended";

export interface InstitutionAdminRowUI {
  id: string;
  slug: string;
  name: string;
  organizationType: InstitutionType;
  status: InstitutionStatus;
  verificationStatus: InstitutionVerification;
  province: string | null;
  city: string | null;
  foundedAt: string | null;
  logoUrl: string | null;
  createdByEmail: string | null;
  membersCount: number;
  verifiedMembersCount: number;
  createdAt: string;
}

const STATUS_META: Record<InstitutionStatus, { label: string; chip: string; dot: string }> = {
  active: { label: "Activa", chip: "border-[#0B5E56]/25 bg-[#0B5E56]/[0.08] text-[#0B5E56]", dot: "bg-[#0B5E56]" },
  draft: { label: "Rascunho", chip: "border-[#B9B2A4] bg-[#F6F3EE] text-[#0F1A2E]/55", dot: "bg-[#B9B2A4]" },
  suspended: { label: "Suspensa", chip: "border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] text-[#FF3B1F]", dot: "bg-[#FF3B1F]" },
};

const VERIF_META: Record<InstitutionVerification, { label: string; chip: string; dot: string }> = {
  verified: { label: "Verificada", chip: "border-[#0B5E56] bg-[#0B5E56] text-white", dot: "bg-white" },
  in_review: { label: "Em revisão", chip: "border-[#B27300]/30 bg-[#B27300]/[0.08] text-[#B27300]", dot: "bg-[#B27300]" },
  pending: { label: "Pendente", chip: "border-[#B9B2A4] bg-[#F6F3EE] text-[#0F1A2E]/55", dot: "bg-[#B9B2A4]" },
  suspended: { label: "Suspensa", chip: "border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] text-[#FF3B1F]", dot: "bg-[#FF3B1F]" },
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

function StatusChip({ meta }: { meta: { label: string; chip: string; dot: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
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

export function InstitutionsList({ institutions, isAdmin, total }: { institutions: InstitutionAdminRowUI[]; isAdmin: boolean; total?: number }) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | InstitutionType>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | InstitutionStatus>("all");
  const [verifFilter, setVerifFilter] = React.useState<"all" | InstitutionVerification>("all");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 12 });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const stats = React.useMemo(() => {
    const out = { total: institutions.length, active: 0, verified: 0, membersAll: 0, verifiedMembers: 0 };
    for (const it of institutions) {
      if (it.status === "active") out.active++;
      if (it.verificationStatus === "verified") out.verified++;
      out.membersAll += it.membersCount;
      out.verifiedMembers += it.verifiedMembersCount;
    }
    return out;
  }, [institutions]);

  const columns = React.useMemo<ColumnDef<InstitutionAdminRowUI, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (it) => it.name,
        header: "Instituição",
        cell: ({ row }) => {
          const it = row.original;
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-[10px] font-black text-[#0F1A2E]">
                {it.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.logoUrl} alt="" className="size-full object-cover" />
                ) : (
                  it.name.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <Link href={`/dashboard/institutions/${it.id}`} className="block truncate text-sm font-semibold text-[#0F1A2E] hover:underline">
                  {it.name}
                </Link>
                <span className="block truncate text-xs text-[#0F1A2E]/45">{it.slug}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "organizationType",
        accessorFn: (it) => institutionTypeLabels[it.organizationType],
        header: "Tipo",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-[#0F1A2E]/70">{institutionTypeLabels[row.original.organizationType]}</span>
        ),
      },
      {
        id: "status",
        accessorFn: (it) => it.status,
        header: "Estado",
        cell: ({ row }) => <StatusChip meta={STATUS_META[row.original.status]} />,
      },
      {
        id: "verificationStatus",
        accessorFn: (it) => it.verificationStatus,
        header: "Verificação",
        cell: ({ row }) => <StatusChip meta={VERIF_META[row.original.verificationStatus]} />,
      },
      {
        id: "members",
        header: "Membresias",
        cell: ({ row }) => {
          const it = row.original;
          return (
            <div className="whitespace-nowrap">
              <span className="block text-sm font-semibold text-[#0F1A2E]">{it.membersCount}</span>
              <span className={`block text-[10px] ${it.verifiedMembersCount > 0 ? "text-[#0B5E56]" : "text-[#0F1A2E]/40"}`}>
                {it.verifiedMembersCount} ✓
              </span>
            </div>
          );
        },
      },
      {
        id: "location",
        accessorFn: (it) => [it.province, it.city].filter(Boolean).join(" · "),
        header: "Localização",
        cell: ({ row }) => {
          const loc = [row.original.province, row.original.city].filter(Boolean).join(" · ");
          return <span className="text-sm text-[#0F1A2E]/70">{loc || "—"}</span>;
        },
      },
      {
        id: "createdAt",
        accessorFn: (it) => it.createdAt,
        header: "Criada",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[11px] text-[#0F1A2E]/55">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Acções</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RowActions institution={row.original} isAdmin={isAdmin} busy={busy} onAction={runAction} />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, isAdmin],
  );

  const table = useReactTable({
    data: institutions,
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
      const hay = [it.name, it.slug, it.province, it.city, institutionTypeLabels[it.organizationType]].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(String(value).toLowerCase());
    },
  });

  const filtered = React.useMemo(() => {
    let rows = table.getSortedRowModel().rows;
    if (typeFilter !== "all") rows = rows.filter((r) => r.original.organizationType === typeFilter);
    if (statusFilter !== "all") rows = rows.filter((r) => r.original.status === statusFilter);
    if (verifFilter !== "all") rows = rows.filter((r) => r.original.verificationStatus === verifFilter);
    return rows;
  }, [table, typeFilter, statusFilter, verifFilter]);

  const pageRows = filtered.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  const activeFilterCount = (globalFilter.trim() ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (verifFilter !== "all" ? 1 : 0);
  const truncated = typeof total === "number" && total > institutions.length;

  function resetPage() {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  function clearFilters() {
    setGlobalFilter("");
    setTypeFilter("all");
    setStatusFilter("all");
    setVerifFilter("all");
    resetPage();
  }

  async function runAction(action: "verify" | "unverify", institution: InstitutionAdminRowUI) {
    setBusy(institution.id);
    setError(null);
    try {
      const res = action === "verify" ? await verifyAdminInstitution(institution.id) : await unverifyAdminInstitution(institution.id);
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
    <div className="space-y-5">
      <section aria-label="Resumo de instituições">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <Eyebrow>Panorama do directório</Eyebrow>
          <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/35 sm:block">
            Membresias e verificação de identidade institucional
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatCard label="Instituições" value={stats.total} caption="Registadas no directório" accent="navy" />
          <StatCard label="Activas" value={stats.active} caption="Publicadas publicamente" accent="teal" />
          <StatCard label="Verificadas" value={stats.verified} caption="Identidade confirmada" accent="amber" />
          <StatCard label="Membresias" value={stats.membersAll} caption={`${stats.verifiedMembers} verificadas`} accent="vermilion" />
        </div>
      </section>

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
              placeholder="Pesquisar por nome, slug, localização…"
              className="h-10 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] pl-10 pr-3 text-sm text-[#0F1A2E] outline-none transition placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as "all" | InstitutionType);
              resetPage();
            }}
            className="h-10 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            aria-label="Filtrar por tipo"
          >
            <option value="all">Tipo: todos</option>
            {INSTITUTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {institutionTypeLabels[t]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | InstitutionStatus);
              resetPage();
            }}
            className="h-10 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            aria-label="Filtrar por estado"
          >
            <option value="all">Estado: todos</option>
            <option value="active">Activas</option>
            <option value="draft">Rascunhos</option>
            <option value="suspended">Suspensas</option>
          </select>
          <select
            value={verifFilter}
            onChange={(e) => {
              setVerifFilter(e.target.value as "all" | InstitutionVerification);
              resetPage();
            }}
            className="h-10 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            aria-label="Filtrar por verificação"
          >
            <option value="all">Verificação: todas</option>
            <option value="verified">Verificadas</option>
            <option value="in_review">Em revisão</option>
            <option value="pending">Pendentes</option>
          </select>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] px-3.5 py-2.5 text-sm text-[#FF3B1F]">{error}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm text-[#0F1A2E]/55">
          <span className="font-mono font-bold text-[#0F1A2E]/80">{filtered.length.toLocaleString("pt-PT")}</span>{" "}
          {filtered.length === 1 ? "instituição" : "instituições"}
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

      <div className="hidden overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
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

      <div className="space-y-3 lg:hidden">
        {pageRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D9D2C2] bg-white py-16">
            <EmptyState filtered={activeFilterCount > 0} />
          </div>
        ) : (
          pageRows.map((row) => {
            const it = row.original;
            return (
              <article key={it.id} className="rounded-2xl border border-[#D9D2C2] bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-[11px] font-black text-[#0F1A2E]">
                    {it.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.logoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      it.name.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/institutions/${it.id}`} className="block truncate text-sm font-semibold text-[#0F1A2E] hover:underline">
                      {it.name}
                    </Link>
                    <p className="truncate text-xs text-[#0F1A2E]/45">{institutionTypeLabels[it.organizationType]}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusChip meta={STATUS_META[it.status]} />
                      <StatusChip meta={VERIF_META[it.verificationStatus]} />
                    </div>
                  </div>
                  <RowActions institution={it} isAdmin={isAdmin} busy={busy} onAction={runAction} />
                </div>
              </article>
            );
          })
        )}
      </div>

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
  institution,
  isAdmin,
  busy,
  onAction,
}: {
  institution: InstitutionAdminRowUI;
  isAdmin: boolean;
  busy: string | null;
  onAction: (action: "verify" | "unverify", institution: InstitutionAdminRowUI) => void;
}) {
  if (!isAdmin) return <span className="text-xs text-[#0F1A2E]/35">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        title="Ver detalhes"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9D2C2] bg-white text-[#0F1A2E]/55 transition hover:border-[#0B5E56]/40 hover:text-[#0B5E56]"
        aria-label="Ver detalhes"
      >
        <Link href={`/dashboard/institutions/${institution.id}`} className="flex size-full items-center justify-center">
          <Building2 className="size-4" />
        </Link>
      </button>
      {institution.verificationStatus === "verified" ? (
        <button
          type="button"
          title="Anular verificação"
          disabled={busy === institution.id}
          onClick={() => onAction("unverify", institution)}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9D2C2] bg-white text-[#0F1A2E]/55 transition hover:border-[#B27300]/40 hover:text-[#B27300] disabled:opacity-50"
          aria-label="Anular verificação"
        >
          <ShieldOff className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          title="Verificar instituição"
          disabled={busy === institution.id}
          onClick={() => onAction("verify", institution)}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9D2C2] bg-white text-[#0F1A2E]/55 transition hover:border-[#0B5E56]/40 hover:text-[#0B5E56] disabled:opacity-50"
          aria-label="Verificar instituição"
        >
          <ShieldCheck className="size-4" />
        </button>
      )}
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
        {filtered ? "Nada corresponde aos filtros" : "Ainda não há instituições"}
      </p>
      <p className="max-w-xs text-xs text-[#0F1A2E]/45">
        {filtered
          ? "Ajusta a pesquisa ou limpa os filtros para veres todas as instituições."
          : "Cria a primeira instituição para começar a estruturar o directório."}
      </p>
    </div>
  );
}