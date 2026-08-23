import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { MobileNav } from "./mobile-nav";

type NavLink = { href: string; label: string; badge?: string };

const NAV_LINKS: NavLink[] = [
  { href: "/companies", label: "Empresas" },
  { href: "/#concursos", label: "Concursos", badge: "breve" },
  { href: "/#requisicoes", label: "Requisições", badge: "breve" },
  { href: "/#eventos", label: "Eventos", badge: "breve" },
];

export async function Navbar() {
  const session = await getServerSession().catch(() => null);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#D9D2C2] bg-[#F6F3EE]/90 backdrop-blur supports-[backdrop-filter]:bg-[#F6F3EE]/80">
      {/* top hairline signal */}
      <div className="h-[3px] w-full bg-[#FF3B1F]" />
      <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <Image src="/logo.png" alt="Workdeal" width={36} height={36} className="size-9 object-contain" priority />
          <span className="flex flex-col leading-none">
            <span className="font-black tracking-[-0.04em] text-[18px] text-[#0F1A2E]">WORKDEAL</span>
            <span className="text-[10px] tracking-[0.22em] font-semibold text-[#0B5E56] -mt-[1px]">PLATAFORMA GLOBAL</span>
          </span>
          <span className="hidden lg:inline-flex ml-2 items-center gap-1.5 rounded-full border border-[#0B5E56]/20 bg-white px-2.5 py-1 text-[10px] font-bold tracking-widest text-[#0B5E56]">
            <span className="size-1.5 rounded-full bg-[#0B5E56] animate-pulse" />
            ONDE OS NEGÓCIOS SE ENCONTRAM
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[13.5px] font-medium text-[#0F1A2E]/70 hover:text-[#0F1A2E] transition-colors"
            >
              {l.label}
              {l.badge && (
                <span className="rounded-full bg-[#0F1A2E]/5 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-[#0F1A2E]/40">{l.badge}</span>
              )}
            </Link>
          ))}
          <span className="mx-2 h-4 w-px bg-[#D9D2C2]" />
          <Link href="/#selos" className="px-3 py-2 text-[13.5px] font-medium text-[#0F1A2E]/50 hover:text-[#0F1A2E] flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#FF3B1F]" />
            Selos
          </Link>
        </nav>

        {/* actions */}
        <div className="hidden md:flex items-center gap-2">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center rounded-full border border-[#0F1A2E]/10 bg-white px-4 text-[13px] font-semibold text-[#0F1A2E] hover:bg-[#0F1A2E] hover:text-white transition-colors"
              >
                Painel
              </Link>
              <Link
                href="/dashboard/profile"
                className="inline-flex size-9 items-center justify-center rounded-full bg-[#0F1A2E] text-white text-xs font-bold"
              >
                {session.user.name.slice(0, 2).toUpperCase()}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-9 items-center px-4 text-[13px] font-semibold text-[#0F1A2E] hover:text-[#0F1A2E]/70">
                Entrar
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center rounded-full bg-[#FF3B1F] px-5 text-[13px] font-bold text-white shadow-[0_1px_0_0_rgba(0,0,0,0.08),0_4px_12px_rgba(255,59,31,0.25)] hover:bg-[#E8350F] transition-colors"
              >
                Criar perfil
              </Link>
            </>
          )}
        </div>

        {/* mobile */}
        <MobileNav session={session} links={NAV_LINKS} />
      </div>
    </header>
  );
}
