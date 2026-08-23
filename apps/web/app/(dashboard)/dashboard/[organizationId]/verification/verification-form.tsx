"use client"

import { useState } from "react"
import { requestVerification } from "@/app/actions/verifications"

export function VerificationForm({ profileId, hasPending }: { profileId: string; hasPending: boolean }) {
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasPending) {
      setError("Já existe pedido pendente/em análise.")
      return
    }
    setLoading(true)
    setError(null)
    setMsg(null)
    try {
      const docs = note.trim() ? [{ type: "note", url: note.trim() }] : [{ type: "pending", note: "Solicitação via painel" }]
      await requestVerification({ profileId, documents: docs })
      setMsg("Pedido enviado. Resposta em 24–48h úteis.")
      setNote("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao pedir verificação")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
      <h2 className="text-sm font-black text-[#0F1A2E]">Pedir verificação</h2>
      <p className="mt-1 text-xs text-[#0F1A2E]/60">Anexa NUIT/alvará ou link Drive na nota. Contactos com OTP verificado têm prioridade.</p>
      <div className="mt-3 space-y-1.5">
        <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Nota / link do documento (opcional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: NUIT, alvará ou https://drive.google.com/..." className="w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15" />
      </div>
      {error && <p className="mt-3 rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs font-medium text-[#7A1A0A]">{error}</p>}
      {msg && <p className="mt-3 rounded-lg border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-3 py-2 text-xs font-medium text-[#0B5E56]">{msg}</p>}
      <button type="submit" disabled={loading || hasPending} className="mt-4 inline-flex rounded-full bg-[#0F1A2E] px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50">
        {loading ? "A enviar…" : hasPending ? "Aguarda análise" : "Pedir verificação"}
      </button>
    </form>
  )
}
