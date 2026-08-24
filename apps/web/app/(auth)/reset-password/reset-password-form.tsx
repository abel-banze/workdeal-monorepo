"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const tokenFromUrl = search.get("token") ?? "";
  const errorFromUrl = search.get("error");

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(
    errorFromUrl === "INVALID_TOKEN" ? "Link inválido ou expirado. Pede um novo link." : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError("Token em falta. Usa o link recebido por email ou cola o token.");
      return;
    }
    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const clientAny = authClient as unknown as Record<string, unknown>;
      let res: { error?: { message?: string } } | null = null;
      if (typeof clientAny.resetPassword === "function") {
        res = (await (clientAny.resetPassword as (p: unknown) => Promise<unknown>)({
          newPassword: password,
          token: token.trim(),
        })) as { error?: { message?: string } };
      } else {
        const r = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: password, token: token.trim() }),
        });
        const j = (await r.json().catch(() => ({}))) as { error?: { message?: string }; message?: string };
        if (!r.ok) res = { error: { message: j.error?.message ?? j.message ?? `Erro ${r.status}` } };
        else res = j as { error?: { message?: string } };
        if ((res as { error?: unknown })?.error == null && !r.ok) {
          throw new Error((res as { error?: { message?: string } })?.error?.message ?? `Erro ${r.status}`);
        }
      }
      if ((res as { error?: { message?: string } })?.error) {
        throw new Error((res as { error: { message?: string } }).error?.message ?? "Falha ao redefinir");
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao redefinir palavra-passe";
      if (/INVALID_TOKEN|expir/i.test(msg)) setError("Link inválido ou expirado. Pede um novo link em Esqueci-me da palavra-passe.");
      else if (/PASSWORD_TOO_SHORT/i.test(msg)) setError("Palavra-passe demasiado curta (mínimo 8).");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] leading-none text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15";
  const labelCls = "text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase";

  if (done) {
    return (
      <div className="rounded-2xl border border-[#0B5E56]/15 bg-[#0B5E56]/5 px-4 py-6 text-center">
        <p className="text-sm font-bold text-[#0B5E56]">Palavra-passe redefinida ✓</p>
        <p className="mt-1 text-sm text-[#0F1A2E]/70">A redireccionar para o login...</p>
        <Link href="/login" className="mt-4 inline-flex rounded-full bg-[#0F1A2E] px-6 py-2.5 text-sm font-bold text-white hover:bg-black">Ir para login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {!tokenFromUrl && (
        <div className="space-y-1.5">
          <label htmlFor="token" className={labelCls}>
            TOKEN DO EMAIL
          </label>
          <input
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Cole o token do link"
            className={inputCls}
          />
          <p className="text-xs text-[#0F1A2E]/40">Normalmente vem preenchido automaticamente a partir do link do email.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="password" className={labelCls}>
          NOVA PALAVRA-PASSE
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className={labelCls}>
          CONFIRMAR PALAVRA-PASSE
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repete a palavra-passe"
          className={inputCls}
        />
      </div>

      {error && <div role="alert" className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3.5 py-2.5 text-sm font-medium text-[#7A1A0A]">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-full bg-[#0F1A2E] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(15,26,46,0.12)] transition hover:bg-black disabled:opacity-50"
      >
        {loading ? "A guardar..." : "Guardar nova palavra-passe"}
      </button>

      <p className="text-center text-xs text-[#0F1A2E]/40">
        <Link href="/forgot-password" className="font-semibold text-[#0F1A2E] hover:text-[#0B5E56]">Pedir novo link</Link>
        <span className="mx-2">·</span>
        <Link href="/login" className="hover:text-[#0F1A2E]/70">Voltar ao login</Link>
      </p>
    </form>
  );
}
