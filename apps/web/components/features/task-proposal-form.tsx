"use client"

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { submitProposal } from "@/app/actions/tasks";

export function TaskProposalForm({ taskId }: { taskId: string }) {
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceMzn = price.trim() === "" ? null : Number(price);
    const estimatedDays = days.trim() === "" ? null : Number(days);
    if (priceMzn != null && (!Number.isFinite(priceMzn) || priceMzn < 0)) {
      toast.error("Indica um valor válido (MZN).");
      return;
    }
    if (estimatedDays != null && (!Number.isFinite(estimatedDays) || estimatedDays < 1)) {
      toast.error("Indica um número válido de dias.");
      return;
    }
    setBusy(true);
    try {
      await submitProposal({ taskId, message, priceMzn, estimatedDays });
      toast.success("Proposta enviada com sucesso.");
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar a proposta.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[20px] border border-[#0B5E56]/25 bg-[#0B5E56]/5 px-5 py-6 text-center">
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#0B5E56] text-white">✓</span>
        <p className="mt-3 text-sm font-black text-[#0F1A2E]">Proposta enviada</p>
        <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/60">
          O solicitante vai analisar as propostas. Acompanha o estado em{" "}
          <Link href="/dashboard" className="font-bold text-[#0B5E56] hover:underline">
            Oportunidades no painel
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-[20px] border border-[#D9D2C2] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-[#0F1A2E]">Enviar proposta</p>
        <span className="rounded-full bg-[#F6F3EE] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#0B5E56]">Provider</span>
      </div>

      <div>
        <label htmlFor="prop-message" className="mb-1 block text-xs font-bold text-[#0F1A2E]/70">
          Mensagem <span className="text-[#FF3B1F]">*</span>
        </label>
        <textarea
          id="prop-message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Como resolves este pedido? Experiência, prazos e método."
          className="w-full resize-none rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm outline-none focus:border-[#0B5E56]"
        />
        <p className="mt-1 text-[11px] text-[#0F1A2E]/45">Mínimo 20 caracteres.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="prop-price" className="mb-1 block text-xs font-bold text-[#0F1A2E]/70">
            Valor (MZN)
          </label>
          <input
            id="prop-price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ex: 25 000"
            className="w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm outline-none focus:border-[#0B5E56]"
          />
        </div>
        <div>
          <label htmlFor="prop-days" className="mb-1 block text-xs font-bold text-[#0F1A2E]/70">
            Prazo (dias)
          </label>
          <input
            id="prop-days"
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="Ex: 15"
            className="w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm outline-none focus:border-[#0B5E56]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={busy || message.trim().length < 20}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#0B5E56] px-6 text-sm font-bold text-white hover:bg-[#094d46] transition-colors disabled:cursor-not-allowed disabled:bg-[#D9D2C2]"
      >
        {busy ? "A enviar…" : "Enviar proposta"}
      </button>
      <p className="text-center text-[11px] text-[#0F1A2E]/45">Em simulacro: propostas revistas pelo solicitante no painel.</p>
    </form>
  );
}