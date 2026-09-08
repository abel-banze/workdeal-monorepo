"use client";

import Link from "next/link";
import { FiArrowLeft, FiSearch } from "react-icons/fi";

export default function InstitutionNotFound() {
  return (
    <div className="bg-[#F6F3EE] min-h-screen">
      <div className="mx-auto max-w-[900px] px-4 py-20 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div className="flex size-16 items-center justify-center rounded-full border border-[#D9D2C2] bg-white">
              <span className="text-2xl font-black text-[#FF3B1F]">404</span>
            </div>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#0B5E56] hover:underline"
            >
              <FiArrowLeft aria-hidden /> Voltar
            </button>
          </div>

          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B5E56]">Instituição não encontrada</p>
            <h1 className="mt-2 font-black leading-[1.05] tracking-[-0.04em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 3vw, 36px)" }}>
              Esta instituição não existe ou não está publicada.
            </h1>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-[#0F1A2E]/60">
              O perfil pode ter sido removido, estar em revisão pela equipa Workdeal, ou o endereço pode estar incorrecto.
            </p>

            <form action="/organizations" method="get" className="mt-6 flex max-w-[460px] gap-2">
              <div className="relative flex-1">
                <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0F1A2E]/35" aria-hidden />
                <input
                  name="q"
                  defaultValue=""
                  placeholder="Procurar instituições…"
                  className="h-11 w-full rounded-full border border-[#D9D2C2] bg-white pl-10 pr-4 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56]/40 focus:outline-none focus:ring-2 focus:ring-[#0B5E56]/15"
                  aria-label="Procurar instituições"
                />
              </div>
              <button type="submit" className="inline-flex h-11 items-center rounded-full bg-[#0F1A2E] px-5 text-sm font-bold text-white hover:bg-black">
                Procurar
              </button>
            </form>

            <div className="mt-8 flex flex-wrap gap-2">
              <Link href="/organizations" className="inline-flex items-center rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E] hover:border-[#0F1A2E]/30">
                Ver instituições
              </Link>
              <Link href="/companies" className="inline-flex items-center rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E] hover:border-[#0F1A2E]/30">
                Ver empresas
              </Link>
              <Link href="/" className="inline-flex items-center rounded-full bg-[#0F1A2E] px-4 py-2 text-xs font-bold text-white hover:bg-black">
                Página inicial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}