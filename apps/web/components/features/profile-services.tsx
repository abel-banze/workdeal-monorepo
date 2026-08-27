"use client";

import { FiTool, FiArrowUpRight, FiCheck } from "react-icons/fi";
import type { PublicService } from "@workdeal/shared";
import { QuoteDialog } from "./profile-quote-dialog";

export function ProfileServices({
  services,
  profileName,
  profileEmail,
  targetProfileId,
}: {
  services: PublicService[];
  profileName: string;
  profileEmail?: string | null;
  targetProfileId: string;
}) {
  return (
    <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Serviços</p>
          <h2 className="mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            O que fazemos no terreno
          </h2>
          <p className="mt-1 max-w-[52ch] text-xs leading-relaxed text-[#0F1A2E]/50">
            Esta empresa regista {services.length} serviço{services.length !== 1 ? "s" : ""}. Pede orçamento por um deles.
          </p>
        </div>
        <QuoteDialog
          targetProfileId={targetProfileId}
          profileName={profileName}
          profileEmail={profileEmail}
          serviceLabel="Cotação geral"
          serviceTag="Todos os serviços"
          trigger={
            <button className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0F1A2E] px-4 text-xs font-bold text-white hover:bg-black">
              Pedir proposta <FiArrowUpRight className="size-3.5" />
            </button>
          }
        />
      </div>

      {services.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <div key={s.id} className="flex flex-col rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE]/40 p-4 transition hover:bg-white hover:border-[#0B5E56]/20">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0F1A2E] text-white">
                  <FiTool className="size-[18px]" aria-hidden />
                </span>
                {s.priceMzn != null ? (
                  <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[11px] font-bold tracking-[0.08em] text-[#0F1A2E]/60 ring-1 ring-[#D9D2C2]">
                    {s.priceMzn.toLocaleString("pt-MZ")} MZN
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 text-[15px] font-black leading-tight tracking-[-0.02em] text-[#0F1A2E]">{s.title}</h3>
              {s.description ? <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#0F1A2E]/60">{s.description}</p> : null}
              {s.imageUrl ? <img src={s.imageUrl} alt={s.title} className="mt-3 h-32 w-full rounded-xl border border-[#D9D2C2] object-cover" /> : null}
              <div className="mt-4 flex items-center justify-between border-t border-[#D9D2C2] pt-3">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#0F1A2E]/50">
                  <FiCheck className="size-3" /> Serviço
                </span>
                <QuoteDialog
                  targetProfileId={targetProfileId}
                  profileName={profileName}
                  profileEmail={profileEmail}
                  serviceLabel={s.title}
                  serviceTag="Serviço"
                  trigger={
                    <button className="text-xs font-bold text-[#0B5E56] hover:underline">Pedir orçamento →</button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-[#D9D2C2] bg-[#F6F3EE]/40 p-6 text-center text-sm text-[#0F1A2E]/50">
          Ainda não há serviços publicados por esta empresa.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#0B5E56]/15 bg-[#0B5E56]/5 px-4 py-3">
        <span className="size-1.5 rounded-full bg-[#0B5E56]" aria-hidden />
        <p className="text-xs leading-relaxed text-[#0F1A2E]/70">
          <span className="font-bold text-[#0B5E56]">Como orçamentamos:</span> visita técnica ou videochamada, memória descritiva com marcas e quantidades, prazo e garantia por escrito. Sem sinal até aprovação.
        </p>
      </div>
    </section>
  );
}
