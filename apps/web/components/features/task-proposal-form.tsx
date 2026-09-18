"use client"

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { submitProposal, type SendableProfile } from "@/app/actions/tasks";
import { draftProposalAction } from "@/app/actions/agents";

export function TaskProposalForm({
  taskId,
  aiEnabled = false,
  profiles = [],
}: {
  taskId: string;
  aiEnabled?: boolean;
  profiles?: SendableProfile[];
}) {
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Sem auto-submit: a proposta só é enviada no clique explícito em
  // "Enviar proposta". Enter nos campos de valor/prazo não submete.
  function blockEnterSubmit(e: React.KeyboardEvent) {
    if (e.key === "Enter") e.preventDefault();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId) {
      toast.error("Escolhe o perfil com que queres enviar a proposta.");
      return;
    }
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
      await submitProposal({ taskId, providerProfileId: profileId, message, priceMzn, estimatedDays });
      toast.success("Proposta enviada com sucesso.");
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar a proposta.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAiDraft() {
    const priceMzn = price.trim() === "" ? null : Number(price);
    const estimatedDays = days.trim() === "" ? null : Number(days);
    setAiBusy(true);
    try {
      const res = await draftProposalAction({ taskId, priceMzn, estimatedDays, providerProfileId: profileId || undefined });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const draft = res.data.message;
      if (draft) {
        setMessage(draft);
        toast.success("Rascunho gerado — revê antes de enviar.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar o rascunho.");
    } finally {
      setAiBusy(false);
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

  if (profiles.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-[#D9D2C2] bg-white px-5 py-6 text-center">
        <p className="text-sm font-black text-[#0F1A2E]">Precisas de um perfil para propor</p>
        <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/60">
          Cria o teu perfil (pessoal ou de empresa) para enviares propostas a esta tarefa.
        </p>
        <Link
          href="/dashboard"
          className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-[#0F1A2E] px-5 text-xs font-bold text-white hover:bg-black transition-colors"
        >
          Criar perfil
        </Link>
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
        <label htmlFor="prop-profile" className="mb-1 block text-xs font-bold text-[#0F1A2E]/70">
          Enviar como
        </label>
        {profiles.length > 1 ? (
          <select
            id="prop-profile"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm font-semibold text-[#0F1A2E] outline-none focus:border-[#0B5E56]"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.kind === "personal" ? "· pessoal" : "· empresa"}
              </option>
            ))}
          </select>
        ) : (
          <p className="w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm font-semibold text-[#0F1A2E]">
            {profiles[0]?.name}
          </p>
        )}
        <p className="mt-1 text-[11px] text-[#0F1A2E]/45">O solicitante vê a identidade do perfil que propõe.</p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="prop-message" className="block text-xs font-bold text-[#0F1A2E]/70">
            Mensagem <span className="text-[#FF3B1F]">*</span>
          </label>
          {aiEnabled && (
            <button
              type="button"
              onClick={handleAiDraft}
              disabled={aiBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0B5E56]/25 bg-[#0B5E56]/5 px-3 py-1 text-[11px] font-bold text-[#0B5E56] hover:bg-[#0B5E56]/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ✦ {aiBusy ? "A gerar…" : "Gerar rascunho com IA"}
            </button>
          )}
        </div>
        <textarea
          id="prop-message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Como resolves este pedido? Experiência, prazos e método."
          className="w-full resize-none rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm outline-none focus:border-[#0B5E56]"
        />
        <p className="mt-1 text-[11px] text-[#0F1A2E]/45">Mínimo 20 caracteres. Não incluas telefone, email ou links — são bloqueados automaticamente.</p>
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
            onKeyDown={blockEnterSubmit}
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
            onKeyDown={blockEnterSubmit}
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