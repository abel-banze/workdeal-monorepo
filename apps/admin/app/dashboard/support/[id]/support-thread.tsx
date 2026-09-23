"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { replySupportTicket, setSupportTicketStatus, type AdminTicketMessage } from "@/app/actions/support";

const STATUS_ACTIONS = [
  { key: "in_progress", label: "Assumir" },
  { key: "waiting_user", label: "Pedir resposta" },
  { key: "resolved", label: "Resolver" },
  { key: "closed", label: "Fechar" },
] as const;

export function SupportThread({
  ticketId,
  initialStatus,
  initialMessages,
}: {
  ticketId: string;
  initialStatus: string;
  initialMessages: AdminTicketMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (busy || reply.trim().length === 0) return;
    setBusy(true);
    try {
      const res = await replySupportTicket(ticketId, reply.trim(), internal);
      const msg = (res.data ?? null) as AdminTicketMessage | null;
      if (msg) setMessages((prev) => [...prev, { ...msg, senderName: msg.senderName ?? "Equipa" }]);
      setReply("");
      toast.success(internal ? "Nota interna guardada." : "Resposta enviada — utilizador notificado.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao responder.");
    } finally {
      setBusy(false);
    }
  }

  async function onStatus(next: string) {
    setBusy(true);
    try {
      await setSupportTicketStatus(ticketId, next);
      setStatus(next);
      toast.success("Estado actualizado.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao actualizar estado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-2xl border px-4 py-3 ${m.isInternal ? "border-dashed border-[#FF3B1F]/40 bg-[#FFF1EF]" : "border-[#D9D2C2] bg-white"}`}>
            <p className="flex flex-wrap items-baseline gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/45">
              <span>{m.senderName ?? "Equipa"}</span>
              {m.isInternal ? <span className="text-[#FF3B1F]">· nota interna</span> : null}
              <span className="ml-auto">{new Date(m.createdAt).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}</span>
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#0F1A2E]/85">{m.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={onReply} className="rounded-2xl border border-[#D9D2C2] bg-white p-4">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Responder ao utilizador…"
          rows={3}
          aria-label="Responder"
          className="w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-sm text-[#0F1A2E] outline-none focus:border-[#0B5E56]"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#0F1A2E]/70">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="size-4 accent-[#FF3B1F]" />
            Nota interna (o utilizador não vê)
          </label>
          <button type="submit" disabled={busy || reply.trim().length === 0} className="ml-auto rounded-full bg-[#0F1A2E] px-5 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-50">
            {busy ? "A enviar…" : "Responder"}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {STATUS_ACTIONS.filter((a) => a.key !== status).map((a) => (
          <button
            key={a.key}
            type="button"
            disabled={busy}
            onClick={() => void onStatus(a.key)}
            className="rounded-full border border-[#D9D2C2] bg-white px-4 py-1.5 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE] disabled:opacity-50"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
