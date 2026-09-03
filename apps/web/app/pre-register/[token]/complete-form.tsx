"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient, fetchJwtToken } from "@/lib/auth-client";
import { claimPreRegister } from "@/app/actions/pre-register";
import { isValidMzPhone } from "@workdeal/shared/lib/phone";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";

// Estilo consistente com o fluxo de autenticação (login/signup/onboarding).
const inputCls =
  "w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] leading-none text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15";
const labelCls = "text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase";
const ctaCls =
  "inline-flex w-full items-center justify-center rounded-full bg-[#0F1A2E] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(15,26,46,0.18)] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";
const errorCls =
  "rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3.5 py-2.5 text-sm font-medium text-[#7A1A0A]";

export function CompleteForm({
  token,
  companyName,
  prefilledName,
  prefilledPhone,
  isLoggedIn,
}: {
  token: string;
  companyName: string;
  prefilledName: string | null;
  prefilledPhone: string | null;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  // O contacto pode estar guardado com um telefone no lugar do nome (pre-registo
  // manual). Nunca pré-preenche o campo "nome" com um número — só com um nome real.
  const initialName = prefilledName && !isValidMzPhone(prefilledName) ? prefilledName : "";
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(prefilledPhone ?? "");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function claimAndRedirect(): Promise<boolean> {
    const res = await claimPreRegister(token);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    // Redireciona para onboarding com a organização pré-seleccionada
    router.push(`/onboarding?orgId=${encodeURIComponent(res.organizationId)}`);
    router.refresh();
    return true;
  }

  async function handleClaimOnly() {
    setLoading(true);
    setError(null);
    await claimAndRedirect();
    setLoading(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptedTerms) {
      setError("Tem de aceitar os Termos e a Política de Privacidade para criar a conta.");
      return;
    }
    setLoading(true);
    try {
      const res = await authClient.signUp.email({ name, email, password, phone } as any);
      if (res.error) throw new Error(res.error.message ?? "Falha ao criar conta");
      await fetchJwtToken();
      await claimAndRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar conta");
      setLoading(false);
    }
  }

  if (isLoggedIn) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#0B5E56]/15 bg-[#EAF4F2] px-4 py-3.5">
          <p className="text-sm leading-relaxed text-[#0B5E56]">
            A sua sessão está activa. Confirme que é a pessoa responsável por{" "}
            <span className="font-bold">{companyName}</span> para assumir o perfil e avançar para o registo.
          </p>
        </div>
        {error && <div role="alert" className={errorCls}>{error}</div>}
        <button type="button" onClick={handleClaimOnly} disabled={loading} className={ctaCls}>
          {loading ? "A confirmar…" : `Assumir registo de ${companyName}`}
        </button>
        <p className="text-center text-xs text-[#0F1A2E]/45">
          Ao confirmar, passa a ser responsável por esta empresa na plataforma.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      <div className="space-y-1.5">
        <label htmlFor="name" className={labelCls}>NOME COMPLETO</label>
        <input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="O seu nome" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className={labelCls}>EMAIL</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.co.mz" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className={labelCls}>TELEMOVEL</label>
        <input id="phone" type="tel" autoComplete="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="84 123 4567" className={inputCls} />
        <p className="text-xs text-[#0F1A2E]/40">Usado para contacto e verificação. Número moçambicano.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className={labelCls}>PALAVRA-PASSE</label>
        <input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className={inputCls} />
        <p className="text-xs text-[#0F1A2E]/40">Mínimo 8 caracteres. Use uma combinação segura.</p>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE]/60 px-3 py-2.5">
        <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} aria-invalid={!acceptedTerms}
          className="mt-0.5 border-[#0F1A2E]/20 data-[checked]:border-[#0B5E56] data-[checked]:bg-[#0B5E56]" />
        <Label htmlFor="terms" className="cursor-pointer text-xs font-normal leading-relaxed text-[#0F1A2E]/70">
          Li e aceito os{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">Termos e Condições</Link>{" "}
          e a{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">Política de Privacidade</Link>.
        </Label>
      </div>

      {error && <div role="alert" className={errorCls}>{error}</div>}

      <button
        type="submit"
        disabled={loading || !acceptedTerms}
        aria-disabled={loading || !acceptedTerms}
        className={ctaCls}
      >
        {loading ? "A criar conta…" : "Criar conta e assumir a empresa"}
      </button>

      <p className="text-center text-xs text-[#0F1A2E]/45">
        Já tem conta?{" "}
        <Link href="/login" className="font-bold text-[#0B5E56] hover:text-[#0F1A2E]">
          Entrar →
        </Link>{" "}
        e volte depois a este link.
      </p>
    </form>
  );
}