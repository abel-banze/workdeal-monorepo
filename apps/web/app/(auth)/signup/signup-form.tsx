"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUpSchema } from "@workdeal/shared";
import { authClient, fetchJwtToken } from "@/lib/auth-client";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";

export function SignUpForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const res = await authClient.signUp.email({ name: data.name, email: data.email, password: data.password });
      if (res.error) throw new Error(res.error.message ?? "Falha ao criar conta");

      await fetchJwtToken(res.data?.token ?? undefined);
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
