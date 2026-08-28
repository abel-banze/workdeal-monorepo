"use client"

import { useState } from "react"
import { missingVerificationDocuments, verificationDocumentLabel, type VerificationDocumentInput } from "@workdeal/shared"
import { requestVerification } from "@/app/actions/verifications"
import { VerificationDocuments } from "@/components/features/verification-documents"

export function VerificationForm({ profileId, hasPending }: { profileId: string; hasPending: boolean }) {
  const [docs, setDocs] = useState<VerificationDocumentInput[]>([])
  const [level, setLevel] = useState<"level1" | "level2">("level1")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasPending) {
      setError("Já existe pedido pendente/em análise.")
      return
    }
    const missing = missingVerificationDocuments(docs, level)
    if (missing.length > 0) {
      setError(`Anexa os documentos obrigatórios: ${missing.map((t) => verificationDocumentLabel(t)).join(", ")}`)
      return
    }
    setLoading(true)
    setError(null)
    setMsg(null)
    try {
      await requestVerification({ profileId, documents: docs, level })
      setMsg(`Pedido enviado. A equipa Workdeal analisa em 24–48h úteis.`)
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : "Falha ao pedir verificação")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
      <h2 className="text-sm font-black text-[#0F1A2E]">Pedir verificação de identidade</h2>
      <p className="mt-1 text-xs text-[#0F1A2E]/60">Anexa os documentos de registo legal e a validação é feita pela equipa Workdeal. Contactos com OTP verificado têm prioridade.</p>

      <div className="mt-4 space-y-1.5">
        <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Nível de verificação</label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setLevel("level1")}
            className={`rounded-xl border p-3 text-left transition ${level === "level1" ? "border-[#0B5E56] bg-[#0B5E56]/5" : "border-[#D9D2C2] bg-white"}`}
          >
            <span className="block text-sm font-bold text-[#0F1A2E]">1º grau — Verificado</span>
            <span className="mt-0.5 block text-xs leading-snug text-[#0F1A2E]/55">Exige os documentos marcados como obrigatórios.</span>
          </button>
          <button
            type="button"
            onClick={() => setLevel("level2")}
            className={`rounded-xl border p-3 text-left transition ${level === "level2" ? "border-[#1F5C99] bg-[#1F5C99]/5" : "border-[#D9D2C2] bg-white"}`}
          >
            <span className="block text-sm font-bold text-[#0F1A2E]">2º grau — Em legalização</span>
            <span className="mt-0.5 block text-xs leading-snug text-[#0F1A2E]/55">Ainda em processo — anexa o que já tens.</span>
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Documentos</label>
        <div className="mt-1.5">
          <VerificationDocuments value={docs} onChange={setDocs} disabled={loading} />
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs font-medium text-[#7A1A0A]">{error}</p>}
      {msg && <p className="mt-3 rounded-lg border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-3 py-2 text-xs font-medium text-[#0B5E56]">{msg}</p>}
      <button type="submit" disabled={loading || hasPending} className="mt-4 inline-flex rounded-full bg-[#0F1A2E] px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50">
        {loading ? "A enviar…" : hasPending ? "Aguarda análise" : "Pedir verificação"}
      </button>
    </form>
  )
}