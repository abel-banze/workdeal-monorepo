import { z } from "zod";

// Formato canónico de horário de funcionamento — espelha o Google Places (New)
// `regularOpeningHours.periods`: day 0=Domingo … 6=Sábado, close=null => 24h.
// Única fonte de verdade usada pela API, onboarding e perfil público.

export const openingTimeSchema = z.object({
  day: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export const openingPeriodSchema = z.object({
  open: openingTimeSchema,
  close: openingTimeSchema.nullable(),
});

export const businessHoursSchema = z.object({
  periods: z.array(openingPeriodSchema).max(14), // splits overnight podem exceder 7
});

export type OpeningTime = z.infer<typeof openingTimeSchema>;
export type OpeningPeriod = z.infer<typeof openingPeriodSchema>;
export type BusinessHours = z.infer<typeof businessHoursSchema>;

export const WEEKDAY_LABELS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatOpeningTimePt(t: OpeningTime): string {
  return `${pad2(t.hour)}:${pad2(t.minute)}`;
}

/** Uma linha por dia da semana: "Segunda: 08:00–17:00" / "Fechado" / "24h". */
export function formatBusinessHoursPt(bh: BusinessHours | null | undefined): string[] {
  const byDay = new Map<number, OpeningPeriod[]>();
  for (const p of bh?.periods ?? []) {
    const list = byDay.get(p.open.day) ?? [];
    list.push(p);
    byDay.set(p.open.day, list);
  }
  return WEEKDAY_LABELS_PT.map((label, day) => {
    const periods = byDay.get(day) ?? [];
    if (periods.length === 0) return `${label}: Fechado`;
    return `${label}: ${periods.map((p) => (p.close ? `${formatOpeningTimePt(p.open)}–${formatOpeningTimePt(p.close)}` : "24h")).join(", ")}`;
  });
}

function rangePeriods(firstDay: number, lastDay: number, openH: number, openM: number, closeH: number, closeM: number): BusinessHours {
  const periods: OpeningPeriod[] = [];
  for (let d = firstDay; d <= lastDay; d++) {
    periods.push({ open: { day: d, hour: openH, minute: openM }, close: { day: d, hour: closeH, minute: closeM } });
  }
  return { periods };
}

/**
 * Normaliza qualquer valor legado para o formato canónico.
 * - Canónico ({periods}) → valida e devolve tal como está
 * - Legacy do onboarding ({horario:"Comercial (08–17)"} / "24h" / "Sob marcação") → converte
 * - Desconhecido → null
 */
export function normalizeBusinessHours(value: unknown): BusinessHours | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;

  if ("periods" in rec) {
    const parsed = businessHoursSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  // Legacy: presets de texto guardados como { horario: "Comercial (08–17)" }
  const label = typeof rec.horario === "string" ? rec.horario : null;
  if (!label) return null;
  if (/24\s*h/i.test(label)) {
    return rangePeriods(0, 6, 0, 0, 23, 59);
  }
  if (/marca/i.test(label)) {
    return { periods: [] }; // sob marcação — sem períodos fixos
  }
  const m = label.match(/(\d{1,2})(?::(\d{2}))?\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?/i);
  if (!m) return null;
  const openH = Number(m[1]);
  const openM = m[2] ? Number(m[2]) : 0;
  const closeH = Number(m[3]);
  const closeM = m[4] ? Number(m[4]) : 0;
  if ([openH, openM, closeH, closeM].some((n) => !Number.isFinite(n))) return null;
  return rangePeriods(1, 5, openH, openM, closeH, closeM); // presets legados assumem Seg–Sex
}
