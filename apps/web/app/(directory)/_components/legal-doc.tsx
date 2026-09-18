import Link from "next/link";
import type { ReactNode } from "react";

export interface LegalSection {
  id: string;
  n: string;
  title: string;
}

/** Cabeçalho de documento legal: rótulo, título, carimbo e faixa de metadados. */
export function LegalHeader({
  label,
  title,
  stampDate,
  meta,
}: {
  label: string;
  title: string;
  stampDate: string;
  meta: Array<[string, string]>;
}) {
  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B5E56]">{label}</p>
          <h1
            className="mt-3 max-w-[16ch] text-4xl font-extrabold leading-[1.04] tracking-tight text-[#0F1A2E] sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
        </div>
        <div className="inline-block -rotate-3 rounded-[10px] border-[3px] border-double border-[#0B5E56] px-5 py-2.5 text-center">
          <span
            className="block text-xs font-extrabold uppercase tracking-[0.24em] text-[#0B5E56]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Em vigor
          </span>
          <span className="mt-1 block text-[13px] font-semibold text-[#0F1A2E]/70">{stampDate}</span>
        </div>
      </div>
      <dl className="mt-8 grid gap-x-8 gap-y-3 border-y border-[#D9D2C2] py-4 text-[13px] sm:grid-cols-3">
        {meta.map(([term, value]) => (
          <div key={term}>
            <dt className="font-semibold text-[#0F1A2E]/50">{term}</dt>
            <dd className="mt-0.5 font-bold text-[#0F1A2E]">{value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

/** Índice marginal: lista com filetes, sem caixa. Fixo no desktop. */
export function LegalIndex({ sections }: { sections: readonly LegalSection[] }) {
  return (
    <nav aria-label="Índice" className="lg:sticky lg:top-6 lg:self-start">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0F1A2E]/45">Índice</p>
      <ol className="mt-2 divide-y divide-[#D9D2C2] border-y border-[#D9D2C2]">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="group flex items-baseline gap-3 py-2 text-[13px] font-semibold text-[#0F1A2E]/65 transition-colors hover:text-[#0B5E56] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B5E56]"
            >
              <span
                aria-hidden
                className="w-6 shrink-0 text-[13px] font-extrabold tabular-nums text-[#0B5E56]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.n}
              </span>
              <span className="group-hover:underline group-hover:underline-offset-4">{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Artigo numerado: numeral marginal em display, corpo indentado sob o título. */
export function Article({ id, n, title, children }: { id: string; n: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-8 py-8 first:pt-0 last:pb-0">
      <div className="flex items-baseline gap-4">
        <span
          aria-hidden
          className="w-8 shrink-0 text-[22px] font-extrabold tabular-nums leading-none text-[#0B5E56]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {n}
        </span>
        <h2
          id={`${id}-titulo`}
          className="text-[19px] font-extrabold tracking-tight text-[#0F1A2E]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
      </div>
      <div className="mt-3 space-y-3 sm:pl-12">{children}</div>
    </section>
  );
}

/** Remissão entre documentos: bloco com filete e seta, sem caixa. */
export function LegalCrossLink({ lead, href, label }: { lead: string; href: string; label: string }) {
  return (
    <p className="mt-8 border-t border-[#D9D2C2] pt-6 text-[14px] leading-relaxed text-[#0F1A2E]/75">
      <span className="font-bold text-[#0F1A2E]">{lead} </span>
      <Link
        href={href}
        className="font-semibold text-[#0B5E56] underline decoration-[#0B5E56]/40 underline-offset-4 transition-colors hover:decoration-[#0B5E56] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B5E56]"
      >
        {label} <span aria-hidden>→</span>
      </Link>
    </p>
  );
}
