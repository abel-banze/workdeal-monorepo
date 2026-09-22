"use client"

import * as React from "react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@workspace/ui/components/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Search, MapPin, Link2, Share2, FileText, Globe, ChevronLeft, ChevronRight } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import type { DayPoint, OriginPoint, SizePoint, ProvincePoint, VisitorRow } from "@/lib/org-analytics-data"

export type { DayPoint, OriginPoint, SizePoint, ProvincePoint, VisitorRow } from "@/lib/org-analytics-data"

// palette — dados dos gráficos (cores de série; o chrome usa tokens do sistema)
const C = {
  ink: "#0F1A2E",
  forest: "#0B5E56",
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
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">VISITAS · SÉRIE TEMPORAL</p>
          <p className="mt-1 text-sm font-semibold">Comportamento das visitas ao teu perfil</p>
          <p className="text-xs text-muted-foreground">
            {range === "7" ? "Últimos 7 dias" : range === "30" ? "Últimos 30 dias" : "Últimos 90 dias"} · {total} visitas · média {avg}/dia
          </p>
        </div>
        <div className="flex rounded-full border border-border bg-muted p-1">
          {(["7", "30", "90"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-muted-foreground"}`}
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
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)", opacity: 0.55 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)", opacity: 0.55 }} tickLine={false} axisLine={false} width={28} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area type="monotone" dataKey="unicos" stroke={C.ink} strokeWidth={1.5} fill={C.ink} fillOpacity={0.08} dot={false} />
          <Area type="monotone" dataKey="visitas" stroke={C.forest} strokeWidth={2} fill={C.forest} fillOpacity={0.16} dot={false} />
        </AreaChart>
      </ChartContainer>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: C.forest }} aria-hidden /> Visitas
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: C.ink }} aria-hidden /> Visitantes únicos
        </span>
        <span className="ml-auto text-muted-foreground">Dados anonimizados · sem cookies de terceiros</span>
      </div>
    </div>
  )
}

export function OriginsChart({ data }: { data: OriginPoint[] }) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ORIGEM</p>
      <p className="mt-1 text-sm font-semibold">De onde vêm as visitas</p>
      <p className="text-xs text-muted-foreground">Pesquisa vs “Perto de mim” vs partilhas — onde investir.</p>

      <ChartContainer config={{ value: { label: "Visitas" } }} className="mt-3 h-[190px] w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" opacity={0.5} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)", opacity: 0.5 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="origin" tick={{ fontSize: 12, fill: "var(--muted-foreground)", fontWeight: 600 }} tickLine={false} axisLine={false} width={92} />
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
            <span className="font-medium text-foreground">{d.origin}</span>
            <span className="ml-auto font-mono font-semibold text-foreground">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SizeChart({ data }: { data: SizePoint[] }) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">QUEM VISITA</p>
      <p className="mt-1 text-sm font-semibold">Porte das empresas que te procuram</p>
      <p className="text-xs text-muted-foreground">Micro → Grande. Sinal de ajuste oferta/procura.</p>

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
          <div key={d.size} className="flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5">
            <span className="size-2 rounded-full" style={{ background: d.fill }} aria-hidden />
            <span className="text-xs font-semibold text-foreground">{d.size}</span>
            <span className="ml-auto font-mono text-xs font-bold text-muted-foreground">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProvinceBars({ data }: { data: ProvincePoint[] }) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">TERRITÓRIO</p>
      <p className="mt-1 text-sm font-semibold">Província dos visitantes</p>
      <p className="text-xs text-muted-foreground">Onde estão quem te encontra.</p>
      <ChartContainer config={{ value: { label: "Visitas", color: C.ink } }} className="mt-3 h-[190px] w-full">
        <BarChart data={data} margin={{ left: 4, right: 12, top: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis dataKey="province" tick={{ fontSize: 10, fill: "var(--muted-foreground)", opacity: 0.6 }} tickLine={false} axisLine={false} interval={0} angle={-14} dy={10} height={44} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)", opacity: 0.5 }} tickLine={false} axisLine={false} width={24} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill={C.ink} radius={[8, 8, 0, 0]} barSize={18} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

const PAGE_SIZE = 8

function OriginIcon({ origin }: { origin: string }) {
  const cls = "size-3.5 shrink-0 text-muted-foreground"
  if (origin === "Pesquisa") return <Search className={cls} aria-hidden />
  if (origin === "Perto de mim") return <MapPin className={cls} aria-hidden />
  if (origin === "Directo") return <Link2 className={cls} aria-hidden />
  if (origin === "Partilha") return <Share2 className={cls} aria-hidden />
  if (origin === "Pedido") return <FileText className={cls} aria-hidden />
  return <Globe className={cls} aria-hidden />
}

export function VisitorsTable({ rows }: { rows: VisitorRow[] }) {
  const origins = React.useMemo(() => Array.from(new Set(rows.map((r) => r.origin))), [rows])
  const actions = React.useMemo(() => Array.from(new Set(rows.map((r) => r.action))), [rows])
  const [originFilter, setOriginFilter] = React.useState<string>("todos")
  const [actionFilter, setActionFilter] = React.useState<string>("todos")
  const [page, setPage] = React.useState(0)

  const filtered = rows.filter(
    (r) => (originFilter === "todos" || r.origin === originFilter) && (actionFilter === "todos" || r.action === actionFilter),
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  function setFilter(setter: (v: string) => void, v: string) {
    setter(v)
    setPage(0)
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quem visitou</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "visitante" : "visitantes"} · nomes reais quando identificados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={originFilter} onValueChange={(v) => setFilter(setOriginFilter, v ?? "todos")}>
            <SelectTrigger aria-label="Filtrar por origem" className="h-8 w-auto gap-1.5 rounded-full text-xs">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as origens</SelectItem>
              {origins.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={(v) => setFilter(setActionFilter, v ?? "todos")}>
            <SelectTrigger aria-label="Filtrar por acção" className="h-8 w-auto gap-1.5 rounded-full text-xs">
              <SelectValue placeholder="Acção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as acções</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="border-t px-4 py-6 text-center text-sm text-muted-foreground sm:px-5">
          Sem visitas com estes filtros.
        </p>
      ) : (
        <div className="overflow-x-auto border-t">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Visitante</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Origem</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Acção</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium sm:pr-5">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((v) => (
                <tr key={v.id} className="align-top transition-colors hover:bg-muted/60">
                  <td className="px-4 py-3 sm:pl-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] font-semibold text-muted-foreground" aria-hidden>
                        {v.avatar}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium leading-tight">{v.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[v.company, v.size !== "—" ? v.size : null, v.province !== "—" ? v.province : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <OriginIcon origin={v.origin} /> {v.origin}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{v.action}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground sm:pr-5">{v.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/60 px-4 py-2.5 sm:px-5">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Página {safePage + 1} de {pageCount} · identificados com nome real, restantes como Anónimo.
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label="Página anterior"
              className="inline-flex size-7 items-center justify-center rounded-full border hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              aria-label="Página seguinte"
              className="inline-flex size-7 items-center justify-center rounded-full border hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
