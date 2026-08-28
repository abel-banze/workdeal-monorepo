const DAY_MONTH = new Intl.DateTimeFormat("pt-MZ", { day: "2-digit", month: "short" });
const WEEKDAY = new Intl.DateTimeFormat("pt-MZ", { weekday: "long" });
const DATETIME = new Intl.DateTimeFormat("pt-MZ", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const TIME = new Intl.DateTimeFormat("pt-MZ", { hour: "2-digit", minute: "2-digit" });
const FULL = new Intl.DateTimeFormat("pt-MZ", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function formatDayMonth(date: Date | string) {
  return DAY_MONTH.format(new Date(date));
}

export function formatWeekday(date: Date | string) {
  return WEEKDAY.format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return DATETIME.format(new Date(date));
}

export function formatFull(date: Date | string) {
  return FULL.format(new Date(date));
}

/** "Seg, 28 Ago" + "9:00–18:00" (ou em dias seguidos). */
export function formatEventWhen(startAt: Date | string, endAt: Date | string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return `${DATETIME.format(start)} – ${TIME.format(end)}`;
  return `${DATETIME.format(start)} — ${DATETIME.format(end)}`;
}

export function formatDeadline(date: Date | string) {
  const d = new Date(date);
  const label = d < new Date() ? "Prazo passou" : "Prazo";
  return `${label}: ${DAY_MONTH.format(d)} ${TIME.format(d)}`;
}

export function formatMzn(value: number | null | undefined) {
  if (value == null) return null;
  return new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 0 }).format(value);
}