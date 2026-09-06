"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import type { DashboardStats } from "@workdeal/shared";

// Movimento da plataforma nos últimos 30 dias — empilhado para ler o volume
// total por dia e o peso de cada etapa (utilizadores → empresas → directório).
const CHART_CONFIG = {
  usuarios: { label: "Novos utilizadores", color: "#0F1A2E" },
  perfis: { label: "Perfis publicados", color: "#0B5E56" },
  tarefas: { label: "Novas tarefas", color: "#B27300" },
  preRegistros: { label: "Pré-registos", color: "#C2462B" },
  contactos: { label: "Pedidos de contacto", color: "#4FD1C5" },
  conversoes: { label: "Deram seguimento", color: "#64748B" },
} as const;

const AREA_DEFS: Array<{ key: keyof typeof CHART_CONFIG; color: string }> = [
  { key: "usuarios", color: "#0F1A2E" },
  { key: "perfis", color: "#0B5E56" },
  { key: "tarefas", color: "#B27300" },
  { key: "preRegistros", color: "#C2462B" },
  { key: "contactos", color: "#4FD1C5" },
  { key: "conversoes", color: "#64748B" },
];

export function ActivityChart({ series }: { series: DashboardStats["series"] }) {
  return (
    <ChartContainer config={CHART_CONFIG} className="h-[300px] w-full">
      <AreaChart data={series} margin={{ left: 0, right: 8, top: 16, bottom: 4 }}>
        <defs>
          {AREA_DEFS.map((d) => (
            <linearGradient key={d.key} id={`fill${d.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={d.color} stopOpacity={0.6} />
              <stop offset="95%" stopColor={d.color} stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="#D9D2C2" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={28}
          tick={{ fontSize: 11, fill: "#0F1A2E", opacity: 0.55 }}
        />
        <YAxis
          allowDecimals={false}
          width={28}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#0F1A2E", opacity: 0.55 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {AREA_DEFS.map((d) => (
          <Area
            key={d.key}
            dataKey={d.key}
            name={CHART_CONFIG[d.key].label}
            type="monotone"
            stackId="total"
            fill={`url(#fill${d.key})`}
            stroke={d.color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}