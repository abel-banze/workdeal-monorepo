"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { BotIcon, SendIcon } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireDescription,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@workspace/ui/components/questionnaire"
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
import { chatWithAssistant } from "@/app/actions/agents"
import { MarkdownMessage } from "@/components/features/markdown-message"
import {
  composeFollowUp,
  composeGuidedPrompt,
  withTaskContext,
  type AgentHistoryTurn,
  type AgentIntent,
  type AgentTaskRef,
} from "./agent-prompt"

const INTENTS: { value: AgentIntent; title: string; hint: string }[] = [
  { value: "companies", title: "Encontrar empresas", hint: "Pesquisa no directório com dados reais" },
  { value: "opportunities", title: "Descobrir oportunidades", hint: "Tarefas abertas por área e província" },
  { value: "activity", title: "A minha actividade", hint: "Resumo das tuas tarefas e negociações" },
  { value: "free", title: "Pergunta livre", hint: "Escreve o que precisares" },
]

const TOTAL_STEPS = 3

export function DashboardAgentButton() {
  const params = useParams() as Record<string, string | string[] | undefined>
  const rawOrg = typeof params.organizationId === "string" ? params.organizationId : null
  const organizationId = rawOrg === "personal" ? null : rawOrg
  const routeTaskId = typeof params.taskId === "string" ? params.taskId : null
  const taskRef: AgentTaskRef | null = routeTaskId ? { id: routeTaskId } : null

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [intent, setIntent] = useState<AgentIntent>("companies")
  const [q, setQ] = useState("")
  const [province, setProvince] = useState("")
  const [history, setHistory] = useState<AgentHistoryTurn[]>([])
  const [followUp, setFollowUp] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [history, busy, open, step])

  async function ask(display: string, toSend?: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await chatWithAssistant({ message: withTaskContext(toSend ?? display, taskRef), organizationId })
      if (!res.ok) {
        setError(res.error)
        return
      }
      const reply = res.data.reply ?? "Sem resposta por agora."
      setHistory((h) => [...h, { question: display, answer: reply }])
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao contactar o agente.")
    } finally {
      setBusy(false)
    }
  }

  function handleGuidedSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (intent !== "activity" && intent !== "free" && !q.trim()) {
      setError("Descreve o que procuras para o assistente pesquisar.")
      return
    }
    if (intent === "free" && !q.trim()) {
      setError("Escreve a tua pergunta.")
      return
    }
    setError(null)
    const composed = composeGuidedPrompt(intent, { q, province })
    const label =
      intent === "activity"
        ? "Resume a minha actividade"
        : intent === "free"
          ? q.trim()
          : `${INTENTS.find((o) => o.value === intent)?.title ?? "Pesquisa"}: ${[q.trim(), province.trim()].filter(Boolean).join(" · ")}`;
    void ask(label, composed)
  }

  function handleFollowUp(e: React.FormEvent) {
    e.preventDefault()
    if (!followUp.trim() || busy) return
    const message = composeFollowUp(history, followUp)
    setFollowUp("")
    void ask(message)
  }

  function reset() {
    setStep(0)
    setIntent("companies")
    setQ("")
    setProvince("")
    setError(null)
  }

  const needsSlots = intent === "companies" || intent === "opportunities" || intent === "free"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir assistente (AI)"
        className="inline-flex size-8 items-center justify-center rounded-full border border-[#D9D2C2] bg-white text-[#0F1A2E]/60 transition-colors hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/40"
      >
        <BotIcon className="size-4" aria-hidden />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-[94vw] flex-col bg-white p-0 sm:max-w-md">
          <SheetHeader className="border-b border-[#D9D2C2] px-5 pb-4 pt-6 text-left">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#0B5E56] text-white">
                <BotIcon className="size-4" aria-hidden />
              </span>
              <div>
                <SheetTitle className="text-base font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                  Agente
                </SheetTitle>
                <SheetDescription className="text-xs text-[#0F1A2E]/55">
                  Guiado e com dados reais — director, tarefas e a tua actividade.
                </SheetDescription>
              </div>
            </div>
            <p className="mt-2 font-mono text-[11px] tabular-nums text-[#0F1A2E]/45">
              Passo {Math.min(step + 1, TOTAL_STEPS)} de {TOTAL_STEPS}
            </p>
          </SheetHeader>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <Questionnaire onSubmit={step === 1 ? handleGuidedSubmit : undefined} className="gap-0">
              {step === 0 && (
                <QuestionnaireItem className="gap-3 border-0 p-0">
                  <QuestionnaireTitle className="text-[15px] font-black text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                    Como posso ajudar?
                  </QuestionnaireTitle>
                  <QuestionnaireDescription>Escolhe um ponto de partida — o assistente usa dados reais.</QuestionnaireDescription>
                  <RadioGroup
                    value={intent}
                    onValueChange={(v) => setIntent(v as AgentIntent)}
                    aria-label="Intenção do assistente"
                    className="gap-2"
                  >
                    {INTENTS.map((opt) => (
                      <label
                        key={opt.value}
                        htmlFor={`agent-intent-${opt.value}`}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-colors hover:bg-[#F6F3EE] ${
                          intent === opt.value ? "border-[#0B5E56]/50 bg-[#0B5E56]/5" : "border-[#D9D2C2] bg-white"
                        }`}
                      >
                        <RadioGroupItem value={opt.value} id={`agent-intent-${opt.value}`} className="mt-1" />
                        <span>
                          <span className="block text-[13px] font-bold text-[#0F1A2E]">{opt.title}</span>
                          <span className="block text-xs text-[#0F1A2E]/55">{opt.hint}</span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                  <QuestionnaireActions>
                    <QuestionnaireNext type="button" onClick={() => setStep(1)} className="rounded-full bg-[#0F1A2E] text-white hover:bg-black">
                      Continuar
                    </QuestionnaireNext>
                  </QuestionnaireActions>
                </QuestionnaireItem>
              )}

              {step === 1 && (
                <QuestionnaireItem className="gap-3 border-0 p-0">
                  <QuestionnaireTitle className="text-[15px] font-black text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                    {intent === "free" ? "A tua pergunta" : intent === "activity" ? "Confirmar" : "Detalhes da pesquisa"}
                  </QuestionnaireTitle>
                  <QuestionnaireDescription>
                    {intent === "activity"
                      ? "Vou resumir as tuas tarefas, propostas e negociações com os números actuais."
                      : "Estes detalhes alimentam a pesquisa nas ferramentas do assistente."}
                  </QuestionnaireDescription>
                  {needsSlots && (
                    <>
                      <QuestionnaireInput
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={intent === "free" ? "Ex: como apresento a minha empresa?" : "Área, nome ou palavra-chave"}
                        aria-label={intent === "free" ? "Pergunta" : "Pesquisa"}
                        className="h-11 rounded-xl border-[#D9D2C2] bg-[#F6F3EE] text-sm outline-none placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white"
                      />
                      {(intent === "companies" || intent === "opportunities") && (
                        <QuestionnaireInput
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          placeholder="Província (opcional)"
                          aria-label="Província"
                          className="h-11 rounded-xl border-[#D9D2C2] bg-[#F6F3EE] text-sm outline-none placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white"
                        />
                      )}
                    </>
                  )}
                  {error && <p className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs text-[#7A1A0A]">{error}</p>}
                  <QuestionnaireActions>
                    <QuestionnairePrevious type="button" onClick={() => setStep(0)} className="rounded-full">
                      Voltar
                    </QuestionnairePrevious>
                    <QuestionnaireSubmit disabled={busy} className="rounded-full bg-[#0B5E56] text-white hover:bg-[#094d47] disabled:opacity-50">
                      {busy ? "A pesquisar…" : "Pedir ao assistente"}
                    </QuestionnaireSubmit>
                  </QuestionnaireActions>
                </QuestionnaireItem>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  {history.map((t, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-end">
                        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#0F1A2E] px-3.5 py-2 text-[13px] leading-relaxed text-white">
                          {t.question}
                        </p>
                      </div>
                      <div className="flex justify-start">
                        <div className="max-w-[95%] rounded-2xl rounded-bl-sm border border-[#D9D2C2] bg-[#F6F3EE] px-3.5 py-2 text-[#0F1A2E]">
                          <MarkdownMessage content={t.answer} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <p className="rounded-2xl rounded-bl-sm border border-[#D9D2C2] bg-white px-3.5 py-2 text-xs text-[#0F1A2E]/55">
                      A consultar os dados…
                    </p>
                  )}
                  {error && <p className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs text-[#7A1A0A]">{error}</p>}
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"
                  >
                    Nova pesquisa
                  </button>
                </div>
              )}
            </Questionnaire>
          </div>

          {step === 2 && (
            <form onSubmit={handleFollowUp} className="flex items-end gap-2 border-t border-[#D9D2C2] bg-[#F6F3EE]/60 p-4">
              <textarea
                rows={2}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Pergunta de seguimento…"
                aria-label="Pergunta de seguimento"
                className="min-h-10 flex-1 resize-none rounded-xl border border-[#D9D2C2] bg-white px-3 py-2.5 text-sm text-[#0F1A2E] outline-none focus:border-[#0B5E56]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    e.currentTarget.form?.requestSubmit()
                  }
                }}
              />
              <button
                type="submit"
                disabled={busy || !followUp.trim()}
                aria-label="Enviar"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-white transition-colors hover:bg-[#094d47] disabled:opacity-50"
              >
                <SendIcon className="size-4" aria-hidden />
              </button>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
