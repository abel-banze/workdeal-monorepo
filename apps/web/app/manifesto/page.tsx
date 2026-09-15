import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Manifesto — Workdeal",
  description:
    "Manifesto Workdeal: por um mercado empresarial moçambicano mais aberto, confiável e conectado. O que acreditamos, o nosso compromisso e o que não somos.",
  openGraph: {
    title: "Manifesto Workdeal",
    description: "Por um mercado empresarial moçambicano mais aberto, confiável e conectado.",
    type: "article",
  },
};

const BELIEFS = [
  "Acreditamos que Moçambique tem empresas capazes, mas que muitas oportunidades ainda circulam por redes fechadas, grupos dispersos, contactos pessoais e processos pouco estruturados.",
  "Acreditamos que uma pequena empresa deve poder competir pela qualidade da sua proposta — e não apenas pelo tamanho da sua rede de contactos.",
  "Acreditamos que confiança pode ser construída com dados, verificação, transparência e reputação.",
  "Acreditamos que tecnologia deve reduzir a distância entre quem precisa e quem consegue entregar.",
];

const COMMITMENTS = [
  "Criar um espaço empresarial aberto e democrático.",
  "Dar visibilidade a micro, pequenas, médias e grandes empresas.",
  "Facilitar oportunidades reais de negócio.",
  "Tornar a confiança empresarial mais verificável.",
  "Usar inteligência artificial para reduzir trabalho administrativo e acelerar decisões.",
  "Trabalhar com associações e instituições sem entregar a propriedade ou a independência do Workdeal.",
];

const NOTS = [
  "Não somos apenas um directório.",
  "Não somos uma rede social genérica.",
  "Não somos uma plataforma fechada para grandes empresas.",
  "Não somos uma agência que decide qual fornecedor deve ganhar.",
  "Não vendemos confiança artificial: os critérios de confiança devem ser explicáveis.",
];

const NUMS = ["I", "II", "III", "IV"] as const;

export default function ManifestoPage() {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-16 pt-10 sm:px-6">
      <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">MANIFESTO WORKDEAL</p>
      <h1
        className="mt-2 max-w-[720px] text-[32px] font-black leading-[1.02] tracking-tight text-[#0F1A2E] sm:text-[44px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Por um mercado empresarial moçambicano mais aberto, confiável e conectado.
      </h1>

      {/* O que acreditamos */}
      <section aria-labelledby="acreditamos" className="mt-12">
        <h2
          id="acreditamos"
          className="text-xl font-black tracking-tight text-[#0F1A2E]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          O que acreditamos
        </h2>
        <div className="mt-4 divide-y divide-[#D9D2C2] border-y border-[#D9D2C2]">
          {BELIEFS.map((b, i) => (
            <div key={i} className="grid gap-2 py-5 sm:grid-cols-[72px_1fr] sm:gap-4">
              <span
                aria-hidden
                className="font-mono text-sm font-bold tabular-nums text-[#0B5E56]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {NUMS[i]}
              </span>
              <p className="max-w-[640px] text-[16px] leading-relaxed text-[#0F1A2E]/85">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* O nosso compromisso */}
      <section aria-labelledby="compromisso" className="mt-12">
        <h2
          id="compromisso"
          className="text-xl font-black tracking-tight text-[#0F1A2E]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          O nosso compromisso
        </h2>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {COMMITMENTS.map((c) => (
            <li
              key={c}
              className="flex items-start gap-3 rounded-[16px] border border-[#D9D2C2] bg-white px-4 py-3.5 text-[14px] font-semibold leading-relaxed text-[#0F1A2E]"
            >
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-[#0B5E56]" />
              {c}
            </li>
          ))}
        </ul>
      </section>

      {/* O que não somos */}
      <section aria-labelledby="nao-somos" className="mt-12 rounded-[22px] bg-[#0F1A2E] px-6 py-8 text-white sm:px-10 sm:py-10">
        <h2
          id="nao-somos"
          className="text-xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          O que não somos
        </h2>
        <ul className="mt-4 space-y-3">
          {NOTS.map((n) => (
            <li key={n} className="flex items-baseline gap-3 text-[15px] leading-relaxed text-white/85">
              <span aria-hidden className="font-mono text-sm font-bold text-[#FF3B1F]">
                —
              </span>
              {n}
            </li>
          ))}
        </ul>
      </section>

      {/* Frase de orientação */}
      <section aria-label="Frase de orientação" className="mt-12 border-l-4 border-[#0B5E56] pl-5 sm:pl-7">
        <blockquote
          className="max-w-[640px] text-[22px] font-black leading-snug tracking-tight text-[#0F1A2E] sm:text-[28px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          “Todas as funcionalidades do Workdeal existem para facilitar negócios reais entre empresas.”
        </blockquote>
        <p className="mt-3 text-xs font-bold tracking-[0.14em] text-[#0F1A2E]/45">FRASE DE ORIENTAÇÃO</p>
      </section>

      <div className="mt-10 flex flex-wrap gap-2.5">
        <Link
          href="/signup"
          className="inline-flex h-11 items-center rounded-full bg-[#FF3B1F] px-6 text-sm font-bold text-white transition-colors hover:bg-[#E8350F]"
        >
          Criar perfil gratuito
        </Link>
        <Link
          href="/companies"
          className="inline-flex h-11 items-center rounded-full border border-[#D9D2C2] bg-white px-6 text-sm font-bold text-[#0F1A2E] transition-colors hover:bg-[#F6F3EE]"
        >
          Explorar empresas
        </Link>
      </div>
    </div>
  );
}
