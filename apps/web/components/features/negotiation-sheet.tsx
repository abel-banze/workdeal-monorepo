"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiRefreshCw, FiSend } from "react-icons/fi";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { getNegotiation, listNegotiationMessages, openThread, sendNegotiationMessage } from "@/app/actions/negotiations";

type Message = {
  id: string;
  senderSide: "requester" | "provider" | string;
  kind: "text" | "offer" | "system" | string;
  body: string | null;
  priceMzn: number | null;
  estimatedDays: number | null;
  createdAt: string | Date;
};

type Thread = { id: string; status: "open" | "closed" | string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string | null;
  providerName: string | null;
  taskTitle: string;
  /** Lado de quem vê: solicitante (mesa de decisão) ou proponente (oportunidades). */
  viewerSide?: "requester" | "provider";
};

function fmtDate(v: string | Date): string {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" });
}

/** Chat de negociação de uma proposta — vive em sheet para não perder o contexto de decisão. */
export function NegotiationSheet({ open, onOpenChange, proposalId, providerName, taskTitle, viewerSide = "requester" }: Props) {
  const counterpart = viewerSide === "requester" ? (providerName ?? "Fornecedor") : "Solicitante";
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "offer">("text");
  const [body, setBody] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (id: string) => {
    const res = (await getNegotiation(id)) as unknown as {
      data: { thread: Thread; messages: Message[] } | null;
    };
    if (res.data) {
      setThread(res.data.thread);
      setMessages(res.data.messages ?? []);
    }
  }, []);

  // Abre (ou retoma) a thread ao abrir a sheet.
  useEffect(() => {
    if (!open || !proposalId) return;
    let cancelled = false;
    openThread({ proposalId })
      .then((res) => {
        if (cancelled) return;
        const data = (res as unknown as { data: { thread: Thread; messages: Message[] } }).data;
        setThread(data.thread);
        setMessages(data.messages ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao abrir a negociação.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, proposalId]);

  // Actualização periódica enquanto a sheet está aberta.
  useEffect(() => {
    if (!open || !thread || thread.status !== "open") return;
    const id = window.setInterval(() => {
      load(thread.id).catch(() => {});
    }, 15000);
    return () => window.clearInterval(id);
  }, [open, thread, load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function handleRefresh() {
    if (!thread) return;
    setRefreshing(true);
    try {
      await load(thread.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao actualizar.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!thread || sending) return;
    setError(null);
    if (mode === "text") {
      if (!body.trim()) return;
    } else {
      const p = Number.parseInt(price, 10);
      if (!Number.isFinite(p) || p < 0) {
        setError("Indica o valor da contraproposta.");
        return;
      }
    }
    setSending(true);
    try {
      if (mode === "text") {
        await sendNegotiationMessage(thread.id, { kind: "text", body: body.trim() });
      } else {
        const p = Number.parseInt(price, 10);
        const d = days.trim() === "" ? undefined : Number.parseInt(days, 10);
        await sendNegotiationMessage(thread.id, {
          kind: "offer",
          body: body.trim(),
          priceMzn: p,
          ...(d != null && Number.isFinite(d) ? { estimatedDays: d } : {}),
        });
      }
      setBody("");
      setPrice("");
      setDays("");
      setMode("text");
      const res = (await listNegotiationMessages(thread.id, { limit: 100 })) as unknown as {
        data: { items: Message[] } | Message[] | null;
      };
      const items = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setMessages(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar.");
    } finally {
      setSending(false);
    }
  }

  const closed = thread?.status === "closed";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[94vw] flex-col bg-white p-0 sm:max-w-md">
        <SheetHeader className="border-b border-[#D9D2C2] px-5 pb-4 pt-6 text-left">
          <SheetTitle className="text-base font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            Negociar com {viewerSide === "requester" ? (providerName ?? "fornecedor") : "o solicitante"}
          </SheetTitle>
          <SheetDescription className="mt-0.5 truncate text-xs text-[#0F1A2E]/55">
            {taskTitle}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center p-8 text-xs text-[#0F1A2E]/50">A abrir a conversa…</div>
        ) : error && !thread ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm font-black text-[#0F1A2E]">Não foi possível abrir a negociação</p>
            <p className="text-xs text-[#0F1A2E]/55">{error}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[#D9D2C2] bg-[#F6F3EE]/60 px-5 py-2">
              <span className="rounded-full bg-[#0F1A2E] px-2.5 py-0.5 text-[11px] font-bold text-white">
                {closed ? "Encerrada" : "Em negociação"}
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D2C2] bg-white px-3 py-1 text-[11px] font-bold text-[#0F1A2E]/70 hover:bg-[#F6F3EE] disabled:opacity-50"
              >
                <FiRefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
                Actualizar
              </button>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <p className="rounded-xl border border-dashed border-[#D9D2C2] bg-[#F6F3EE] p-4 text-center text-xs leading-relaxed text-[#0F1A2E]/55">
                  Inicia a conversa — propõe ajustes de preço, prazo ou âmbito. Contactos directos são bloqueados por segurança.
                </p>
              )}
              {messages.map((m) => {
                if (m.kind === "system") {
                  return (
                    <p key={m.id} className="text-center font-mono text-[11px] text-[#0F1A2E]/40">
                      {m.body} · {fmtDate(m.createdAt)}
                    </p>
                  );
                }
                const mine = m.senderSide === viewerSide;
                return (
                  <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        mine
                          ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[#0F1A2E] px-3.5 py-2.5 text-white"
                          : "max-w-[85%] rounded-2xl rounded-bl-sm border border-[#D9D2C2] bg-white px-3.5 py-2.5"
                      }
                    >
                      {m.kind === "offer" && m.priceMzn != null && (
                        <p className={`text-base font-black tabular-nums ${mine ? "text-white" : "text-[#0B5E56]"}`}>
                          {m.priceMzn.toLocaleString("pt-MZ")} MZN
                          {m.estimatedDays != null && (
                            <span className={`ml-2 align-middle text-[11px] font-semibold ${mine ? "text-white/70" : "text-[#0F1A2E]/55"}`}>
                              · ~{m.estimatedDays} dias
                            </span>
                          )}
                        </p>
                      )}
                      {!!m.body && (
                        <p className={`whitespace-pre-wrap text-[13px] leading-relaxed ${mine ? "text-white/90" : "text-[#0F1A2E]/80"}`}>
                          {m.body}
                        </p>
                      )}
                      <p className={`mt-1 font-mono text-[10px] ${mine ? "text-white/50" : "text-[#0F1A2E]/40"}`}>
                        {mine ? "Tu" : counterpart} · {fmtDate(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="mx-5 mb-2 rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs text-[#7A1A0A]">
                {error}
              </p>
            )}

            {closed ? (
              <p className="border-t border-[#D9D2C2] bg-[#F6F3EE] px-5 py-4 text-center text-xs text-[#0F1A2E]/55">
                Negociação encerrada — já não é possível enviar mensagens.
              </p>
            ) : (
              <form onSubmit={handleSend} className="space-y-2 border-t border-[#D9D2C2] bg-[#F6F3EE]/60 p-4">
                <div className="flex gap-1.5">
                  {(["text", "offer"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMode(t)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                        mode === t ? "bg-[#0F1A2E] text-white" : "border border-[#D9D2C2] bg-white text-[#0F1A2E]/60 hover:bg-white"
                      }`}
                    >
                      {t === "text" ? "Mensagem" : "Contraproposta"}
                    </button>
                  ))}
                </div>
                {mode === "offer" && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      type="number"
                      min={0}
                      placeholder="Valor (MZN) *"
                      className="rounded-xl border border-[#D9D2C2] bg-white px-3 py-2 text-sm tabular-nums text-[#0F1A2E] outline-none focus:border-[#0B5E56]"
                    />
                    <input
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      type="number"
                      min={1}
                      placeholder="Prazo (dias)"
                      className="rounded-xl border border-[#D9D2C2] bg-white px-3 py-2 text-sm tabular-nums text-[#0F1A2E] outline-none focus:border-[#0B5E56]"
                    />
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={2}
                    placeholder={mode === "offer" ? "Nota da contraproposta (opcional)…" : "Escreve a mensagem…"}
                    className="min-h-10 flex-1 resize-none rounded-xl border border-[#D9D2C2] bg-white px-3 py-2.5 text-sm text-[#0F1A2E] outline-none focus:border-[#0B5E56]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    aria-label="Enviar"
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-white transition-colors hover:bg-[#094d47] disabled:opacity-50"
                  >
                    <FiSend className="size-4" aria-hidden />
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
