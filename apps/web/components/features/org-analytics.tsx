"use client"

import * as React from "react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@workspace/ui/components/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import type { DayPoint, OriginPoint, SizePoint, ProvincePoint, VisitorRow } from "@/lib/org-analytics-data"

export type { DayPoint, OriginPoint, SizePoint, ProvincePoint, VisitorRow } from "@/lib/org-analytics-data"

// palette — Workdeal operational (not purple/gradient)
const C = {
  ink: "#0F1A2E",
  forest: "#0B5E56",
  signal: "#FF3B1F",
  line: "#D9D2C2",
  paper: "#F6F3EE",
}

export function VisitsTimeChart({ days }: { days: DayPoint[] }) {
  const [range, setRange] = React.useState<"7" | "30" | "90">("30")
  const data = React.useMemo(() => {
    if (range === "90") return days
    if (range === "7") return days.slice(-7)
    return days.slice(-30)
  }, [days, range])

  const total = data.reduce((a, b) => a + b.visitas, 0)
  const avg = data.length ? (total / data.length).toFixed(1) : "0"

  return (
    <div className="rounded-[18px] border border-[#D9D2C2] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-[#0B5E56]">VISITAS · SÉRIE TEMPORAL</p>
          <p className="mt-1 text-sm font-bold text-[#0F1A2E]">Comportamento das visitas ao teu perfil</p>
          <p className="text-xs text-[#0F1A2E]/55">
            {range === "7" ? "Últimos 7 dias" : range === "30" ? "Últimos 30 dias" : "Últimos 90 dias"} · {total} visitas · média {avg}/dia
          </p>
        </div>
        <div className="flex rounded-full border border-[#D9D2C2] bg-[#F6F3EE] p-1">
          {(["7", "30", "90"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${range === r ? "bg-[#0F1A2E] text-white" : "text-[#0F1A2E]/60 hover:text-[#0F1A2E]"}`}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>

      <ChartContainer
        config={{
          visitas: { label: "Visitas", color: C.forest },
          unicos: { label: "Únicos", color: C.ink },
        }}
        className="mt-4 h-[220px] w-full sm:h-[240px]"
      >
        <AreaChart data={data} margin={{ left: 6, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#D9D2C2" opacity={0.6} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#0F1A2E", opacity: 0.55 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "#0F1A2E", opacity: 0.55 }} tickLine={false} axisLine={false} width={28} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area type="monotone" dataKey="unicos" stroke={C.ink} strokeWidth={1.5} fill={C.ink} fillOpacity={0.08} dot={false} />
          <Area type="monotone" dataKey="visitas" stroke={C.forest} strokeWidth={2} fill={C.forest} fillOpacity={0.16} dot={false} />
        </AreaChart>
      </ChartContainer>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-[#0F1A2E]/60">
          <span className="size-2 rounded-full" style={{ background: C.forest }} aria-hidden /> Visitas
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#0F1A2E]/60">
          <span className="size-2 rounded-full" style={{ background: C.ink }} aria-hidden /> Visitantes únicos
        </span>
        <span className="ml-auto text-[#0F1A2E]/40">Dados anonimizados · sem cookies de terceiros</span>
      </div>
    </div>
  )
}

export function OriginsChart({ data }: { data: OriginPoint[] }) {
  return (
    <div className="rounded-[18px] border border-[#D9D2C2] bg-white p-4 sm:p-5">
      <p className="text-[11px] font-bold tracking-[0.12em] text-[#0B5E56]">ORIGEM</p>
      <p className="mt-1 text-sm font-bold text-[#0F1A2E]">De onde vêm as visitas</p>
      <p className="text-xs text-[#0F1A2E]/55">Pesquisa vs “Perto de mim” vs partilhas — onde investir.</p>

      <ChartContainer config={{ value: { label: "Visitas" } }} className="mt-3 h-[190px] w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="#D9D2C2" opacity={0.5} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#0F1A2E", opacity: 0.5 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="origin" tick={{ fontSize: 12, fill: "#0F1A2E", fontWeight: 600 }} tickLine={false} axisLine={false} width={92} />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
            {data.map((e, i) => (
              <Cell key={i} fill={e.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <ul className="mt-2 grid gap-1">
        {data.map((d) => (
          <li key={d.origin} className="flex items-center gap-2 text-xs">
            <span className="size-2 shrink-0 rounded-full" style={{ background: d.fill }} aria-hidden />
            <span className="font-medium text-[#0F1A2E]">{d.origin}</span>
            <span className="ml-auto font-mono font-bold text-[#0F1A2E]">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SizeChart({ data }: { data: SizePoint[] }) {
  return (
    <div className="rounded-[18px] border border-[#D9D2C2] bg-[#F6F3EE] p-4 sm:p-5">
      <p className="text-[11px] font-bold tracking-[0.12em] text-[#0B5E56]">QUEM VISITA</p>
      <p className="mt-1 text-sm font-bold text-[#0F1A2E]">Porte das empresas que te procuram</p>
      <p className="text-xs text-[#0F1A2E]/55">Micro → Grande. Sinal de ajuste oferta/procura.</p>

      <ChartContainer config={{ value: { label: "Parcela" } }} className="mx-auto mt-3 h-[190px] w-full max-w-[240px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie data={data} dataKey="value" nameKey="size" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="white" strokeWidth={2}>
            {data.map((e, i) => (
              <Cell key={i} fill={e.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {data.map((d) => (
          <div key={d.size} className="flex items-center gap-2 rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1.5">
            <span className="size-2 rounded-full" style={{ background: d.fill }} aria-hidden />
            <span className="text-xs font-semibold text-[#0F1A2E]">{d.size}</span>
            <span className="ml-auto font-mono text-xs font-bold text-[#0F1A2E]">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProvinceBars({ data }: { data: ProvincePoint[] }) {
  return (
    <div className="rounded-[18px] border border-[#D9D2C2] bg-white p-4 sm:p-5">
      <p className="text-[11px] font-bold tracking-[0.12em] text-[#0B5E56]">TERRITÓRIO</p>
      <p className="mt-1 text-sm font-bold text-[#0F1A2E]">Província dos visitantes</p>
      <p className="text-xs text-[#0F1A2E]/55">Onde estão quem te encontra.</p>
      <ChartContainer config={{ value: { label: "Visitas", color: C.ink } }} className="mt-3 h-[190px] w-full">
        <BarChart data={data} margin={{ left: 4, right: 12, top: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#D9D2C2" opacity={0.5} />
          <XAxis dataKey="province" tick={{ fontSize: 10, fill: "#0F1A2E", opacity: 0.6 }} tickLine={false} axisLine={false} interval={0} angle={-14} dy={10} height={44} />
          <YAxis tick={{ fontSize: 11, fill: "#0F1A2E", opacity: 0.5 }} tickLine={false} axisLine={false} width={24} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill={C.ink} radius={[8, 8, 0, 0]} barSize={18} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export function VisitorsTable({ rows }: { rows: VisitorRow[] }) {
  const [filter, setFilter] = React.useState<string>("todos")
  const filtered = filter === "todos" ? rows : rows.filter((r) => r.origin === filter)

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#D9D2C2] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F1A2E] px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-white/60">ÚLTIMAS VISITAS · AMOSTRA ANONIMIZADA</p>
          <p className="text-xs text-white/50">Quem visitou, de onde, que empresa faz parte — e o que fez a seguir.</p>
        </div>
        <div className="flex gap-1 rounded-full bg-white/10 p-1">
          {["todos", "Pesquisa", "Perto de mim", "Directo", "Partilha"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${filter === f ? "bg-white text-[#0F1A2E]" : "text-white/70 hover:text-white"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-[#D9D2C2]/60">
        {filtered.map((v) => (
          <div key={v.id} className="flex items-center gap-3 px-4 py-3 sm:px-5 hover:bg-[#F6F3EE]/60">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] font-mono text-xs font-bold text-[#0F1A2E]">{v.avatar}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="truncate text-sm font-bold text-[#0F1A2E]">{v.name}</span>
                <span className="rounded-full border border-[#D9D2C2] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#0F1A2E]/60">{v.size}</span>
                <span className="hidden sm:inline text-xs text-[#0F1A2E]/40">·</span>
                <span className="hidden sm:inline text-xs text-[#0F1A2E]/60">{v.province}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full bg-[#0F1A2E] px-2 py-0.5 text-[11px] font-semibold text-white">{v.origin}</span>
                <span className="text-[#0F1A2E]/60">→ {v.action}</span>
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium text-[#0F1A2E]/50">{v.time}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-[#D9D2C2] bg-[#F6F3EE] px-4 py-2.5 text-center text-[11px] leading-relaxed text-[#0F1A2E]/50 sm:px-5">
        Nomes abreviados por privacidade. Dados agregados disponíveis via API para plano verificado.{" "}
        <span className="font-semibold text-[#0B5E56]">LGPD · sem tracking de terceiros</span>
      </div>
    </div>
  )
}
