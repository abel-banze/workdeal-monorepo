"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";

export function WelcomeDialog({ userName, profileName }: { userName: string; profileName?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldOpen = searchParams.get("welcome") === "1";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!shouldOpen) return;
    const hasSeen = typeof window !== "undefined" ? localStorage.getItem("workdeal:welcomeSeen") === "1" : false;
    if (hasSeen) {
      // ainda mostra se veio directo do onboarding (?welcome=1) — o user acabou de criar
      setOpen(true);
      return;
    }
    setOpen(true);
  }, [shouldOpen]);

  useEffect(() => {
    if (shouldOpen) setOpen(true);
  }, [shouldOpen]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      localStorage.setItem("workdeal:welcomeSeen", "1");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("welcome");
      const qs = params.toString();
      router.replace(`/dashboard${qs ? `?${qs}` : ""}`);
    }
  }

  const displayName = profileName ?? userName;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[640px] gap-0 overflow-hidden rounded-[24px] border-[#D9D2C2] bg-white p-0 shadow-[0_24px_64px_rgba(15,26,46,0.18)] sm:max-w-[640px]">
        {/* header — dark thesis, like homepage hero */}
        <div className="relative overflow-hidden bg-[#0F1A2E] px-6 py-7 sm:px-8 sm:py-8">
          {/* grid + blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-[320px] rounded-full bg-[#FF3B1F]/20 blur-[40px]" />
          <div aria-hidden className="pointer-events-none absolute -left-20 bottom-0 size-[260px] rounded-full bg-[#0B5E56]/20 blur-[40px]" />
          {/* isotipo watermark */}
          <Image
            src="/logo.png"
            alt=""
            width={120}
            height={120}
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-2 size-[120px] object-contain opacity-[0.08] select-none"
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-white/80 backdrop-blur">
              <span className="size-1.5 rounded-full bg-[#0B5E56] animate-pulse" />
              BEM-VINDO AO ECOSSISTEMA
            </div>

            <DialogHeader className="mt-4 gap-2">
              <DialogTitle
                className="text-left text-[26px] font-black leading-[0.9] tracking-[-0.04em] text-white sm:text-[28px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Bem-vindo, {displayName}
                <span className="font-light text-white/85">.</span>
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed text-white/60">
                O teu lugar <span className="font-semibold text-white">onde os negócios se encontram</span> já está criado. Agora torna-o incontornável.
              </DialogDescription>
            </DialogHeader>

            {/* perforated stamp signature — like homepage */}
            <div className="absolute -right-1 -top-1 hidden -rotate-[7deg] items-center gap-2 rounded-[12px] border-2 border-dashed border-white/20 bg-white px-2.5 py-1.5 shadow-sm sm:flex">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#0B5E56] text-[11px] font-bold text-white">✓</span>
              <span className="text-[10px] font-black tracking-[0.14em] text-[#0F1A2E]">VERIFICADO</span>
            </div>
          </div>
        </div>

        {/* steps — structural, not decoration: 3 jobs the user can do next */}
        <div className="px-6 py-5 sm:px-8">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">PRÓXIMOS 3 PASSOS</p>
          <div className="relative mt-3 grid gap-3 sm:grid-cols-3">
            {/* connecting line — ecosystem */}
            <div aria-hidden className="pointer-events-none absolute left-[16%] right-[16%] top-[18px] hidden h-px bg-[#D9D2C2] sm:block" />
            {[
              {
                n: "01",
                icon: "◈",
                title: "Completa o perfil",
                desc: "Logo, descrição e fotos. Ganha o selo Perfil Completo.",
                href: "/dashboard/profile",
                cta: "Completar",
                accent: "border-[#0B5E56]/15 bg-[#0B5E56]/5",
              },
              {
                n: "02",
                icon: "◎",
                title: "Pede verificação",
                desc: "Selo Verificado = confiança que vende.",
                href: "/dashboard",
                cta: "Pedir selo",
                accent: "border-[#FF3B1F]/15 bg-[#FF3B1F]/5",
              },
              {
                n: "03",
                icon: "✦",
                title: "Aparece perto",
                desc: "Actualiza localização e segue categorias.",
                href: "/companies",
                cta: "Explorar",
                accent: "border-[#0F1A2E]/10 bg-[#F6F3EE]",
              },
            ].map((s) => (
              <div key={s.n} className={`relative rounded-[16px] border bg-white p-4 ${s.accent}`}>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full border border-[#0F1A2E]/10 bg-white text-xs font-bold text-[#0F1A2E]">{s.icon}</span>
                  <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#0B5E56]">{s.n}</span>
                  <span className="ml-auto size-2 rounded-full bg-[#0B5E56]/40" aria-hidden />
                </div>
                <p className="mt-2 text-sm font-bold leading-tight text-[#0F1A2E]">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/60">{s.desc}</p>
                <Link
                  href={s.href}
                  onClick={() => handleOpenChange(false)}
                  className="mt-3 inline-flex text-xs font-bold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56] hover:decoration-[#0B5E56]/30"
                >
                  {s.cta} →
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3">
            <p className="text-xs font-bold tracking-wide text-[#0F1A2E]">Sem pressa. Sem fidelização.</p>
            <p className="text-xs leading-relaxed text-[#0F1A2E]/60">Podes fazer tudo agora ou voltar depois no painel. O que importa é que já fazes parte da comunidade global.</p>
          </div>
        </div>

        {/* footer actions — one primary, one quiet */}
        <div className="flex flex-col-reverse gap-2 border-t border-[#D9D2C2] bg-[#F6F3EE]/50 px-6 py-4 sm:flex-row sm:justify-between sm:px-8">
          <button
            onClick={() => handleOpenChange(false)}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#D9D2C2] bg-white px-5 text-sm font-semibold text-[#0F1A2E] hover:bg-[#0F1A2E] hover:text-white hover:border-[#0F1A2E] transition-colors"
          >
            Explorar painel
          </button>
          <Link
            href="/dashboard/profile"
            onClick={() => handleOpenChange(false)}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#FF3B1F] px-6 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,59,31,0.25)] hover:bg-[#E8350F] transition-colors"
          >
            Completar perfil →
          </Link>
        </div>

        <p className="bg-white px-6 pb-3 text-center text-[11px] font-medium tracking-wide text-[#0F1A2E]/30 sm:px-8">
          Plataforma global • Digital • Sem fronteiras
        </p>
      </DialogContent>
    </Dialog>
  );
}
