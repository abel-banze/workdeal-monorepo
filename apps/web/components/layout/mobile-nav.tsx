"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionInfo } from "@workdeal/shared";

export function MobileNav({
  session,
  links,
}: {
  session: SessionInfo | null;
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-full border border-[#0F1A2E]/10 bg-white text-[#0F1A2E]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[67px] z-50 border-b border-[#D9D2C2] bg-[#F6F3EE] px-4 py-5 shadow-lg">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[15px] font-medium text-[#0F1A2E] hover:bg-white"
              >
                <span>{l.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex gap-2 border-t border-[#D9D2C2] pt-4">
            {session ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex-1 inline-flex h-10 items-center justify-center rounded-full bg-[#0F1A2E] text-sm font-bold text-white"
              >
                Ir para painel
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 inline-flex h-10 items-center justify-center rounded-full border border-[#0F1A2E]/15 bg-white text-sm font-semibold text-[#0F1A2E]"
                >
                  Entrar
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex-1 inline-flex h-10 items-center justify-center rounded-full bg-[#FF3B1F] text-sm font-bold text-white"
                >
                  Criar perfil
                </Link>
              </>
            )}
          </div>
          <p className="mt-3 text-center text-[11px] tracking-widest font-semibold text-[#0B5E56]">PLATAFORMA GLOBAL • SEM FRONTEIRAS</p>
        </div>
      )}
    </div>
  );
}
