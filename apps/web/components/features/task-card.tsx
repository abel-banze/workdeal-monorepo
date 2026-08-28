import Link from "next/link";
import Image from "next/image";
import type { TaskView } from "@workdeal/shared";
import { TASK_STATUS_LABELS_PT } from "@workdeal/shared";
import { formatDeadline, formatMzn } from "@/lib/dates";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-[#0B5E56] text-white",
  in_review: "bg-[#E8A13A] text-[#0F1A2E]",
  in_progress: "bg-[#0F1A2E] text-white",
  completed: "bg-[#F6F3EE] text-[#0F1A2E]/60 border border-[#D9D2C2]",
  cancelled: "bg-[#F6F3EE] text-[#0F1A2E]/40 border border-[#D9D2C2]",
  withdrawn: "bg-[#F6F3EE] text-[#0F1A2E]/40 border border-[#D9D2C2]",
};

export function TaskCard({ task, categoryName }: { task: TaskView; categoryName?: string | null }) {
  const priceRange = formatBudget(task.priceMinMzn, task.priceMaxMzn);
  const locationLine = [task.province, task.district].filter(Boolean).join(" · ");
  const hasRequesterProfile = Boolean(task.requesterProfileSlug);

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[#D9D2C2] bg-white transition-all hover:border-[#FF3B1F]/30 hover:shadow-[0_12px_40px_rgba(15,26,46,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B1F]/30"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#D9D2C2]/60 px-5 py-2.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">
          <span className="size-1 rounded-full bg-[#FF3B1F]" aria-hidden />
          {locationLine || "Pedido de serviço"}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${STATUS_STYLE[task.status] ?? "bg-[#F6F3EE] text-[#0F1A2E]/60"}`}>
          {TASK_STATUS_LABELS_PT[task.status]}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4">
        <h3
          className="line-clamp-2 text-[19px] font-black leading-tight tracking-[-0.03em] text-[#0F1A2E]"
          style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
        >
          {task.title}
        </h3>
        <p className="mt-2 line-clamp-3 min-h-[3.2rem] text-[13px] leading-relaxed text-[#0F1A2E]/65">{task.description}</p>

        {categoryName ? (
          <span className="mt-3 inline-flex w-fit rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 text-[11px] font-medium text-[#0F1A2E]/75">
            {categoryName}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 bg-[#F6F3EE]/70 px-5 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#0F1A2E]">{priceRange}</p>
          <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0F1A2E]/45">
            {task.dueAt ? formatDeadline(task.dueAt) : "Sem prazo definido"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#FF3B1F] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          Ver pedido <span aria-hidden>→</span>
        </span>
      </div>

      {task.requesterProfileName ? (
        <div className="flex items-center gap-2 border-t border-[#D9D2C2]/60 px-5 py-3">
          <div className="relative flex size-6 items-center justify-center overflow-hidden rounded-full border border-[#D9D2C2] bg-white text-[9px] font-black text-[#0F1A2E]">
            {task.requesterProfileLogo ? (
              <Image src={task.requesterProfileLogo} alt="" fill sizes="24px" className="object-cover" />
            ) : (
              task.requesterProfileName.slice(0, 2).toUpperCase()
            )}
          </div>
          <span className="truncate text-xs font-semibold text-[#0F1A2E]/70">
            Pedido por <span className="font-bold text-[#0F1A2E]">{task.requesterProfileName}</span>
          </span>
          {hasRequesterProfile ? (
            <span className="ml-auto shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B5E56]">Ver ⇱</span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}

function formatBudget(min: number | null, max: number | null) {
  const minFmt = formatMzn(min);
  const maxFmt = formatMzn(max);
  if (minFmt && maxFmt && min !== max) return `${minFmt} – ${maxFmt}`;
  if (minFmt) return `A partir de ${minFmt}`;
  if (maxFmt) return `Até ${maxFmt}`;
  return "Orçamento a negociar";
}