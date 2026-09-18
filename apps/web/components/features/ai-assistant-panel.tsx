"use client"

import { useState } from "react"
import { toast } from "sonner"
import { chatWithAssistant } from "@/app/actions/agents"
import { MarkdownMessage } from "./markdown-message"

type Turn = { role: "user" | "assistant"; content: string }

export function AiAssistantPanel({ organizationId }: { organizationId: string | null }) {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const message = input.trim()
    if (!message || busy) return
    setInput("")
    setTurns((t) => [...t, { role: "user", content: message }])
    setBusy(true)
    try {
      const res = await chatWithAssistant({ message, organizationId })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const reply = res.data.reply ?? "Sem resposta."
      setTurns((t) => [...t, { role: "assistant", content: reply }])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao contactar o assistente.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#0B5E56] text-white">✦</span>
          <div>
            <h2 className="text-sm font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              Assistente Comercial
            </h2>
            <p className="text-[11px] text-[#0F1A2E]/50">Dúvidas de prospecção, apresentações e follow-ups.</p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-[#D9D2C2] px-3 py-1.5 text-[11px] font-bold text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"
        >
          {open ? "Fechar" : "Abrir chat"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-[16px] border border-[#D9D2C2] bg-[#F6F3EE] p-3">
            {turns.length === 0 && (
              <p className="px-1 py-6 text-center text-xs text-[#0F1A2E]/45">
                Pergunta algo sobre o teu perfil, propostas ou clientes. As respostas são apenas rascunhos para reveres.
              </p>
            )}
            {turns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    t.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[#0F1A2E] px-3.5 py-2 text-[13px] leading-relaxed text-white"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm border border-[#D9D2C2] bg-white px-3.5 py-2 text-[13px] leading-relaxed text-[#0F1A2E]"
                  }
                >
                  {t.role === "user" ? (
                    <p className="whitespace-pre-wrap">{t.content}</p>
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

          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Como apresento a minha empresa a um novo cliente?"
              className="min-h-10 flex-1 resize-none rounded-xl border border-[#D9D2C2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0B5E56]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#0B5E56] px-5 text-sm font-bold text-white hover:bg-[#094d46] transition-colors disabled:cursor-not-allowed disabled:bg-[#D9D2C2]"
            >
              {busy ? "…" : "Enviar"}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}