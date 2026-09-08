const MZN = new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 });

export function formatMzn(value: number | null | undefined): string {
  return `${MZN.format(value ?? 0)} MT`;
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
  if (!value) return "—";
  return DATETIME.format(new Date(value));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return DATE.format(new Date(value));
}