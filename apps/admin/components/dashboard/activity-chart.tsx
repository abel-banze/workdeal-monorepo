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

const CHART_CONFIG = {
  perfis: { label: "Perfis", color: "#0F1A2E" },
  tarefas: { label: "Tarefas", color: "#0B5E56" },
  contactos: { label: "Contactos", color: "#B27300" },
} as const;

const AREA_DEFS = [
  { key: "perfis", fillId: "fillPerfis", color: "#0F1A2E", opacity: 0.18 },
  { key: "tarefas", fillId: "fillTarefas", color: "#0B5E56", opacity: 0.2 },
  { key: "contactos", fillId: "fillContactos", color: "#B27300", opacity: 0.2 },
] as const;

export function ActivityChart({ series }: { series: DashboardStats["series"] }) {
  return (
    <ChartContainer config={CHART_CONFIG} className="h-[280px] w-full">
      <AreaChart data={series} margin={{ left: 0, right: 8, top: 16, bottom: 4 }}>
        <defs>
          {AREA_DEFS.map((d) => (
            <linearGradient key={d.fillId} id={d.fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={d.color} stopOpacity={d.opacity} />
              <stop offset="95%" stopColor={d.color} stopOpacity={0.02} />
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
            type="monotone"
            fill={`url(#${d.fillId})`}
            stroke={d.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}