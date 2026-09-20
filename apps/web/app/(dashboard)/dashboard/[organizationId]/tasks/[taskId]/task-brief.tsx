"use client"

import { useState } from "react"
import { ChevronDown, MapPin } from "lucide-react"
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
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 pb-4 pt-5">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${task.statusCls}`}>{task.statusLabel}</span>
        {task.budgetLabel && (
          <span className="font-mono text-[13px] font-semibold tabular-nums">{task.budgetLabel}</span>
        )}
        {task.locationLabel && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden /> {task.locationLabel}
          </span>
        )}
        {task.deadlineLabel && <span className="text-xs font-medium text-primary">{task.deadlineLabel}</span>}
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 border-t bg-muted/60 px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground">
          {open ? "Ocultar detalhes da tarefa" : "Ver detalhes da tarefa"}
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-5 py-4">
          <p className="text-[13px] leading-relaxed text-muted-foreground">{task.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {task.categoryName && (
              <span className="rounded-full border px-2.5 py-1 font-medium text-primary">
                {task.categoryName}
              </span>
            )}
            {task.contractLabel && (
              <span className="rounded-full bg-primary/5 px-2.5 py-1 font-medium text-primary ring-1 ring-primary/20">
                {task.contractLabel}
              </span>
            )}
            {task.dueLabel && (
              <span className="rounded-full border px-2.5 py-1 text-muted-foreground">
                {task.dueLabel}
              </span>
            )}
            {task.tags.map((t) => (
              <span key={t.id} className="rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground">
                #{t.name}
              </span>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
