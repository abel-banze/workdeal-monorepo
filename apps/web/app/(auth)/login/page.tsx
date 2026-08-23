import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getServerSession().catch(() => null);
  if (session) redirect("/dashboard");

  const { next } = await searchParams;

  return (
    <div className="min-h-dvh bg-[#F6F3EE]">
      <div className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
        {/* LEFT — marca + manifesto */}
        <div className="relative hidden overflow-hidden bg-[#0F1A2E] text-white lg:flex lg:flex-col">
          {/* hairline */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-[#FF3B1F]" />
          {/* grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[520px] rounded-full bg-[#FF3B1F]/20 blur-[60px]" />
          <div aria-hidden className="pointer-events-none absolute -left-32 bottom-0 size-[460px] rounded-full bg-[#0B5E56]/20 blur-[60px]" />

          <div className="relative flex flex-1 flex-col px-10 py-8 xl:px-12">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Workdeal" width={36} height={36} className="size-9 object-contain" priority />
              <span className="flex flex-col leading-none">
                <span className="font-black tracking-[-0.04em] text-[18px]">WORKDEAL</span>
                <span className="text-[10px] tracking-[0.22em] font-semibold text-white/60 -mt-[1px]">PLATAFORMA GLOBAL</span>
              </span>
              <span className="ml-2 hidden xl:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold tracking-widest text-white/70">
                <span className="size-1.5 rounded-full bg-[#0B5E56] animate-pulse" />
                ONDE OS NEGÓCIOS SE ENCONTRAM
              </span>
            </Link>

            <div className="mt-10 flex-1">
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-white/80">
                BEM-VINDO DE VOLTA
              </p>
              <h1
                className="mt-5 text-[36px] font-black leading-[0.9] tracking-[-0.05em] xl:text-[42px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Entre e
                <br />
                continue a
                <br />
                <span className="font-light text-white/85">fazer negócios.</span>
              </h1>
              <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-white/60">
                A sua empresa já faz parte da comunidade. Entre para gerir o perfil, responder a contactos e acompanhar oportunidades.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Perfil verificado com selo Workdeal",
                  "Contactos directos por WhatsApp e telefone",
                  "Visibilidade para quem procura perto de si",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-3 text-sm text-white/80">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-xs">✓</span>
                    {t}
                  </div>
                ))}
              </div>

              {/* card social proof */}
              <div className="mt-10 rounded-[20px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <p className="text-sm leading-relaxed text-white/80">
                  “No Workdeal o cliente já chega confiante. Hoje 40% dos nossos contactos vêm daqui.”
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-white text-xs font-bold text-[#0F1A2E]">HM</span>
                  <div>
                    <p className="text-xs font-bold text-white">Hidro Maputo</p>
                    <p className="text-xs text-white/50">Canalização • Maputo • Verificada</p>
                  </div>
                  <span className="ml-auto rounded-full bg-[#0B5E56] px-2 py-1 text-[10px] font-bold tracking-widest text-white">OURO</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-6 text-[11px] font-semibold tracking-[0.14em] text-white/30">
              <span>GLOBAL</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>DIGITAL</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>SEM FRONTEIRAS</span>
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="flex flex-col">
          {/* mobile header */}
          <div className="flex items-center justify-between border-b border-[#D9D2C2] bg-[#F6F3EE]/80 px-6 py-4 backdrop-blur lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Workdeal" width={32} height={32} className="size-8 object-contain" />
              <span className="font-black tracking-[-0.04em] text-[#0F1A2E]">WORKDEAL</span>
            </Link>
            <Link href="/signup" className="text-xs font-semibold text-[#0F1A2E]/60 hover:text-[#0F1A2E]">
              Criar conta →
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
            <div className="w-full max-w-[440px]">
              <div className="rounded-[24px] border border-[#D9D2C2] bg-white p-6 shadow-[0_12px_40px_rgba(15,26,46,0.08)] sm:p-8">
                <div className="mb-6">
                  <div className="hidden lg:inline-flex items-center gap-2 rounded-full border border-[#0F1A2E]/10 bg-[#F6F3EE] px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/60">
                    <span className="size-1.5 rounded-full bg-[#0B5E56]" /> ENTRAR NA COMUNIDADE
                  </div>
                  <h2 className="mt-3 text-[22px] font-black tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                    Entrar na Workdeal
                  </h2>
                  <p className="mt-1 text-sm text-[#0F1A2E]/60">Aceda ao painel para gerir a sua presença.</p>
                </div>

                <LoginForm next={next} />

                <p className="mt-6 text-center text-xs text-[#0F1A2E]/40">
                  Ao entrar, concorda com os Termos e a Política de Privacidade — brevemente disponíveis.
                </p>
              </div>

              <p className="mt-6 text-center text-sm text-[#0F1A2E]/60">
                Ainda não faz parte?{" "}
                <Link href="/signup" className="font-bold text-[#0F1A2E] hover:text-[#0B5E56]">
                  Criar conta gratuita →
                </Link>
              </p>
              <p className="mt-3 text-center text-xs">
                <Link href="/" className="font-medium text-[#0F1A2E]/40 hover:text-[#0F1A2E]/70">
                  ← Voltar à página inicial
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
