import Image from "next/image";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth().catch(() => null);

  return (
    <div className="min-h-dvh bg-[#F6F3EE] text-[#0F1A2E]">
      {/* hairline */}
      <div className="h-[3px] w-full bg-[#FF3B1F]" />
      <header className="sticky top-0 z-30 border-b border-[#D9D2C2] bg-[#F6F3EE]/90 backdrop-blur supports-[backdrop-filter]:bg-[#F6F3EE]/80">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Workdeal" width={36} height={36} className="size-9 object-contain" priority />
            <span className="flex flex-col leading-none">
              <span className="font-black tracking-[-0.04em] text-[18px]">WORKDEAL</span>
              <span className="text-[10px] tracking-[0.22em] font-semibold text-[#0B5E56] -mt-[1px]">PLATAFORMA GLOBAL</span>
            </span>
            <span className="hidden sm:inline-flex ml-2 items-center gap-1.5 rounded-full border border-[#0B5E56]/20 bg-white px-2.5 py-1 text-[10px] font-bold tracking-widest text-[#0B5E56]">
              <span className="size-1.5 rounded-full bg-[#0B5E56] animate-pulse" />
              ONDE OS NEGÓCIOS SE ENCONTRAM
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-medium text-[#0F1A2E]/50">Configuração inicial</span>
            {session && (
              <span className="hidden sm:inline-flex size-8 items-center justify-center rounded-full bg-[#0F1A2E] text-xs font-bold text-white">
                {session.user.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D2C2] bg-white px-3 py-1 text-[11px] font-bold text-[#0F1A2E]/60">
              <span className="size-2 rounded-full bg-[#0B5E56]" /> Passo a passo
            </span>
          </div>
        </div>
      </header>

      {/* subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 top-[67px] opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #0F1A2E 1px, transparent 1px), linear-gradient(to bottom, #0F1A2E 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }}
      />
      <main className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 lg:py-10">{children}</main>
    </div>
  );
}
