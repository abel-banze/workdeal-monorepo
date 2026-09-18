"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FiSend } from "react-icons/fi";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { chatWithAssistant } from "@/app/actions/agents";
import { composeFollowUp, withTaskContext, type AgentHistoryTurn, type AgentTaskRef } from "@/components/layout/agent-prompt";
import { MarkdownMessage } from "./markdown-message";

type Turn = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Resume as propostas por preço e prazo.",
  "Que proposta tem melhor relação preço/prazo?",
  "Ajuda-me a escrever a mensagem de adjudicação.",
];

/** Agente comercial da tarefa: botão flutuante que abre o chat em sheet. */
export function TaskAgentSheet({ organizationId, taskRef }: { organizationId: string | null; taskRef?: AgentTaskRef | null }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, busy, open]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", content: text }]);
    setBusy(true);
    try {
      const pairs: AgentHistoryTurn[] = [];
      for (let i = 0; i + 1 < turns.length; i += 2) {
        const qTurn = turns[i];
        const aTurn = turns[i + 1];
        if (qTurn?.role === "user" && aTurn?.role === "assistant") {
          pairs.push({ question: qTurn.content, answer: aTurn.content });
        }
      }
      const contextual = pairs.length > 0 ? composeFollowUp(pairs, text) : text;
      const res = await chatWithAssistant({ message: withTaskContext(contextual, taskRef ?? null), organizationId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTurns((t) => [...t, { role: "assistant", content: res.data.reply ?? "Sem resposta." }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao contactar o assistente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir assistente comercial"
        title="Assistente comercial (IA)"
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-[#0F1A2E] px-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(15,26,46,0.35)] transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/40"
      >
        <span aria-hidden className="text-base leading-none text-[#7FD1C0]">
          ✦
        </span>
        Assistente
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-[94vw] flex-col bg-white p-0 sm:max-w-md">
          <SheetHeader className="border-b border-[#D9D2C2] px-5 pb-4 pt-6 text-left">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="flex size-9 items-center justify-center rounded-xl bg-[#0B5E56] text-lg leading-none text-white">
                ✦
              </span>
              <div>
                <SheetTitle className="text-base font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                  Assistente comercial
                </SheetTitle>
                <SheetDescription className="text-xs text-[#0F1A2E]/55">
                  Apoio à decisão — compara, resume e redige.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="rounded-xl border border-dashed border-[#D9D2C2] bg-[#F6F3EE] p-4 text-center text-xs leading-relaxed text-[#0F1A2E]/55">
                  Pergunta sobre as propostas desta tarefa. As respostas são rascunhos para reveres.
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="block w-full rounded-xl border border-[#D9D2C2] bg-white px-3 py-2 text-left text-xs font-semibold text-[#0B5E56] hover:bg-[#0B5E56]/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    t.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[#0F1A2E] px-3.5 py-2 text-[13px] leading-relaxed text-white"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm border border-[#D9D2C2] bg-[#F6F3EE] px-3.5 py-2 text-[#0F1A2E]"
                  }
                >
                  {t.role === "user" ? (
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{t.content}</p>
                  ) : (
                    <MarkdownMessage content={t.content} />
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-[#D9D2C2] bg-white px-3.5 py-2 text-xs text-[#0F1A2E]/55">
                  A pensar…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2 border-t border-[#D9D2C2] bg-[#F6F3EE]/60 p-4"
          >
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: qual a proposta mais barata?"
              aria-label="Mensagem para o assistente"
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
              disabled={busy || !input.trim()}
              aria-label="Enviar"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-white transition-colors hover:bg-[#094d47] disabled:opacity-50"
            >
              <FiSend className="size-4" aria-hidden />
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
