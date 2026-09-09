"use client";

import { useRef, useState } from "react";
import {
  missingVerificationDocuments,
  verificationDocumentLabel,
  VERIFICATION_TRUST_PAYMENT,
  type VerificationDocumentInput,
} from "@workdeal/shared";
import { requestVerification } from "@/app/actions/verifications";
import { VerificationDocuments } from "@/components/features/verification-documents";
import { uploadFilesAction } from "@/app/actions/files";

type PaymentProof = { fileId: string; url: string; name: string; reference: string };

const STEPS = [
  { id: 1, label: "Nível" },
  { id: 2, label: "Documentos" },
  { id: 3, label: "Pagamento" },
  { id: 4, label: "Rever" },
] as const;

const btnBase =
  "inline-flex items-center justify-center rounded-full text-sm font-bold transition disabled:opacity-50";

const stepBtn = (active: boolean, disabled: boolean) =>
  `${btnBase} px-5 py-2.5 ${
    active ? "bg-[#0F1A2E] text-white hover:bg-black" : "border border-[#D9D2C2] bg-white text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"
  } ${disabled ? "pointer-events-none opacity-40" : ""}`;

const uploadCls =
  "inline-flex items-center gap-1.5 rounded-full border border-[#0B5E56]/25 bg-white px-3 py-1.5 text-xs font-bold text-[#0B5E56] transition hover:bg-[#0B5E56]/5 disabled:opacity-50";

export function VerificationForm({ profileId, hasPending }: { profileId: string; hasPending: boolean }) {
  const [step, setStep] = useState(1);
  const [docs, setDocs] = useState<VerificationDocumentInput[]>([]);
  const [level, setLevel] = useState<"level1" | "level2">("level1");
  const [brNumber, setBrNumber] = useState("");
  const [proof, setProof] = useState<PaymentProof | null>(null);
  const [proofReference, setProofReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // ── Validação por passo ────────────────────────────────────────────────
  function next() {
    setError(null);
    if (step === 2) {
      const missing = missingVerificationDocuments(docs, level);
      if (missing.length > 0) {
        setError(`Anexa os documentos obrigatórios: ${missing.map((t) => verificationDocumentLabel(t)).join(", ")}`);
        return;
      }
    }
    if (step === 3 && !proof) {
      setError("Anexa o comprovativo de pagamento do plano Workdeal Trust.");
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  // ── Upload comprovativo ────────────────────────────────────────────────
  async function handleProof(file: File) {
    setUploadingProof(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file, file.name);
      fd.set("purpose", "verification");
      const res = await uploadFilesAction(fd);
      if (!res.ok || !res.file) {
        setError(res.error ?? "Falha ao carregar o comprovativo.");
        return;
      }
      setProof({
        fileId: res.file.id,
        url: res.file.url,
        name: res.file.originalFilename ?? file.name,
        reference: proofReference,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar o comprovativo.");
    } finally {
      setUploadingProof(false);
      if (proofInputRef.current) proofInputRef.current.value = "";
    }
  }

  function removeProof() {
    setProof(null);
    setProofReference("");
  }

  // ── Submissão ──────────────────────────────────────────────────────────
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasPending) {
      setError("Já existe pedido pendente/em análise.");
      return;
    }
    const missing = missingVerificationDocuments(docs, level);
    if (missing.length > 0) {
      setError(`Anexa os documentos obrigatórios: ${missing.map((t) => verificationDocumentLabel(t)).join(", ")}`);
      setStep(2);
      return;
    }
    if (!proof) {
      setError("Anexa o comprovativo de pagamento do plano Workdeal Trust.");
      setStep(3);
      return;
    }
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      await requestVerification({
        profileId,
        documents: docs,
        level,
        brNumber: brNumber || undefined,
        payment: { method: "bank_transfer", fileId: proof.fileId, url: proof.url, name: proof.name, reference: proof.reference },
      });
      setMsg("Pedido enviado. A equipa Workdeal analisa em 24–48h úteis.");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : "Falha ao pedir verificação");
    } finally {
      setLoading(false);
    }
  }

  // ── Derivados ──────────────────────────────────────────────────────────
  const levelLabel = (l: string) => (l === "level1" ? "1º grau — Verificado" : "2º grau — Em legalização");
  const docCount = docs.length;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (step === 4) void onSubmit(e); }} className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
      {/* Cabeçalho + stepper */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-[#0F1A2E]">Pedir verificação de identidade</h2>
          <p className="mt-0.5 text-xs text-[#0F1A2E]/60">Preencha os 4 passos para submeter o pedido.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STEPS.map((s) => (
            <span
              key={s.id}
              className={`inline-flex size-7 items-center justify-center rounded-full text-[11px] font-bold ${
                step === s.id ? "bg-[#0F1A2E] text-white" : step > s.id ? "bg-[#0B5E56]/15 text-[#0B5E56]" : "bg-[#F6F3EE] text-[#0F1A2E]/35"
              }`}
            >
              {step > s.id ? "✓" : s.id}
            </span>
          ))}
        </div>
      </div>

      {/* Passo 1 — Nível */}
      {step === 1 && (
        <div className="mt-5 space-y-3">
          <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Nível de verificação</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setLevel("level1")} className={`rounded-xl border p-3 text-left transition ${level === "level1" ? "border-[#0B5E56] bg-[#0B5E56]/5" : "border-[#D9D2C2] bg-white"}`}>
              <span className="block text-sm font-bold text-[#0F1A2E]">1º grau — Verificado</span>
              <span className="mt-0.5 block text-xs leading-snug text-[#0F1A2E]/55">Exige os documentos marcados como obrigatórios.</span>
            </button>
            <button type="button" onClick={() => setLevel("level2")} className={`rounded-xl border p-3 text-left transition ${level === "level2" ? "border-[#1F5C99] bg-[#1F5C99]/5" : "border-[#D9D2C2] bg-white"}`}>
              <span className="block text-sm font-bold text-[#0F1A2E]">2º grau — Em legalização</span>
              <span className="mt-0.5 block text-xs leading-snug text-[#0F1A2E]/55">Ainda em processo — anexa o que já tens.</span>
            </button>
          </div>
        </div>
      )}

      {/* Passo 2 — Documentos + BR */}
      {step === 2 && (
        <div className="mt-5 space-y-4">
          <VerificationDocuments value={docs} onChange={setDocs} disabled={loading} />

          <div className="space-y-1.5 rounded-2xl border border-[#0F1A2E]/10 bg-[#F6F3EE]/50 p-4">
            <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Estatutos / BR (Boletim da República)</label>
            <p className="text-xs text-[#0F1A2E]/50">Indica o número de publicação da empresa no Boletim da República, se disponível.</p>
            <input
              value={brNumber}
              onChange={(e) => setBrNumber(e.target.value)}
              placeholder="Ex.: BR 123/2026"
              className="mt-1 h-9 w-full rounded-md border border-[#D9D2C2] bg-white px-3 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/30"
            />
          </div>
        </div>
      )}

      {/* Passo 3 — Pagamento (Workdeal Trust / Millennium BIM) */}
      {step === 3 && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[#0B5E56]/25 bg-[#0B5E56]/[0.04] p-4">
            <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">PLANO {VERIFICATION_TRUST_PAYMENT.planName.toUpperCase()}</p>
            <p className="mt-1 text-sm text-[#0F1A2E]/70">
              A verificação de identidade está associada ao plano <span className="font-bold text-[#0F1A2E]">{VERIFICATION_TRUST_PAYMENT.planName}</span>. Faz a transferência para a conta abaixo e anexa o comprovativo.
            </p>
            <div className="mt-3 space-y-1 rounded-xl border border-[#D9D2C2] bg-white px-4 py-3 font-mono text-xs leading-relaxed text-[#0F1A2E]">
              <p>Banco: <span className="font-bold">{VERIFICATION_TRUST_PAYMENT.bankName}</span></p>
              <p>NIB: <span className="font-bold tracking-wide">{VERIFICATION_TRUST_PAYMENT.nib}</span></p>
              <p>Conta: <span className="font-bold">{VERIFICATION_TRUST_PAYMENT.accountNumber}</span></p>
            </div>
          </div>

          {/* Referência da transferência (opcional) */}
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Referência do pagamento (opcional)</label>
            <input
              value={proofReference}
              onChange={(e) => {
                setProofReference(e.target.value);
                if (proof) setProof((p) => (p ? { ...p, reference: e.target.value } : p));
              }}
              placeholder="Ex.: nome do titular, referência bancária"
              className="h-9 w-full rounded-md border border-[#D9D2C2] bg-white px-3 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/30"
            />
          </div>

          {/* Upload comprovativo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">
              Comprovativo de pagamento <span className="text-[#FF3B1F]">*</span>
            </label>
            <p className="text-xs text-[#0F1A2E]/50">PDF ou imagem, máx 10 MB.</p>
            {proof ? (
              <div className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition border-[#0B5E56]/30 bg-[#0B5E56]/[0.04]`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-white">✓</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#0F1A2E]">{proof.name || "Comprovativo anexado"}</p>
                    <p className="truncate text-xs text-[#0F1A2E]/55">
                      <a href={proof.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[#0B5E56] underline underline-offset-2 hover:text-[#0A4A44]">ver</a>
                    </p>
                  </div>
                </div>
                <button type="button" onClick={removeProof} disabled={loading} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0F1A2E]/55 ring-1 ring-[#D9D2C2] transition hover:bg-[#FF3B1F]/10 hover:text-[#7A1A0A] disabled:opacity-50" aria-label="Remover comprovativo">
                  ✕
                </button>
              </div>
            ) : (
              <>
                <input ref={proofInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" disabled={loading || uploadingProof} onChange={(e) => e.target.files?.[0] && void handleProof(e.target.files[0])} />
                <button type="button" onClick={() => proofInputRef.current?.click()} disabled={loading || uploadingProof} className={uploadCls}>
                  {uploadingProof ? "A carregar…" : "Anexar comprovativo"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Passo 4 — Rever e enviar */}
      {step === 4 && (
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase">Resumo do pedido</h3>
          <div className="space-y-2 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE]/50 p-4 text-sm">
            <Row label="Perfil" value={profileId.slice(0, 8) + "…"} />
            <Row label="Nível" value={levelLabel(level)} />
            <Row label="Documentos" value={docCount === 0 ? "Nenhum anexado" : `${docCount} documento${docCount !== 1 ? "s" : ""}`} />
            {brNumber && <Row label="N.º BR" value={brNumber} />}
            <Row label="Pagamento Trust" value={proof ? proof.name : "Sem comprovativo"} />
            {proof?.reference && <Row label="Referência pagamento" value={proof.reference} />}
          </div>
          <p className="text-xs text-[#0F1A2E]/50">A equipa Workdeal analisa em 24–48h úteis. Contactos verificados por OTP têm prioridade.</p>
        </div>
      )}

      {/* Erro / Sucesso */}
      {error && <p className="mt-4 rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs font-medium text-[#7A1A0A]">{error}</p>}
      {msg && <p className="mt-4 rounded-lg border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-3 py-2 text-xs font-medium text-[#0B5E56]">{msg}</p>}

      {/* Botões de navegação */}
      <div className="mt-5 flex items-center justify-between gap-2">
        {step > 1 && !msg ? (
          <button type="button" onClick={back} className={stepBtn(false, loading)}>
            Voltar
          </button>
        ) : (
          <span />
        )}
        {step < 4 && !msg ? (
          <button type="button" onClick={next} className={stepBtn(true, loading)}>
            Seguinte
          </button>
        ) : (
          !msg && (
            <button
              type="submit"
              disabled={loading || hasPending}
              className={stepBtn(true, loading || hasPending)}
            >
              {loading ? "A enviar…" : hasPending ? "Aguarda análise" : "Enviar pedido"}
            </button>
          )
        )}
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[#0F1A2E]/60">{label}</span>
      <span className="text-right text-[#0F1A2E]">{value}</span>
    </div>
  );
}