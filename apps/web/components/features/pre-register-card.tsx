import Link from "next/link";
import Image from "next/image";
import { type PreRegisteredCompany } from "@/lib/profiles";

/**
 * Cartão de empresa pré-registada no directório público.
 * Sinaliza que a empresa ainda está a completar o registo (pré-registo).
 */
export function PreRegisterCard({ company }: { company: PreRegisteredCompany }) {
  const initials = company.name.slice(0, 2).toUpperCase();

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[20px] border border-dashed border-[#0B5E56]/40 bg-white transition-all hover:shadow-[0_12px_40px_rgba(15,26,46,0.08)]">
      {/* barra superior — pré-registo (verde, mas tracejado para diferenciar) */}
      <div className="h-[3px] w-full bg-[#0B5E56]/40" aria-hidden />

      {/* header */}
      <div className="flex gap-4 p-5 pb-4">
        <div className="relative shrink-0">
          <div className="relative flex size-[56px] items-center justify-center overflow-hidden rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] text-[15px] font-black tracking-[-0.02em] text-[#0F1A2E]">
            {company.logoUrl ? (
              <Image src={company.logoUrl} alt={`${company.name} logótipo`} fill sizes="56px" className="object-cover" />
            ) : (
              initials
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#FFB020]" aria-hidden />
            <span>Em breve · pré-registo</span>
          </p>
          <h3
            className="mt-1 flex items-center gap-1.5 text-[17px] font-black leading-none tracking-[-0.03em] text-[#0F1A2E]"
            style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
          >
            <span className="min-w-0 truncate">{company.name}</span>
          </h3>
          <p className="mt-1 text-[13px] leading-snug text-[#0F1A2E]/60">
            Esta empresa está a completar o registo na Workdeal.
          </p>
        </div>
      </div>

      {/* categorias */}
      {company.categorySlugs.length > 0 && (
        <div className="flex flex-wrap gap-1 px-5">
          {company.categorySlugs.slice(0, 3).map((c) => (
            <span
              key={c}
              className="inline-flex rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2 py-0.5 text-[11px] font-medium leading-none text-[#0F1A2E]/75"
            >
              {c}
            </span>
          ))}
          {company.categorySlugs.length > 3 && (
            <span className="inline-flex rounded-full bg-[#0F1A2E] px-2 py-0.5 text-[11px] font-bold leading-none text-white">
              +{company.categorySlugs.length - 3}
            </span>
          )}
        </div>
      )}

      {/* morada */}
      {company.formattedAddress && (
        <div className="mx-5 mt-3 flex items-center gap-1.5 border-t border-[#D9D2C2]/60 pt-3 text-[12px] text-[#0F1A2E]/60">
          <span className="truncate">{company.formattedAddress}</span>
        </div>
      )}

      {/* footer */}
      <div className="mt-4 flex items-center justify-between gap-2 bg-[#FFF1D6]/40 px-5 py-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#B27300]">
          <span className="size-1.5 rounded-full bg-[#FFB020]" aria-hidden />
          Aguarde — perfil em preparação
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#0B5E56] opacity-60">
          Em breve <span aria-hidden>→</span>
        </span>
      </div>
    </div>
  );
}
