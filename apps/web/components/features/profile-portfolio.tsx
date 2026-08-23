"use client";

import { useState } from "react";
import { FiX, FiMapPin, FiCalendar, FiUser, FiClock, FiCheck } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@workspace/ui/components/dialog";
import Link from "next/link";
import { QuoteDialog } from "./profile-quote-dialog";

type PortfolioItem = {
  id: string;
  title: string;
  cat: string;
  year: string;
  img: string;
  location: string;
  client: string;
  duration: string;
  budget: string;
  scope: string[];
  description: string;
};

const MOCK_PORTFOLIO: PortfolioItem[] = [
  {
    id: "1",
    title: "Reabilitação Escola Primária — KaMpfumo",
    cat: "Construção",
    year: "2024",
    img: "https://picsum.photos/seed/workdeal1/800/520",
    location: "Maputo · KaMpfumo",
    client: "Município de Maputo",
    duration: "11 semanas",
    budget: "4,2 MZN",
    scope: ["Demolição selectiva", "Reforço estrutural", "Cobertura e drenagem", "Pintura e acabamentos"],
    description: "Reabilitação integral de 8 salas, bloco administrativo e recreio. Entregue com 6 dias de avanço, com auto de vistoria sem reservas e garantia de 12 meses.",
  },
  {
    id: "2",
    title: "Fornecimento Mobiliário — Gabinete Provincial",
    cat: "Mobiliário",
    year: "2023",
    img: "https://picsum.photos/seed/workdeal2/800/520",
    location: "Maputo · Sommerschield",
    client: "Governo Provincial",
    duration: "3 semanas",
    budget: "1,8 MZN",
    scope: ["Secretárias e cadeiras", "Arquivo e estantes", "Montagem e transporte", "Garantia 24 meses"],
    description: "43 postos de trabalho completos, montagem nocturna para não parar o serviço. Entrega com inventário e etiquetas por sala.",
  },
  {
    id: "3",
    title: "Instalação Eléctrica — Hotel Polana",
    cat: "Eléctrica",
    year: "2023",
    img: "https://picsum.photos/seed/workdeal3/800/520",
    location: "Maputo · Polana",
    client: "Hotel Polana",
    duration: "5 semanas",
    budget: "2,6 MZN",
    scope: ["Quadro geral e parcial", "Iluminação LED", "Rede de emergência", "Certificação e testes"],
    description: "Retrofit de 2 pisos sem interromper operação. Quadros normalizados, testes de carga e dossier de certificação entregue.",
  },
  {
    id: "4",
    title: "Manutenção Frota — 32 viaturas",
    cat: "Serviços",
    year: "2022",
    img: "https://picsum.photos/seed/workdeal4/800/520",
    location: "Maputo · Matola",
    client: "Empresa logística",
    duration: "12 meses",
    budget: "Contrato anual",
    scope: ["Revisões programadas", "Peças originais", "Relatório mensal", "Viatura de substituição"],
    description: "Contrato anual com SLA 24h, redução de 18% em imobilização. Relatórios mensais com fotografia e KM.",
  },
  {
    id: "5",
    title: "Branding & Sinalética — CFM",
    cat: "Branding",
    year: "2024",
    img: "https://picsum.photos/seed/workdeal5/800/520",
    location: "Maputo · Porto",
    client: "CFM",
    duration: "4 semanas",
    budget: "980k MZN",
    scope: ["Sinalética direccional", "Vinil e ACM", "Aplicação nocturna", "Manual de marca"],
    description: "Sistema de sinalética para 3 terminais, aplicação nocturna e entrega com caderno de manutenção.",
  },
  {
    id: "6",
    title: "Climatização — Torres Rani",
    cat: "AVAC",
    year: "2021",
    img: "https://picsum.photos/seed/workdeal6/800/520",
    location: "Maputo · Baixa",
    client: "Torres Rani",
    duration: "6 semanas",
    budget: "3,1 MZN",
    scope: ["VRV 42 unidades", "Condutas e grelhas", "Comissionamento", "Formação à equipa"],
    description: "VRV para 14 pisos, comissionamento com termografia e formação à equipa de manutenção.",
  },
];

function PortfolioDialog({ item, profileName, profileEmail, targetProfileId }: { item: PortfolioItem; profileName: string; profileEmail?: string | null; targetProfileId: string }) {
  return (
    <DialogContent className="max-h-[88vh] max-w-[720px] overflow-hidden rounded-[24px] border-[#D9D2C2] bg-white p-0">
      <div className="max-h-[88vh] overflow-y-auto">
        <div className="relative h-[220px] overflow-hidden bg-[#F6F3EE] sm:h-[260px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.img} alt={item.title} className="size-full object-cover" />
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#0F1A2E] shadow">
              {item.cat} · {item.year}
            </span>
            <span className="hidden rounded-full bg-[#0B5E56] px-3 py-1 font-mono text-[11px] font-bold tracking-[0.08em] text-white shadow sm:inline-flex">
              Entregue no prazo
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[20px] font-black leading-tight tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              {item.title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-[13px] leading-relaxed text-[#0F1A2E]/60">{item.description}</DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-4 sm:grid-cols-4">
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">
                <FiMapPin className="size-3" /> Local
              </p>
              <p className="mt-1 text-xs font-semibold text-[#0F1A2E]">{item.location}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">
                <FiUser className="size-3" /> Cliente
              </p>
              <p className="mt-1 text-xs font-semibold text-[#0F1A2E]">{item.client}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">
                <FiClock className="size-3" /> Prazo
              </p>
              <p className="mt-1 text-xs font-semibold text-[#0F1A2E]">{item.duration}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">
                <FiCalendar className="size-3" /> Valor
              </p>
              <p className="mt-1 text-xs font-semibold text-[#0F1A2E]">{item.budget}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Âmbito entregue</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {item.scope.map((s) => (
                <li key={s} className="flex items-center gap-2 rounded-full border border-[#D9D2C2] bg-white px-3 py-2 text-xs font-medium text-[#0F1A2E]/80">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-white">
                    <FiCheck className="size-3" />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <QuoteDialog
              targetProfileId={targetProfileId}
              profileName={profileName}
              profileEmail={profileEmail}
              serviceLabel={item.title}
              serviceTag={`${item.cat} · ${item.year}`}
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
          <p className="mt-2 text-center font-mono text-[11px] text-[#0F1A2E]/40">Fotos com autorização do cliente · Dossiê e facturas disponíveis sob NDA</p>
        </div>
      </div>
    </DialogContent>
  );
}

export function ProfilePortfolio({ profileName, profileEmail, targetProfileId }: { profileName: string; profileEmail?: string | null; targetProfileId: string }) {
  return (
    <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Portfólio</p>
          <h2 className="mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            Obras & entregas
          </h2>
          <p className="mt-1 text-xs text-[#0F1A2E]/50">Toque num projecto para ver detalhes, fotos e âmbito</p>
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
        {MOCK_PORTFOLIO.map((item) => (
          <Dialog key={item.id}>
            <DialogTrigger className="group w-full overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white text-left transition hover:border-[#0B5E56]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20">
              <div className="relative h-[148px] overflow-hidden bg-[#F6F3EE]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.img} alt={item.title} className="size-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" />
                <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#0F1A2E] shadow">
                  {item.cat} · {item.year}
                </span>
                <span className="absolute bottom-3 right-3 rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[11px] font-bold text-white shadow">Ver detalhes →</span>
              </div>
              <div className="p-4">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-[#0F1A2E]">{item.title}</p>
                <p className="mt-1 text-xs text-[#0F1A2E]/50">
                  {item.location} · {item.duration} · Cliente verificado
                </p>
              </div>
            </DialogTrigger>
            <PortfolioDialog item={item} profileName={profileName} profileEmail={profileEmail} targetProfileId={targetProfileId} />
          </Dialog>
        ))}
      </div>
    </section>
  );
}
