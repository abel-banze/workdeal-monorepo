"use client";

import { FaWhatsapp } from "react-icons/fa";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@workspace/ui/components/dialog";
import { QuoteDialog } from "./profile-quote-dialog";

type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

function PortfolioDialog({ item, profileName, profileEmail, targetProfileId }: { item: PortfolioItem; profileName: string; profileEmail?: string | null; targetProfileId: string }) {
  return (
    <DialogContent className="max-h-[88vh] max-w-[720px] overflow-hidden rounded-[24px] border-[#D9D2C2] bg-white p-0">
      <div className="max-h-[88vh] overflow-y-auto">
        {item.imageUrl && (
          <div className="relative h-[220px] overflow-hidden bg-[#F6F3EE] sm:h-[260px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt={item.title} className="size-full object-cover" />
          </div>
        )}

        <div className="p-6 sm:p-7">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[20px] font-black leading-tight tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              {item.title}
            </DialogTitle>
            {item.description && (
              <DialogDescription className="mt-2 text-[13px] leading-relaxed text-[#0F1A2E]/60">{item.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <QuoteDialog
              targetProfileId={targetProfileId}
              profileName={profileName}
              profileEmail={profileEmail}
              serviceLabel={item.title}
              serviceTag="Portfólio"
              portfolioItemId={item.id}
              trigger={
                <button className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#0F1A2E] px-5 text-sm font-bold text-white hover:bg-black">
                  Pedir proposta similar →
                </button>
              }
            />
            <a
              href={`https://wa.me/258820000000?text=${encodeURIComponent(`Olá, vi o projecto "${item.title}" no Workdeal e quero proposta similar.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#0B5E56] px-5 text-sm font-bold text-white hover:bg-[#0A4A44]"
            >
              <FaWhatsapp className="size-4" /> WhatsApp
            </a>
          </div>
          <p className="mt-2 text-center font-mono text-[11px] text-[#0F1A2E]/40">Fotos com autorização do cliente · Dossiê disponível sob NDA</p>
        </div>
      </div>
    </DialogContent>
  );
}

export function ProfilePortfolio({ profileName, profileEmail, targetProfileId, items = [] }: { profileName: string; profileEmail?: string | null; targetProfileId: string; items?: PortfolioItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Portfólio</p>
          <h2 className="mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            Obras & entregas
          </h2>
          <p className="mt-1 text-xs text-[#0F1A2E]/50">Toque num projecto para ver detalhes</p>
        </div>
        <QuoteDialog
          targetProfileId={targetProfileId}
          profileName={profileName}
          profileEmail={profileEmail}
          serviceLabel="Cotação — portfólio"
          serviceTag="Obra à medida"
          trigger={
            <button className="hidden text-xs font-bold text-[#0B5E56] hover:underline sm:block">Pedir orçamento →</button>
          }
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Dialog key={item.id}>
            <DialogTrigger className="group w-full overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white text-left transition hover:border-[#0B5E56]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20">
              <div className="relative h-[148px] overflow-hidden bg-[#F6F3EE]">
                {item.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.imageUrl} alt={item.title} className="size-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/20">Sem imagem</span>
                  </div>
                )}
                <span className="absolute bottom-3 right-3 rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[11px] font-bold text-white shadow">Ver detalhes →</span>
              </div>
              <div className="p-4">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-[#0F1A2E]">{item.title}</p>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-[#0F1A2E]/50">{item.description}</p>
                )}
              </div>
            </DialogTrigger>
            <PortfolioDialog item={item} profileName={profileName} profileEmail={profileEmail} targetProfileId={targetProfileId} />
          </Dialog>
        ))}
      </div>
    </section>
  );
}
