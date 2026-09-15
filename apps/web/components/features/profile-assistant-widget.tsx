"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FiMessageCircle, FiX, FiBookmark, FiCheck } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { authClient } from "@/lib/auth-client";
import { chatWithCompanyAssistant } from "@/app/actions/agents";
import { toggleProfileBookmark } from "@/app/actions/bookmarks";
import { QuoteDialog } from "./profile-quote-dialog";

type Suggest = "none" | "quote" | "whatsapp" | "bookmark";

type Turn = { role: "user" | "assistant"; content: string; suggest: Suggest };

type Props = {
  slug: string;
  profileId: string;
  profileName: string;
  profileEmail: string | null;
  whatsapp: string | null;
};

export function ProfileAssistantWidget({ slug, profileId, profileName, profileEmail, whatsapp }: Props) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  // Padrão = anónimo, visível logo no SSR. O efeito abaixo apenas actualiza
  // para autenticado quando (e se) a sessão resolver — nunca deixa a UI refém
  // do ciclo `authClient.getSession()` quando ele atrasa ou falha.
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sess = await authClient.getSession();
        if (!cancelled) setAuthed(!!sess?.data?.user);
      } catch {
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // scroll to bottom when new turn appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, busy]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", content: message, suggest: "none" }]);
    setBusy(true);
    try {
      const res = await chatWithCompanyAssistant({ message }, slug);
      setTurns((t) => [...t, {
        role: "assistant",
        content: res.data?.reply ?? "Sem resposta.",
        suggest: res.data?.suggest ?? "none",
      }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao contactar o assistente.");
    } finally {
      setBusy(false);
    }
  }, [input, busy, slug]);

  const handleBookmark = useCallback(async () => {
    if (bookmarking) return;
    setBookmarking(true);
    const res = await toggleProfileBookmark(profileId);
    setBookmarking(false);
    if (!res.ok) {
      setBookmarked(false);
      toast.error(res.error ?? "Falha ao guardar perfil.");
    }
  }, [bookmarking, profileId]);

  const handleLogin = useCallback(() => { router.push("/login"); }, [router]);

  if (authed === null) return null;

  // ─── Anonymous: small floating icon that redirects to login ───
  if (!authed) {
    return (
      <button
        type="button"
        onClick={handleLogin}
        aria-label="Faça login para usar o assistente"
        title="Assistente da empresa"
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#0B5E56] text-white shadow-[0_8px_24px_rgba(11,94,86,0.35)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/30"
      >
        <FiMessageCircle className="size-6" aria-hidden />
      </button>
    );
  }

  // ─── Authenticated: floating button + expandable chat panel ───
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="flex w-[360px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-[22px] border border-[#D9D2C2] bg-white shadow-[0_20px_48px_rgba(15,26,46,0.22)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D9D2C2] bg-[#0F1A2E] px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#0B5E56] text-white" aria-hidden>
                <FiMessageCircle className="size-4" />
              </span>
              <div>
                <p className="text-[13px] font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
                  {profileName}
                </p>
                <p className="text-[11px] text-white/55">Assistente da empresa (IA)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar chat"
            >
              <FiX className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto p-4">
            {turns.length === 0 && (
              <p className="px-1 py-8 text-center text-[13px] text-[#0F1A2E]/45">
                Pergunta sobre a empresa — serviços, experiência, contactos ou mais. As respostas são geradas por IA e podem não estar 100% correctas.
              </p>
            )}
            {turns.map((t, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      t.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[#0F1A2E] px-3.5 py-2 text-[13px] leading-relaxed text-white"
                        : "max-w-[85%] rounded-2xl rounded-bl-sm border border-[#D9D2C2] bg-white px-3.5 py-2 text-[13px] leading-relaxed text-[#0F1A2E]"
                    }
                  >
                    <p className="whitespace-pre-wrap">{t.content}</p>
                  </div>
                </div>
                {/* Suggest actions */}
                {t.role === "assistant" && t.suggest !== "none" && (
                  <div className="flex justify-start pl-1">
                    {t.suggest === "quote" && (
                      <QuoteDialog
                        targetProfileId={profileId}
                        profileName={profileName}
                        profileEmail={profileEmail}
                        serviceLabel="Pedido de orçamento"
                        trigger={
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#0B5E56]/20 bg-[#0B5E56]/5 px-3 py-1.5 text-[12px] font-bold text-[#0B5E56] transition hover:bg-[#0B5E56]/10"
                          >
                            Pedir orçamento
                          </button>
                        }
                      />
                    )}
                    {t.suggest === "whatsapp" && (
                      <a
                        href={whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#0B5E56]/20 bg-[#0B5E56]/5 px-3 py-1.5 text-[12px] font-bold text-[#0B5E56] transition hover:bg-[#0B5E56]/10"
                      >
                        <FaWhatsapp className="size-3.5" aria-hidden />
                        Contactar agora
                      </a>
                    )}
                    {t.suggest === "bookmark" && (
                      <button
                        type="button"
                        disabled={bookmarked || bookmarking}
                        onClick={() => void handleBookmark()}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition ${
                          bookmarked
                            ? "border-[#0B5E56]/20 bg-[#0B5E56]/10 text-[#0B5E56]"
                            : "border-[#0F1A2E]/10 bg-[#0F1A2E]/5 text-[#0F1A2E]/70 hover:bg-[#0F1A2E]/10"
                        }`}
                      >
                        {bookmarked ? <FiCheck className="size-3" aria-hidden /> : <FiBookmark className="size-3" aria-hidden />}
                        {bookmarked ? "Guardado" : "Guardar perfil"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-[#D9D2C2] bg-white px-3.5 py-2 text-[13px] text-[#0F1A2E]/55">
                  A pensar…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-[#D9D2C2] bg-[#F6F3EE]/70 p-3">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunta sobre a empresa…"
              className="min-h-10 flex-1 resize-none rounded-xl border border-[#D9D2C2] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#0B5E56]"
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
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#0B5E56] px-4 text-[13px] font-bold text-white transition hover:bg-[#094d46] disabled:cursor-not-allowed disabled:bg-[#D9D2C2]"
            >
              {busy ? "…" : "Enviar"}
            </button>
          </form>
        </div>
      )}

      {/* FAB toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar chat" : "Abrir assistente da empresa"}
        title="Assistente da empresa"
        className="flex size-14 items-center justify-center rounded-full bg-[#0B5E56] text-white shadow-[0_8px_24px_rgba(11,94,86,0.35)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/30"
      >
        {open ? <FiX className="size-6" aria-hidden /> : <FiMessageCircle className="size-6" aria-hidden />}
      </button>
    </div>
  );
}
