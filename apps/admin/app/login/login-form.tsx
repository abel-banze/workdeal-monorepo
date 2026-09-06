"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInSchema } from "@workdeal/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, fetchJwtToken } from "@/lib/auth-client";

const labelCls = "font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/50";
const inputCls =
  "h-11 rounded-xl border-[#D9D2C2] bg-white text-[#0F1A2E] placeholder:text-[#0F1A2E]/30 focus-visible:border-[#0B5E56]/60 focus-visible:ring-[#0B5E56]/25";

export function LoginForm() {
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
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar sessão");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="email" className={labelCls}>
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@workdeal.co.mz"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className={labelCls}>
          Palavra-passe
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={inputCls}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-[#FF3B1F]/25 bg-[#FF3B1F]/10 px-3.5 py-2.5 text-sm font-medium text-[#7A1A0A]">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-full bg-[#0F1A2E] px-6 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(15,26,46,0.55)] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "A entrar..." : "Entrar"}
      </Button>
    </form>
  );
}