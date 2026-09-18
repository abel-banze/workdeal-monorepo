import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Manifesto",
  description:
    "Manifesto Workdeal: por um mercado empresarial moçambicano mais aberto, confiável e conectado. O que acreditamos, o nosso compromisso e o que não somos.",
  alternates: { canonical: "/manifesto" },
  openGraph: {
    title: "Manifesto",
    description: "Por um mercado empresarial moçambicano mais aberto, confiável e conectado.",
    type: "article",
    url: `${getSiteUrl()}/manifesto`,
    siteName: "Workdeal",
  },
};

function ManifestoJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Manifesto Workdeal",
    description: "Por um mercado empresarial moçambicano mais aberto, confiável e conectado.",
    url: `${getSiteUrl()}/manifesto`,
    inLanguage: "pt-MZ",
    publisher: {
      "@type": "Organization",
      name: "Workdeal",
      url: getSiteUrl(),
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

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

const DISPLAY = { fontFamily: "var(--font-display)" } as const;

export default function ManifestoPage() {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-20 pt-12 sm:px-6">
      <ManifestoJsonLd />
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B5E56]">Manifesto Workdeal</p>
      <h1
        className="mt-3 max-w-[22ch] text-[34px] font-extrabold leading-[1.04] tracking-tight text-[#0F1A2E] sm:text-[46px]"
        style={DISPLAY}
      >
        Por um mercado empresarial moçambicano mais{" "}
        <span className="underline decoration-[#FF3B1F] decoration-[3px] underline-offset-[10px]">
          aberto, confiável e conectado
        </span>
        .
      </h1>

      {/* O que acreditamos */}
      <section aria-labelledby="acreditamos" className="mt-14">
        <h2 id="acreditamos" className="text-xl font-extrabold tracking-tight text-[#0F1A2E]" style={DISPLAY}>
          O que acreditamos
        </h2>
        <div className="mt-2 divide-y divide-[#D9D2C2] border-b border-[#D9D2C2]">
          {BELIEFS.map((b, i) => (
            <div key={i} className="grid gap-1 py-6 sm:grid-cols-[72px_1fr] sm:gap-4">
              <span aria-hidden className="text-[15px] font-extrabold tabular-nums text-[#0B5E56]" style={DISPLAY}>
                {NUMS[i]}
              </span>
              <p className="max-w-[640px] text-[16px] leading-[1.8] text-[#0F1A2E]/85">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* O nosso compromisso */}
      <section aria-labelledby="compromisso" className="mt-14">
        <h2 id="compromisso" className="text-xl font-extrabold tracking-tight text-[#0F1A2E]" style={DISPLAY}>
          O nosso compromisso
        </h2>
        <ul className="mt-2 divide-y divide-[#D9D2C2] border-b border-[#D9D2C2]">
          {COMMITMENTS.map((c) => (
            <li key={c} className="flex max-w-[720px] items-baseline gap-4 py-4">
              <span aria-hidden className="size-2 shrink-0 translate-y-[-1px] rotate-45 bg-[#0B5E56]" />
              <span className="text-[15px] font-semibold leading-relaxed text-[#0F1A2E]">{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* O que não somos */}
      <section
        aria-labelledby="nao-somos"
        className="mt-14 rounded-[20px] bg-[#0F1A2E] px-6 py-9 text-white sm:px-10 sm:py-11"
      >
        <h2 id="nao-somos" className="text-xl font-extrabold tracking-tight" style={DISPLAY}>
          O que não somos
        </h2>
        <ul className="mt-5 space-y-3.5">
          {NOTS.map((n) => (
            <li key={n} className="flex items-baseline gap-3 text-[15px] leading-relaxed text-white/85">
              <span aria-hidden className="text-base font-extrabold leading-none text-[#FF3B1F]">
                ×
              </span>
              {n}
            </li>
          ))}
        </ul>
      </section>

      {/* Frase de orientação */}
      <figure className="mt-14 max-w-[720px]">
        <span aria-hidden className="block text-[64px] font-extrabold leading-[0.6] text-[#0B5E56]" style={DISPLAY}>
          &ldquo;
        </span>
        <blockquote className="mt-2 text-[22px] font-extrabold leading-snug tracking-tight text-[#0F1A2E] sm:text-[28px]" style={DISPLAY}>
          Todas as funcionalidades do Workdeal existem para facilitar negócios reais entre empresas.
        </blockquote>
      </figure>

      <div className="mt-10 flex flex-wrap gap-2.5">
        <Link
          href="/signup"
          className="inline-flex h-11 items-center rounded-full bg-[#FF3B1F] px-6 text-sm font-bold text-white transition-colors hover:bg-[#E8350F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B5E56]"
        >
          Criar perfil gratuito
        </Link>
        <Link
          href="/companies"
          className="inline-flex h-11 items-center rounded-full border border-[#D9D2C2] bg-white px-6 text-sm font-bold text-[#0F1A2E] transition-colors hover:bg-[#F6F3EE] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B5E56]"
        >
          Explorar empresas
        </Link>
      </div>
    </div>
  );
}
