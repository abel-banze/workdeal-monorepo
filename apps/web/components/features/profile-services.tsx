"use client";

import Link from "next/link";
import { FiTool, FiZap, FiLayers, FiWind, FiTruck, FiPenTool, FiArrowUpRight, FiClock, FiCheck } from "react-icons/fi";
import { QuoteDialog } from "./profile-quote-dialog";

type Service = {
  id: string;
  title: string;
  cat: string;
  desc: string;
  includes: string[];
  prazo: string;
  icon: React.ReactNode;
};

const SERVICES: Service[] = [
  {
    id: "construcao",
    title: "Construção & reabilitação",
    cat: "Obra civil",
    desc: "Escolas, escritórios e armazéns — do levantamento ao auto de vistoria, com equipa própria e frota.",
    includes: ["Levantamento e orçamento", "Gestão de estaleiro", "Entrega com garantias"],
    prazo: "4–16 semanas",
    icon: <FiTool className="size-[18px]" />,
  },
  {
    id: "electrica",
    title: "Instalações eléctricas",
    cat: "Eléctrica",
    desc: "Quadros, iluminação LED, rede de emergência e certificação — com testes de carga documentados.",
    includes: ["Projecto e licenciamento", "Montagem e testes", "Dossier de certificação"],
    prazo: "1–5 semanas",
    icon: <FiZap className="size-[18px]" />,
  },
  {
    id: "mobiliario",
    title: "Mobiliário sob medida",
    cat: "Mobiliário",
    desc: "Postos de trabalho, arquivo e balcões — medição, fabrico e montagem nocturna se preciso.",
    includes: ["Medição no local", "Fabrico e acabamento", "Montagem e etiquetagem"],
    prazo: "2–3 semanas",
    icon: <FiLayers className="size-[18px]" />,
  },
  {
    id: "avac",
    title: "Climatização · AVAC",
    cat: "AVAC",
    desc: "VRV/VRF, condutas e comissionamento — dimensionado à carga térmica real, não ao catálogo.",
    includes: ["Estudo térmico", "Instalação e condutas", "Comissionamento"],
    prazo: "3–6 semanas",
    icon: <FiWind className="size-[18px]" />,
  },
  {
    id: "frota",
    title: "Manutenção de frota",
    cat: "Serviços",
    desc: "Contrato anual com SLA 24h, peças originais e relatório mensal com fotografia — viatura de substituição incluída.",
    includes: ["Revisões programadas", "Peças originais", "Relatório mensal"],
    prazo: "Contrato anual",
    icon: <FiTruck className="size-[18px]" />,
  },
  {
    id: "sinaletica",
    title: "Sinalética & branding",
    cat: "Branding",
    desc: "Sinalética direccional, vinil e ACM — aplicação nocturna para não parar a operação.",
    includes: ["Design e maquetização", "Produção", "Aplicação"],
    prazo: "1–4 semanas",
    icon: <FiPenTool className="size-[18px]" />,
  },
];

export function ProfileServices({ profileName, profileEmail, targetProfileId }: { profileName: string; profileEmail?: string | null; targetProfileId: string }) {
  return (
    <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Serviços</p>
          <h2 className="mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            O que fazemos no terreno
          </h2>
          <p className="mt-1 max-w-[52ch] text-xs leading-relaxed text-[#0F1A2E]/50">
            Orçamento em 24h com memória descritiva. Preço fechado, sem surpresas — e com dossier para o teu arquivo.
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

      {/* lista em linha — evita o 3-card grid templated */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {SERVICES.map((s) => (
          <div key={s.id} className="flex flex-col rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE]/40 p-4 transition hover:bg-white hover:border-[#0B5E56]/20">
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0F1A2E] text-white">{s.icon}</span>
              <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#0F1A2E]/60 ring-1 ring-[#D9D2C2]">
                {s.cat}
              </span>
            </div>
            <h3 className="mt-3 text-[15px] font-black leading-tight tracking-[-0.02em] text-[#0F1A2E]">{s.title}</h3>
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#0F1A2E]/60">{s.desc}</p>
            <ul className="mt-3 space-y-1.5">
              {s.includes.map((it) => (
                <li key={it} className="flex items-center gap-1.5 text-xs text-[#0F1A2E]/70">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#0B5E56]/10 text-[#0B5E56]">
                    <FiCheck className="size-3" />
                  </span>
                  {it}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-[#D9D2C2] pt-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#0F1A2E]/50">
                <FiClock className="size-3" /> {s.prazo}
              </span>
              <QuoteDialog
                targetProfileId={targetProfileId}
                profileName={profileName}
                profileEmail={profileEmail}
                serviceLabel={s.title}
                serviceTag={s.cat}
                trigger={
                  <button className="text-xs font-bold text-[#0B5E56] hover:underline">Pedir orçamento →</button>
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#0B5E56]/15 bg-[#0B5E56]/5 px-4 py-3">
        <span className="size-1.5 rounded-full bg-[#0B5E56]" aria-hidden />
        <p className="text-xs leading-relaxed text-[#0F1A2E]/70">
          <span className="font-bold text-[#0B5E56]">Como orçamentamos:</span> visita técnica ou videochamada, memória descritiva com marcas e quantidades, prazo e garantia por escrito. Sem sinal até aprovação.
        </p>
      </div>
    </section>
  );
}
