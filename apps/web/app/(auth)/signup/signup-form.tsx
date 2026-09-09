"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUpSchema } from "@workdeal/shared";
import { validateAffiliateCodeAction } from "@/app/actions/affiliates";
import { authClient, fetchJwtToken } from "@/lib/auth-client";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";

const REF_KEY = "wd:ref";

export function SignUpForm({ initialAffiliateCode }: { initialAffiliateCode?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Código de indicação (via ?ref= ou digitado) — persistido para o onboarding
  const [affiliateCode, setAffiliateCode] = useState(initialAffiliateCode ?? "");
  const [affiliateStatus, setAffiliateStatus] = useState<"idle" | "checking" | "valid" | "invalid">(
    initialAffiliateCode ? "idle" : "idle",
  );

  function persistRef(code: string) {
    try {
      if (code) window.localStorage.setItem(REF_KEY, JSON.stringify({ code, source: "link" }));
      else window.localStorage.removeItem(REF_KEY);
    } catch {}
  }

  async function validateAffiliate(e: React.FocusEvent<HTMLInputElement>) {
    const raw = e.target.value.trim().toUpperCase();
    if (raw.length < 4) {
      setAffiliateStatus("idle");
      persistRef("");
      return;
    }
    setAffiliateStatus("checking");
    const res = await validateAffiliateCodeAction({ code: raw });
    if (res.ok) {
      setAffiliateStatus("valid");
      setAffiliateCode(res.data.code);
      persistRef(res.data.code);
    } else {
      setAffiliateStatus("invalid");
      setError(res.error);
    }
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptedTerms) {
      setError("Tem de aceitar os Termos e a Política de Privacidade para criar conta.");
      return;
    }
    setLoading(true);

    // Nesta fase só registamos empresas — sem escolha e sem nome da empresa aqui
    const parsed = signUpSchema.safeParse({ ...form, profileType: "company" });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      setLoading(false);
      return;
    }

    try {
      const data = parsed.data;
      const res = await authClient.signUp.email({ name: data.name, email: data.email, password: data.password, phone: data.phone } as any);
      if (res.error) throw new Error(res.error.message ?? "Falha ao criar conta");
      console.log("[signup] signUp ok, token:", !!res.data?.token);

      await fetchJwtToken();
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar conta");
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] leading-none text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15";
  const labelCls = "text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase";

    return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className={labelCls}>
          NOME COMPLETO
        </label>
        <input id="name" autoComplete="name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="O seu nome" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className={labelCls}>
          EMAIL
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="nome@empresa.co.mz"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className={labelCls}>
          TELEMOVEL
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          required
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="84 123 4567"
          className={inputCls}
        />
        <p className="text-xs text-[#0F1A2E]/40">Número de telemóvel moçambicano.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className={labelCls}>
          PALAVRA-PASSE
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className={inputCls}
        />
        <p className="text-xs text-[#0F1A2E]/40">Mínimo 8 caracteres. Use uma combinação segura.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="affiliateCode" className={labelCls}>
          CÓDIGO DE INDICAÇÃO{" "}
          <span className="font-normal normal-case text-[#0F1A2E]/35">(opcional)</span>
        </label>
        <input
          id="affiliateCode"
          value={affiliateCode}
          onChange={(e) => {
            setAffiliateCode(e.target.value.toUpperCase());
            setAffiliateStatus("idle");
          }}
          onBlur={(e) => void validateAffiliate(e)}
          placeholder="Ex: WD-ABC123"
          autoComplete="off"
          className={inputCls}
        />
        {affiliateStatus === "checking" && <p className="text-xs text-[#0F1A2E]/40">A validar código…</p>}
        {affiliateStatus === "valid" && (
          <p className="inline-flex rounded-full bg-[#0B5E56]/10 px-2.5 py-1 text-xs font-medium text-[#0B5E56]">
            ✓ Código válido — será aplicado ao criar a empresa
          </p>
        )}
        {affiliateStatus === "invalid" && (
          <p className="text-xs font-medium text-[#7A1A0A]">Código inválido — verifica ou remove.</p>
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE]/60 px-3 py-2.5">
        <Checkbox
          id="terms"
          checked={acceptedTerms}
          onCheckedChange={(v) => setAcceptedTerms(v === true)}
          aria-invalid={!acceptedTerms ? undefined : undefined}
          className="mt-0.5 border-[#0F1A2E]/20 data-[checked]:border-[#0B5E56] data-[checked]:bg-[#0B5E56]"
        />
        <Label htmlFor="terms" className="cursor-pointer text-xs font-normal leading-relaxed text-[#0F1A2E]/70">
          Li e aceito os{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">
            Termos e Condições
          </Link>{" "}
          e a{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">
            Política de Privacidade
          </Link>
          .
        </Label>
      </div>

      {error && <div role="alert" className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3.5 py-2.5 text-sm font-medium text-[#7A1A0A]">{error}</div>}

      <button
        type="submit"
        disabled={loading || !acceptedTerms}
        aria-disabled={loading || !acceptedTerms}
        className="inline-flex w-full items-center justify-center rounded-full bg-[#FF3B1F] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,59,31,0.25)] transition hover:bg-[#E8350F] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "A criar conta..." : "Criar conta de empresa"}
      </button>
    </form>
  );
}
