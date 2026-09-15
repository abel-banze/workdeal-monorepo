"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { BotIcon, SendIcon, Loader2Icon } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { chatWithAssistant } from "@/app/actions/agents"

type Turn = { role: "user" | "assistant"; content: string }

export function DashboardAgentButton() {
  const params = useParams() as Record<string, string | string[] | undefined>
  const organizationId = typeof params.organizationId === "string" ? params.organizationId : null

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
      const reply = res?.data?.reply ?? "Sem resposta por agora."
      setTurns((t) => [...t, { role: "assistant", content: reply }])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao contactar o agente.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex size-8 items-center justify-center rounded-full border border-[#D9D2C2] bg-white text-[#0F1A2E]/60 transition-colors hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/40"
        aria-label="Agente (AI)"
      >
        <BotIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[340px] rounded-2xl border-[#E4DED1]/80 bg-white p-0 shadow-lg">
        <div className="flex items-center gap-2 border-b border-[#E4DED1]/60 px-4 py-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-[#0B5E56] text-white">
            <BotIcon className="size-3.5" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0F1A2E]">Agente</p>
            <p className="text-[11px] text-[#0F1A2E]/55">Pergunta sobre o teu perfil, empregos e AI.</p>
          </div>
        </div>

        <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3">
          {turns.length === 0 && (
            <p className="px-1 py-2 text-xs text-[#0F1A2E]/45">
              Pergunta algo sobre o teu perfil, propostas ou o mercado. Respostas são apenas rascunhos para reveres.
            </p>
          )}
          {turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  t.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[#0F1A2E] px-3.5 py-2 text-[13px] leading-relaxed text-white"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm border border-[#D9D2C2] bg-[#F6F3EE] px-3.5 py-2 text-[13px] leading-relaxed text-[#0F1A2E]"
                }
              >
                <p className="whitespace-pre-wrap">{t.content}</p>
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-[#0F1A2E]/45">
              <Loader2Icon className="size-3.5 animate-spin" /> A pensar…
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-[#E4DED1]/60 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Como apresento a minha empresa a um novo cliente?"
            className="min-h-9 flex-1 rounded-full border border-[#D9D2C2] bg-white px-3.5 text-sm outline-none focus:border-[#0B5E56]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-white transition-colors hover:bg-[#094d47] disabled:cursor-not-allowed disabled:bg-[#D9D2C2]"
            aria-label="Enviar"
          >
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
          </button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
