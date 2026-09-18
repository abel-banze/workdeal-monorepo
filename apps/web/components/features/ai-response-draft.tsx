"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { draftResponseAction } from "@/app/actions/agents"

type ContextType = "quote" | "opportunity" | "contact"

const CONTEXT_LABELS: Record<ContextType, string> = {
  quote: "Pedido de orçamento",
  opportunity: "Oportunidade / concurso",
  contact: "Contacto genérico",
}

export function AiResponseDraft({ organizationId, trigger, defaultContextType = "quote" }: { organizationId: string | null; trigger: React.ReactElement; defaultContextType?: ContextType }) {
  const [contextType, setContextType] = useState<ContextType>(defaultContextType)
  const [subject, setSubject] = useState("")
  const [detail, setDetail] = useState("")
  const [fromName, setFromName] = useState("")
  const [fromOrganization, setFromOrganization] = useState("")
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)

  async function handleGenerate() {
    if (!subject.trim()) {
      toast.error("Indica o assunto do pedido.")
      return
    }
    setBusy(true)
    try {
      const res = await draftResponseAction({
        contextType,
        subject: subject.trim(),
        detail: detail.trim() || null,
        fromName: fromName.trim() || null,
        fromOrganization: fromOrganization.trim() || null,
        organizationId,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setDraft(res.data.message ?? null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar a resposta.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerar resposta com IA</DialogTitle>
          <DialogDescription>
            Preenche o contexto do pedido e obtém um rascunho de resposta para reveres. Nada é enviado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-[#0F1A2E]/70">Tipo de contexto</label>
            <select
              value={contextType}
              onChange={(e) => setContextType(e.target.value as ContextType)}
              className="w-full rounded-xl border border-[#D9D2C2] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B5E56]"
            >
              {Object.entries(CONTEXT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#0F1A2E]/70">
              Assunto <span className="text-[#FF3B1F]">*</span>
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Pedido de orçamento para construção de muro"
              className="w-full rounded-xl border border-[#D9D2C2] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B5E56]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#0F1A2E]/70">Detalhes do pedido</label>
            <textarea
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Cola aqui a mensagem original do cliente (opcional)."
              className="w-full resize-none rounded-xl border border-[#D9D2C2] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B5E56]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#0F1A2E]/70">Nome do cliente</label>
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Ex: Ana Mondlane"
                className="w-full rounded-xl border border-[#D9D2C2] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B5E56]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#0F1A2E]/70">Empresa do cliente</label>
              <input
                value={fromOrganization}
                onChange={(e) => setFromOrganization(e.target.value)}
                placeholder="Ex: Construções XYZ"
                className="w-full rounded-xl border border-[#D9D2C2] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B5E56]"
              />
            </div>
          </div>

          <Button type="button" onClick={handleGenerate} disabled={busy || !subject.trim()} className="w-full">
            {busy ? "A gerar…" : "✦ Gerar rascunho"}
          </Button>

          {draft && (
            <div className="rounded-[16px] border border-[#0B5E56]/25 bg-[#0B5E56]/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0B5E56]">Rascunho gerado</p>
                <button
                  onClick={() => navigator.clipboard?.writeText(draft).then(() => toast.success("Copiado para o clipboard."))}
                  className="rounded-full border border-[#0B5E56]/25 px-2.5 py-1 text-[11px] font-bold text-[#0B5E56] hover:bg-[#0B5E56]/10"
                >
                  Copiar
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#0F1A2E]">{draft}</p>
              <p className="mt-2 text-[11px] text-[#0F1A2E]/45">Revê e ajusta antes de enviar ao cliente.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}