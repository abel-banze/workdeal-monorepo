"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInSchema } from "@workdeal/shared";
import { authClient, fetchJwtToken } from "@/lib/auth-client";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      setLoading(false);
      return;
    }

    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message ?? "Credenciais inválidas");
      await fetchJwtToken();
      router.push(next ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar sessão");
      setLoading(false);
    }
  }

  // compacto — idêntico a apps/web/app/(onboarding)/onboarding/onboarding-form.tsx:53 inputCls
  const inputCls =
    "w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] leading-none text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15";
  const labelCls = "text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className={labelCls}>
          EMAIL
        </label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.co.mz" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={labelCls}>
            PALAVRA-PASSE
          </label>
          <span className="text-xs font-semibold text-[#0F1A2E]/30" title="Recuperação brevemente disponível">
            Esqueceu? (breve)
          </span>
        </div>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
      </div>

      {error && (
        <div className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3.5 py-2.5 text-sm font-medium text-[#7A1A0A]">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-full bg-[#0F1A2E] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(15,26,46,0.12)] transition hover:bg-black disabled:opacity-50"
      >
        {loading ? "A entrar..." : "Entrar na minha conta"}
      </button>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-[#D9D2C2]" />
        <span className="text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/30">OU</span>
        <span className="h-px flex-1 bg-[#D9D2C2]" />
      </div>

      <p className="text-center text-sm text-[#0F1A2E]/60">
        Ainda não tem conta?{" "}
        <Link href="/signup" className="font-bold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
