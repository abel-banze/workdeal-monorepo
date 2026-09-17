import Link from "next/link";
import type { TenderView } from "@workdeal/shared";
import { formatDayMonth } from "@/lib/dates";
import { formatTenderMoney } from "@/lib/tenders";

export function TenderCard({ tender }: { tender: TenderView }) {
  const title = tender.object || tender.generalObject || tender.reference;
  const location = tender.province ?? "Moçambique";
  const deadline = tender.openedAt
    ? `Abertura: ${formatDayMonth(tender.openedAt)}`
    : tender.launchedAt
      ? `Lançamento: ${formatDayMonth(tender.launchedAt)}`
      : "Prazo a definir";
  const value = formatTenderMoney(tender.estimatedValue);

  return (
    <Link
      href={`/concursos/${tender.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[#D9D2C2] bg-white transition-all hover:border-[#FF3B1F]/30 hover:shadow-[0_12px_40px_rgba(15,26,46,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B1F]/30"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#D9D2C2]/60 px-5 py-2.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">
          <span className="size-1 rounded-full bg-[#FF3B1F]" aria-hidden />
          {location}
        </span>
        {tender.type ? (
          <span className="rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">{tender.type}</span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4">
        <h3
          className="line-clamp-2 text-[19px] font-black leading-tight tracking-[-0.03em] text-[#0F1A2E]"
          style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
        >
          {title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#0F1A2E]/65">{tender.ugeaName ?? "Entidade pública"}</p>
        {tender.generalObject && tender.generalObject !== title ? (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#0F1A2E]/50">{tender.generalObject}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tender.category ? (
            <span className="inline-flex rounded-full border border-[#0B5E56]/25 bg-[#0B5E56]/5 px-2.5 py-1 text-[11px] font-semibold text-[#0B5E56]">{tender.category}</span>
          ) : null}
          <span className="inline-flex rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0F1A2E]/55">
            {tender.reference}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 bg-[#F6F3EE]/70 px-5 py-3">
        <div className="min-w-0">
          {value ? <p className="text-[13px] font-bold text-[#0F1A2E]">{value}</p> : null}
          <p className={`font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0F1A2E]/45 ${value ? "mt-0.5" : ""}`}>
            {deadline}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#FF3B1F] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          Ver concurso <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}