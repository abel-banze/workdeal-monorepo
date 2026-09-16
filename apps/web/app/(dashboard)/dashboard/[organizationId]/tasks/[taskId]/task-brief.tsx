"use client"

import { useState } from "react"
import { FiChevronDown, FiMapPin } from "react-icons/fi"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible"

export type TaskBriefData = {
  title: string
  description: string
  statusLabel: string
  statusCls: string
  budgetLabel: string | null
  categoryName: string | null
  contractLabel: string | null
  locationLabel: string | null
  dueLabel: string | null
  deadlineLabel: string | null
  tags: { id: string; name: string }[]
}

/** Cabeçalho compacto: a tarefa resume-se a meta + detalhes expansíveis — o palco é das propostas. */
export function TaskBrief({ task }: { task: TaskBriefData }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-[20px] border border-[#D9D2C2] bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 pb-4 pt-5">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${task.statusCls}`}>{task.statusLabel}</span>
        {task.budgetLabel && (
          <span className="font-mono text-[13px] font-bold tabular-nums text-[#0F1A2E]">{task.budgetLabel}</span>
        )}
        {task.locationLabel && (
          <span className="inline-flex items-center gap-1 text-xs text-[#0F1A2E]/60">
            <FiMapPin className="size-3.5" aria-hidden /> {task.locationLabel}
          </span>
        )}
        {task.deadlineLabel && <span className="text-xs font-semibold text-[#0B5E56]">{task.deadlineLabel}</span>}
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 border-t border-[#D9D2C2] bg-[#F6F3EE]/60 px-5 py-2.5 text-xs font-bold text-[#0F1A2E]/70 hover:text-[#0B5E56]">
          {open ? "Ocultar detalhes da tarefa" : "Ver detalhes da tarefa"}
          <FiChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-5 py-4">
          <p className="text-[13px] leading-relaxed text-[#0F1A2E]/75">{task.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {task.categoryName && (
              <span className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 font-semibold text-[#0B5E56]">
                {task.categoryName}
              </span>
            )}
            {task.contractLabel && (
              <span className="rounded-full border border-[#0B5E56]/25 bg-[#0B5E56]/5 px-2.5 py-1 font-semibold text-[#0B5E56]">
                {task.contractLabel}
              </span>
            )}
            {task.dueLabel && (
              <span className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-[#0F1A2E]/70">
                {task.dueLabel}
              </span>
            )}
            {task.tags.map((t) => (
              <span key={t.id} className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#0F1A2E]/60">
                #{t.name}
              </span>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
