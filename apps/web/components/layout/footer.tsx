import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#1A2744] bg-[#0F1A2E] text-[#F6F3EE]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-white/10 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Workdeal" width={36} height={36} className="size-9 object-contain" />
            <div className="leading-none">
              <p className="font-black tracking-[-0.04em] text-[16px]">WORKDEAL</p>
              <p className="text-[10px] tracking-[0.22em] font-semibold text-white/60">PLATAFORMA GLOBAL</p>
            </div>
            <span className="hidden sm:inline-flex ml-3 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-widest text-white/70">
              ONDE OS NEGÓCIOS SE ENCONTRAM
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/60 text-xs tracking-wide">A sua empresa merece ser encontrada.</span>
            <Link href="/signup" className="inline-flex h-9 items-center rounded-full bg-[#FF3B1F] px-5 text-[13px] font-bold text-white hover:bg-[#E8350F] transition-colors">
              Criar perfil gratuito
            </Link>
            <Link href="/login" className="inline-flex h-9 items-center rounded-full border border-white/15 px-5 text-[13px] font-semibold text-white hover:bg-white hover:text-[#0F1A2E] transition-colors">
              Entrar
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 py-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <p className="max-w-[360px] text-[13.5px] leading-relaxed text-white/65">
              Mais do que um directório — o Workdeal é a comunidade onde empresas verificadas ganham visibilidade, conquistam
              confiança e fecham negócios todos os dias.
            </p>
            <div className="mt-5 flex items-center gap-3 text-[11px] font-semibold tracking-widest text-white/50">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#0B5E56]" /> GLOBAL
              </span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>DIGITAL</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>SEM FRONTEIRAS</span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-white/40">EXPLORAR</p>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li><Link href="/companies" className="hover:text-white">Empresas</Link></li>
              <li><Link href="/#categorias" className="hover:text-white">Sectores</Link></li>
              <li><Link href="/#como-funciona" className="hover:text-white">Como funciona</Link></li>
              <li><Link href="/dashboard" className="hover:text-white">Painel</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-white/40">CONFIANÇA</p>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li><Link href="/#empresas" className="hover:text-white">Empresas verificadas</Link></li>
              <li><span className="text-white/40">Suporte: apoio@workdeal.co.mz</span></li>
              <li className="pt-2 text-xs leading-relaxed text-white/35">Cada perfil é validado pela equipa Workdeal. Contacto sempre directo.</li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-white/40">WORKDEAL</p>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li><span className="text-white/40">Termos (breve)</span></li>
              <li><span className="text-white/40">Privacidade (breve)</span></li>
              <li className="pt-2 text-xs leading-relaxed text-white/35">Ecossistema global de negócios — 100% digital.</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/40">© {new Date().getFullYear()} Workdeal. Todos os direitos reservados. Conteúdo em pt-MZ.</p>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/30">ONDE OS NEGÓCIOS SE ENCONTRAM • PLATAFORMA GLOBAL</p>
        </div>
      </div>
    </footer>
  );
}
