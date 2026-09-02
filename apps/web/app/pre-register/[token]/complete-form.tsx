"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient, fetchJwtToken } from "@/lib/auth-client";
import { claimPreRegister } from "@/app/actions/pre-register";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";

export function CompleteForm({
  token,
  companyName,
  prefilledName,
  isLoggedIn,
}: {
  token: string;
  companyName: string;
  prefilledName: string | null;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(prefilledName ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputCls =
    "w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] leading-none text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15";
  const labelCls = "text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase";

  async function claimAndRedirect() {
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
      setError("Tem de aceitar os Termos e a Política de Privacidade para criar conta.");
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
        <p className="text-sm text-[#0F1A2E]/70">
          Já tens sessão iniciada. Confirma que és a pessoa responsável pela <strong>{companyName}</strong> para criar
          o teu perfil.
        </p>
        {error && <div className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3.5 py-2.5 text-sm font-medium text-[#7A1A0A]">{error}</div>}
        <button
          type="button"
          onClick={handleClaimOnly}
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-full bg-[#FF3B1F] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,59,31,0.25)] transition hover:bg-[#E8350F] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "A confirmar…" : `Aceitar registo de ${companyName}`}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className={labelCls}>NOME COMPLETO</label>
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="O seu nome" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className={labelCls}>EMAIL</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.co.mz" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className={labelCls}>TELEMOVEL</label>
        <input id="phone" type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="84 123 4567" className={inputCls} />
        <p className="text-xs text-[#0F1A2E]/40">Número de telemóvel moçambicano.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className={labelCls}>PALAVRA-PASSE</label>
        <input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className={inputCls} />
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE]/60 px-3 py-2.5">
        <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} className="mt-0.5 border-[#0F1A2E]/20 data-[checked]:border-[#0B5E56] data-[checked]:bg-[#0B5E56]" />
        <Label htmlFor="terms" className="cursor-pointer text-xs font-normal leading-relaxed text-[#0F1A2E]/70">
          Li e aceito os{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">Termos e Condições</Link>{" "}
          e a{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">Política de Privacidade</Link>.
        </Label>
      </div>

      {error && <div role="alert" className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3.5 py-2.5 text-sm font-medium text-[#7A1A0A]">{error}</div>}

      <button
        type="submit"
        disabled={loading || !acceptedTerms}
        aria-disabled={loading || !acceptedTerms}
        className="inline-flex w-full items-center justify-center rounded-full bg-[#FF3B1F] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,59,31,0.25)] transition hover:bg-[#E8350F] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "A criar conta…" : "Criar conta e completar registo"}
      </button>
    </form>
  );
}
