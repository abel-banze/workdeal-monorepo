import Link from "next/link";
import { listSupportTickets, type AdminTicketItem } from "@/app/actions/support";
import { requireSystemRole } from "@/lib/auth";

export const metadata = {
  title: "Suporte | Workdeal Admin",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-[#FF3B1F] text-white",
  in_progress: "bg-[#0F1A2E] text-white",
  waiting_user: "bg-[#F6F3EE] text-[#0F1A2E] border border-[#D9D2C2]",
  resolved: "bg-[#0B5E56] text-white",
  closed: "bg-[#6B7280] text-white",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em atendimento",
  waiting_user: "A aguardar user",
  resolved: "Resolvido",
  closed: "Fechado",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function SupportInboxPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireSystemRole("moderator", "admin");
  const { status, page: pageParam } = await searchParams;
  const allowed = Object.keys(STATUS_LABELS);
  const activeStatus = status && allowed.includes(status) ? status : undefined;
  const page = Math.max(1, Number(pageParam) || 1);

  let tickets: AdminTicketItem[] = [];
  let total = 0;
  let error: string | null = null;
  try {
    const res = await listSupportTickets({ status: activeStatus, page });
    tickets = res.data ?? [];
    total = typeof res.meta?.total === "number" ? (res.meta.total as number) : tickets.length;
  } catch (e) {
    error = e instanceof Error ? e.message : "Falha ao carregar tickets.";
  }

  const qs = (s?: string, p?: number) => {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (p && p > 1) params.set("page", String(p));
    const str = params.toString();
    return `/dashboard/support${str ? `?${str}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
          Ajuda · Pedidos dos utilizadores
        </p>
        <h1
          className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Suporte
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
          {total} pedido{total === 1 ? "" : "s"} · responde na thread; a resposta notifica o utilizador por inbox e email.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[#D9D2C2] bg-white p-1.5">
        <Link
          href={qs(undefined, 1)}
          aria-current={!activeStatus ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${!activeStatus ? "bg-[#0F1A2E] text-white" : "text-[#0F1A2E]/60 hover:bg-[#F6F3EE]"}`}
        >
          Todos
        </Link>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={qs(key, 1)}
            aria-current={activeStatus === key ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${activeStatus === key ? "bg-[#0F1A2E] text-white" : "text-[#0F1A2E]/60 hover:bg-[#F6F3EE]"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#FF3B1F]/20 bg-[#FFF1EF] px-5 py-4 text-sm font-semibold text-[#7A1A0A]">
          {error}
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D9D2C2] bg-white px-5 py-10 text-center text-sm text-[#0F1A2E]/50">
          Sem pedidos neste estado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white">
          <ul className="divide-y divide-[#D9D2C2]/60">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/dashboard/support/${t.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-[#F6F3EE]/60">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-[#0F1A2E]">{t.subject}</span>
                    <span className="mt-0.5 block truncate text-xs text-[#0F1A2E]/55">
                      {t.userName ?? t.userEmail ?? "Utilizador"} {t.orgName ? `· ${t.orgName}` : ""} · {t.messageCount} msgs · {fmtDate(t.updatedAt)}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[t.status] ?? "bg-[#F6F3EE] text-[#0F1A2E]"}`}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {total > page * 25 ? (
        <div className="flex justify-end">
          <Link href={qs(activeStatus, page + 1)} className="rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE]">
            Seguinte →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
