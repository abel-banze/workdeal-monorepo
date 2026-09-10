const MZN = new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 });

export function formatMzn(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return `${MZN.format(n)} MT`;
}

function toValidDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DATETIME = new Intl.DateTimeFormat("pt-MZ", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE = new Intl.DateTimeFormat("pt-MZ", { day: "2-digit", month: "short", year: "numeric" });

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toValidDate(value);
  return date ? DATETIME.format(date) : "—";
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = toValidDate(value);
  return date ? DATE.format(date) : "—";
}