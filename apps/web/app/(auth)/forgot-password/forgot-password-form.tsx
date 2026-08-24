"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Indica um email válido.");
      return;
    }
    setStatus("loading");
    try {
      const clientAny = authClient as unknown as Record<string, unknown>;
      let res: { error?: { message?: string } } | null = null;
      if (typeof clientAny.requestPasswordReset === "function") {
        res = (await (clientAny.requestPasswordReset as (p: unknown) => Promise<unknown>)({
          email: email.trim().toLowerCase(),
          redirectTo: "/reset-password",
        })) as { error?: { message?: string } };
      } else if (typeof (clientAny as { forgetPassword?: unknown }).forgetPassword === "function") {
        res = (await ((clientAny as { forgetPassword: (p: unknown) => Promise<unknown> }).forgetPassword)({
          email: email.trim().toLowerCase(),
          redirectTo: "/reset-password",
        })) as { error?: { message?: string } };
      } else {
        const r = await fetch("/api/auth/request-password-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), redirectTo: "/reset-password" }),
        });
        const j = (await r.json().catch(() => ({}))) as { error?: { message?: string }; message?: string };
        if (!r.ok) res = { error: { message: j.error?.message ?? j.message ?? `Erro ${r.status}` } };
        else res = { error: undefined };
      }
      if ((res as { error?: { message?: string } })?.error) {
        throw new Error((res as { error: { message?: string } }).error?.message ?? "Falha ao enviar email");
      }
      setStatus("success");
    } catch (err) {
      // Mensagem genérica igual à API (mitiga enumeração) — mas mostra erro técnico se for config
      const msg = err instanceof Error ? err.message : "Falha ao enviar email";
      if (/RESET_PASSWORD_DISABLED|não.*configurado/i.test(msg)) {
        setError("Serviço de recuperação temporariamente indisponível. Tenta novamente mais tarde.");
      } else {
        // Mesmo quando email não existe, mostramos success por segurança — mas em dev mostramos success na mesma
        setStatus("success");
        return;
      }
      setStatus("error");
      setError(msg);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] leading-none text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15";
  const labelCls = "text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase";

  if (status === "success") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#0B5E56]/15 bg-[#0B5E56]/5 px-4 py-4">
          <p className="text-sm font-bold text-[#0F1A2E]">Verifica o teu email</p>
          <p className="mt-1 text-sm leading-relaxed text-[#0F1A2E]/70">
            Se existir conta com <span className="font-semibold text-[#0F1A2E]">{email}</span>, enviámos um link para redefinir a palavra-passe. O link é válido por 1 hora.
          </p>
          <p className="mt-2 text-xs text-[#0F1A2E]/50">Não vês o email? Verifica o spam ou tenta novamente em alguns minutos.</p>
        </div>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-full border border-[#0F1A2E]/10 bg-white px-6 py-3 text-sm font-bold text-[#0F1A2E] hover:bg-[#0F1A2E] hover:text-white transition-colors"
        >
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className={labelCls}>
          EMAIL DA CONTA
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@empresa.co.mz"
          className={inputCls}
        />
      </div>

      {error && <div role="alert" className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3.5 py-2.5 text-sm font-medium text-[#7A1A0A]">{error}</div>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex w-full items-center justify-center rounded-full bg-[#0F1A2E] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(15,26,46,0.12)] transition hover:bg-black disabled:opacity-50"
      >
        {status === "loading" ? "A enviar..." : "Enviar link de recuperação"}
      </button>

      <p className="text-center text-xs text-[#0F1A2E]/40">
        Lembraste da palavra-passe?{" "}
        <Link href="/login" className="font-semibold text-[#0F1A2E] hover:text-[#0B5E56]">
          Entrar
        </Link>
      </p>
    </form>
  );
}
