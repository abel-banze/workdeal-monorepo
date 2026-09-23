import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupportTicket } from "@/app/actions/support";
import { requireSystemRole } from "@/lib/auth";
import { SupportThread } from "./support-thread";

export const metadata = {
  title: "Pedido de suporte | Workdeal Admin",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em atendimento",
  waiting_user: "A aguardar user",
  resolved: "Resolvido",
  closed: "Fechado",
};

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSystemRole("moderator", "admin");
  const { id } = await params;

  let ticket = null;
  ticket = await getSupportTicket(id).then((res) => res.data ?? null).catch(() => null);
  if (!ticket) notFound();

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5">
      <Link href="/dashboard/support" className="text-xs font-bold text-[#0B5E56] hover:underline">
        ← Todos os pedidos
      </Link>
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
          Suporte · {ticket.userName ?? ticket.userEmail ?? "Utilizador"} {ticket.orgName ? `· ${ticket.orgName}` : ""}
        </p>
        <h1
          className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {ticket.subject}
        </h1>
        <p className="mt-1 text-xs text-[#0F1A2E]/55">
          Estado: <span className="font-bold text-[#0F1A2E]">{STATUS_LABELS[ticket.status] ?? ticket.status}</span> · aberto {new Date(ticket.createdAt).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}
        </p>
      </div>

      <SupportThread ticketId={ticket.id} initialStatus={ticket.status} initialMessages={ticket.messages ?? []} />
    </div>
  );
}
