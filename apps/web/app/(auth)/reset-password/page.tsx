import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import { Suspense } from "react";
import { getServerSession } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Redefinir palavra-passe — Workdeal",
  description: "Escolhe uma nova palavra-passe para a tua conta Workdeal.",
};

export default async function ResetPasswordPage() {
  const session = await getServerSession().catch(() => null);
  if (session) {
    const store = await cookies();
    if (store.has(JWT_COOKIE_NAME)) redirect("/dashboard");
    // Sessão sem JWT (logout parcial) — não redireciona para evitar loop
  }

  return (
    <div className="min-h-dvh bg-[#F6F3EE]">
      <div className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden bg-[#0F1A2E] text-white lg:flex lg:flex-col">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-[#FF3B1F]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`, backgroundSize: "56px 56px" }} />
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[520px] rounded-full bg-[#FF3B1F]/20 blur-[60px]" />
          <div aria-hidden className="pointer-events-none absolute -left-32 bottom-0 size-[460px] rounded-full bg-[#0B5E56]/20 blur-[60px]" />
          <div className="relative flex flex-1 flex-col px-10 py-8 xl:px-12">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Workdeal" width={36} height={36} className="size-9 object-contain" priority />
              <span className="flex flex-col leading-none">
                <span className="font-black tracking-[-0.04em] text-[18px]">WORKDEAL</span>
                <span className="text-[10px] tracking-[0.22em] font-semibold text-white/60 -mt-[1px]">PLATAFORMA GLOBAL</span>
              </span>
            </Link>
            <div className="mt-10 flex-1">
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-white/80">NOVA PALAVRA-PASSE</p>
              <h1 className="mt-5 text-[36px] font-black leading-[0.9] tracking-[-0.05em] xl:text-[42px]" style={{ fontFamily: "var(--font-display)" }}>
                Escolhe
                <br />
                uma chave
                <br />
                <span className="font-light text-white/85">segura.</span>
              </h1>
              <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-white/60">Mínimo 8 caracteres. Usa combinação forte e única.</p>
              <div className="mt-8 rounded-[20px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <p className="text-xs font-bold tracking-[0.14em] text-white/50">DICA DE SEGURANÇA</p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">Evita reutilizar palavras-passe. Um gestor de chaves ajuda a manter tudo seguro.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-6 text-[11px] font-semibold tracking-[0.14em] text-white/30">
              <span>SEGURANÇA</span><span className="size-1 rounded-full bg-white/20" /><span>CRIPTOGRAFIA</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-[#D9D2C2] bg-[#F6F3EE]/80 px-6 py-4 backdrop-blur lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Workdeal" width={32} height={32} className="size-8 object-contain" />
              <span className="font-black tracking-[-0.04em] text-[#0F1A2E]">WORKDEAL</span>
            </Link>
            <Link href="/login" className="text-xs font-semibold text-[#0F1A2E]/60 hover:text-[#0F1A2E]">Entrar →</Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
            <div className="w-full max-w-[440px]">
              <div className="rounded-[24px] border border-[#D9D2C2] bg-white p-6 shadow-[0_12px_40px_rgba(15,26,46,0.08)] sm:p-8">
                <div className="mb-6">
                  <div className="hidden lg:inline-flex items-center gap-2 rounded-full border border-[#0F1A2E]/10 bg-[#F6F3EE] px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/60">
                    <span className="size-1.5 rounded-full bg-[#0B5E56]" /> REDEFINIR ACESSO
                  </div>
                  <h2 className="mt-3 text-[22px] font-black tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>Nova palavra-passe</h2>
                  <p className="mt-1 text-sm text-[#0F1A2E]/60">Define a nova chave para entrar na tua conta.</p>
                </div>
                <Suspense
                  fallback={
                    <div className="space-y-4" aria-busy="true" aria-live="polite">
                      <span className="sr-only">A preparar formulário…</span>
                      <div className="h-10 animate-pulse rounded-lg bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                      <div className="h-10 animate-pulse rounded-lg bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                      <div className="h-11 animate-pulse rounded-full bg-[#0F1A2E]/10" />
                    </div>
                  }
                >
                  <ResetPasswordForm />
                </Suspense>
              </div>
              <p className="mt-3 text-center text-xs">
                <Link href="/" className="font-medium text-[#0F1A2E]/40 hover:text-[#0F1A2E]/70">← Voltar à página inicial</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
