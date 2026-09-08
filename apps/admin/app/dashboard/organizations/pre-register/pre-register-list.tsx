"use client";

import * as React from "react";
import Link from "next/link";
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
  BellRingIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  CopyIcon,
  EditIcon,
  Inbox,
  Link2,
  LinkIcon,
  Mail,
  MoreHorizontalIcon,
  Phone,
  Search,
  TrashIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@workspace/ui/components/dropdown-menu";
import { regeneratePreRegisterToken, deletePreRegister, resendPreRegisterNotification } from "@/app/actions/admin";
import type { PreRegisterListItem } from "./page";

const DISPLAY_FONT = "var(--font-display)";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">{children}</p>;
}

const STATUS_META = {
  active: { label: "Convite activo", dot: "bg-[#0B5E56]", chip: "border-[#0B5E56]/25 bg-[#0B5E56]/[0.06] text-[#0B5E56]" },
  none: { label: "Sem convite", dot: "bg-[#C9C2B4]", chip: "border-[#D9D2C2] bg-[#F6F3EE] text-[#0F1A2E]/55" },
} as const;

type LinkStatus = keyof typeof STATUS_META;

function getLinkStatus(o: PreRegisterListItem): LinkStatus {
  if (!o.completionUrl) return "none";
  return "active";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" });
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
  accent: "teal" | "navy" | "vermilion";
}) {
  const dot =
    accent === "teal"
      ? "bg-[#0B5E56]"
      : accent === "navy"
        ? "bg-[#0F1A2E]"
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

export function PreRegisterList({ items, isAdmin, total }: { items: PreRegisterListItem[]; isAdmin: boolean; total?: number }) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "preRegisteredAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<LinkStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 12 });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const o of items) for (const c of o.categorySlugs ?? []) set.add(c);
    return [...set].sort();
  }, [items]);

  const stats = React.useMemo(() => {
    const total = items.length;
    let active = 0;
    let none = 0;
    let noContact = 0;
    let withEmail = 0;
    let withPhone = 0;
    for (const o of items) {
      const s = getLinkStatus(o);
      if (s === "active") active++;
      else none++;
      if (!o.contactPhone && !o.contactEmail) noContact++;
      if (o.contactEmail) withEmail++;
      if (o.contactPhone) withPhone++;
    }
    return { total, active, none, noContact, withEmail, withPhone };
  }, [items]);

  const columns = React.useMemo<ColumnDef<PreRegisterListItem>[]>(
    () => [
      {
        id: "company",
        accessorFn: (o) => o.name,
        header: "Empresa",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.logoUrl ? (
              <Image
                src={row.original.logoUrl}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-lg border border-[#D9D2C2] object-cover"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0F1A2E] font-mono text-[11px] font-bold text-white">
                {row.original.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[#0F1A2E]">{row.original.name}</span>
              <span className="block truncate font-mono text-[11px] text-[#0F1A2E]/40">{row.original.slug}</span>
            </div>
          </div>
        ),
      },
      {
        id: "categories",
        header: "Categorias",
        cell: ({ row }) => {
          const cats = row.original.categorySlugs ?? [];
          if (cats.length === 0) return <span className="text-[#0F1A2E]/40">—</span>;
          return (
            <div className="flex max-w-[200px] flex-wrap gap-1">
              {cats.slice(0, 3).map((c) => (
                <span
                  key={c}
                  className="rounded-md border border-[#D9D2C2] bg-[#F6F3EE] px-1.5 py-0.5 font-mono text-[10px] text-[#0F1A2E]/60"
                >
                  {c}
                </span>
              ))}
              {cats.length > 3 && <span className="px-1 font-mono text-[10px] text-[#0F1A2E]/40">+{cats.length - 3}</span>}
            </div>
          );
        },
      },
      {
        id: "contact",
        header: "Contacto",
        cell: ({ row }) => {
          const o = row.original;
          return (
            <div className="min-w-0 space-y-0.5 text-xs text-[#0F1A2E]/60">
              {o.contactName && <span className="block font-medium text-[#0F1A2E]/80">{o.contactName}</span>}
              {o.contactPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3 text-[#0B5E56]" />
                  {o.contactPhone}
                </span>
              )}
              {o.contactEmail && (
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3 text-[#0B5E56]" />
                  <span className="truncate">{o.contactEmail}</span>
                </span>
              )}
              {!o.contactName && !o.contactPhone && !o.contactEmail && <span className="text-[#0F1A2E]/40">Sem contacto</span>}
            </div>
          );
        },
      },
      {
        id: "promoter",
        accessorFn: (o) => o.promoterEmail,
        header: "Registada por",
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-[#0F1A2E]/50">{row.original.promoterEmail ?? "—"}</span>
        ),
      },
      {
        id: "status",
        accessorFn: (o) => getLinkStatus(o),
        header: "Convite",
        cell: ({ row }) => {
          const meta = STATUS_META[getLinkStatus(row.original)];
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}>
              <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
              {meta.label}
            </span>
          );
        },
      },
      {
        id: "preRegisteredAt",
        accessorFn: (o) => o.preRegisteredAt ?? o.createdAt,
        header: "Registado",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[11px] text-[#0F1A2E]/55">
            {formatDate(row.original.preRegisteredAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Acções</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RowActions
              item={row.original}
              isAdmin={isAdmin}
              busy={busy}
              copied={copied}
              onCopy={copyLink}
              onRegenerate={regenerate}
              onResend={resend}
              onRemove={remove}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, copied, isAdmin],
  );

  const table = useReactTable({
    data: items,
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
      const o = row.original;
      const hay = [
        o.name,
        o.slug,
        o.contactName,
        o.contactPhone,
        o.contactEmail,
        o.promoterEmail,
        o.formattedAddress,
        ...(o.categorySlugs ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(String(value).toLowerCase());
    },
  });

  const filtered =
    statusFilter === "all" && categoryFilter === "all"
      ? table.getSortedRowModel().rows
      : table.getSortedRowModel().rows.filter((row) => {
          const o = row.original;
          if (statusFilter !== "all" && getLinkStatus(o) !== statusFilter) return false;
          if (categoryFilter !== "all" && !(o.categorySlugs ?? []).includes(categoryFilter)) return false;
          return true;
        });

  const pageRows = filtered.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));

  function resetPage() {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  async function regenerate(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await regeneratePreRegisterToken(id);
      if (!res.success) setError(res.error?.message ?? "Falha ao gerar novo link");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar novo link");
    } finally {
      setBusy(null);
    }
  }

  async function resend(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await resendPreRegisterNotification(id);
      if (!res.success) setError(res.error?.message ?? "Falha ao reenviar notificação");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao reenviar notificação");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminar este pré-registo? A empresa será removida e deixará de ser notificada.")) return;
    setBusy(id);
    setError(null);
    try {
      const res = await deletePreRegister(id);
      if (!res.success) setError(res.error?.message ?? "Falha ao eliminar pré-registo");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao eliminar pré-registo");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  const activeFilters =
    (statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0) + (globalFilter.trim() ? 1 : 0);

  const truncated = typeof total === "number" && total > items.length;

  function clearFilters() {
    setGlobalFilter("");
    setStatusFilter("all");
    setCategoryFilter("all");
    resetPage();
  }

  return (
    <div className="space-y-5">
      {/* Stats band — pipeline de conversão dos pré-registos */}
      <section aria-label="Resumo do pré-registo">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <Eyebrow>Pipeline</Eyebrow>
          <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/35 sm:block">
            Do primeiro contacto ao registo completo
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          <StatCard
            label="Registos"
            value={stats.total}
            caption={`${stats.withEmail} com email · ${stats.withPhone} com telefone`}
            accent="navy"
          />
          <StatCard
            label="Convite activo"
            value={stats.active}
            caption="Link válido, sem expiração"
            accent="teal"
          />
          <StatCard
            label="Sem convite"
            value={stats.none}
            caption="Ainda não foi gerado o link"
            accent="vermilion"
          />
        </div>
      </section>

      {/* Toolbar: pesquisa + filtros */}
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
              placeholder="Pesquisar por empresa, contacto, cidade ou categoria…"
              className="h-10 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] pl-10 pr-3 text-sm text-[#0F1A2E] outline-none transition placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as LinkStatus | "all");
                resetPage();
              }}
              className="h-10 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
              aria-label="Filtrar por estado do convite"
            >
              <option value="all">Todos os convites</option>
              <option value="active">Convite activo</option>
              <option value="none">Sem convite</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                resetPage();
              }}
              className="h-10 max-w-[180px] rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 text-sm text-[#0F1A2E] outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
              aria-label="Filtrar por categoria"
            >
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-[#FF3B1F]/25 bg-[#FF3B1F]/[0.06] px-3.5 py-2.5 text-sm text-[#FF3B1F]">{error}</div>
      )}

      {/* Barra de estado dos resultados */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm text-[#0F1A2E]/55">
          <span className="font-mono font-bold text-[#0F1A2E]/80">{filtered.length.toLocaleString("pt-PT")}</span>{" "}
          {filtered.length === 1 ? "pré-registo" : "pré-registos"}
          {activeFilters > 0 && " · filtrado"}
          {truncated && !activeFilters && (
            <span className="ml-1 text-xs text-[#B27300]/80">dos {total!.toLocaleString("pt-PT")} mais recentes</span>
          )}
        </p>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0B5E56] hover:underline"
          >
            Limpar filtros ({activeFilters})
          </button>
        )}
      </div>

      {/* Tabela (desktop) */}
      <div className="hidden overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
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
                    <EmptyState filtered={activeFilters > 0} />
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
            <EmptyState filtered={activeFilters > 0} />
          </div>
        ) : (
          pageRows.map((row) => {
            const o = row.original;
            const status = getLinkStatus(o);
            const meta = STATUS_META[status];
            return (
              <article key={o.id} className="rounded-2xl border border-[#D9D2C2] bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {o.logoUrl ? (
                    <Image src={o.logoUrl} alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg border border-[#D9D2C2] object-cover" />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0F1A2E] font-mono text-xs font-bold text-white">
                      {o.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0F1A2E]">{o.name}</p>
                    <p className="truncate font-mono text-[11px] text-[#0F1A2E]/40">{o.slug}</p>
                    <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}>
                      <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
                      {meta.label}
                    </span>
                  </div>
                  <RowActions
                    item={o}
                    isAdmin={isAdmin}
                    busy={busy}
                    copied={copied}
                    onCopy={copyLink}
                    onRegenerate={regenerate}
                    onResend={resend}
                    onRemove={remove}
                  />
                </div>

                <dl className="mt-3 space-y-1.5 border-t border-[#D9D2C2]/60 pt-3 text-xs text-[#0F1A2E]/60">
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F1A2E]/40">Contacto</dt>
                    <dd className="min-w-0">
                      {o.contactName && <span className="block">{o.contactName}</span>}
                      {o.contactPhone && <span className="block">{o.contactPhone}</span>}
                      {o.contactEmail && <span className="block truncate">{o.contactEmail}</span>}
                      {!o.contactName && !o.contactPhone && !o.contactEmail && <span>Sem contacto</span>}
                    </dd>
                  </div>
                  {(o.categorySlugs ?? []).length > 0 && (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F1A2E]/40">Categorias</dt>
                      <dd className="flex flex-wrap gap-1">
                        {(o.categorySlugs ?? []).map((c) => (
                          <span key={c} className="rounded-md border border-[#D9D2C2] bg-[#F6F3EE] px-1.5 py-0.5 font-mono text-[10px] text-[#0F1A2E]/60">
                            {c}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F1A2E]/40">Registada</dt>
                    <dd>
                      {formatDate(o.preRegisteredAt)}
                      {o.promoterEmail ? ` · por ${o.promoterEmail}` : ""}
                    </dd>
                  </div>
                </dl>

                {o.completionUrl && (
                  <button
                    type="button"
                    onClick={() => void copyLink(o.completionUrl!, o.id)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#0B5E56]/25 bg-[#0B5E56]/[0.05] px-3 py-2 text-xs font-medium text-[#0B5E56] transition hover:bg-[#0B5E56]/[0.1]"
                  >
                    {copied === o.id ? (
                      <>
                        <Check className="size-3.5" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Link2 className="size-3.5" /> Copiar link de convite
                      </>
                    )}
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Paginação */}
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
  item,
  isAdmin,
  busy,
  copied,
  onCopy,
  onRegenerate,
  onResend,
  onRemove,
}: {
  item: PreRegisterListItem;
  isAdmin: boolean;
  busy: string | null;
  copied: string | null;
  onCopy: (url: string, id: string) => void;
  onRegenerate: (id: string) => void;
  onResend: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={busy === item.id}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9D2C2] bg-white text-[#0F1A2E]/55 transition hover:bg-[#F6F3EE] hover:text-[#0F1A2E] disabled:opacity-50"
            aria-label={`Ações de ${item.name}`}
          >
            <MoreHorizontalIcon className="size-4" />
          </button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{item.name}</DropdownMenuLabel>
        </DropdownMenuGroup>
        {item.completionUrl && (
          <DropdownMenuItem onClick={() => void onCopy(item.completionUrl!, item.id)}>
            <CopyIcon /> {copied === item.id ? "Copiado!" : "Copiar link"}
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem onClick={() => void onRegenerate(item.id)}>
            <LinkIcon /> Novo link
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem onClick={() => void onResend(item.id)}>
            <BellRingIcon /> Reenviar notificação
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem render={<Link href={`/dashboard/organizations/pre-register/${item.id}/edit`} />}>
            <EditIcon /> Editar
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void onRemove(item.id)} disabled={busy === item.id}>
              <TrashIcon /> Eliminar
            </DropdownMenuItem>
          </>
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
      <p className="text-sm font-medium text-[#0F1A2E]/70">{filtered ? "Nada corresponde aos filtros" : "Ainda não há empresas pré-registadas"}</p>
      <p className="max-w-xs text-xs text-[#0F1A2E]/45">
        {filtered
          ? "Ajusta a pesquisa ou limpa os filtros para veres todos os registos."
          : "Reúne empresas num evento (ex: FACIM) e cria o primeiro pré-registo para gerar o convite."}
      </p>
    </div>
  );
}
