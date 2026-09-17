export function sanitize(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMoney(text: string): number | null {
  const clean = sanitize(text).replace(/[^\d.,]/g, "");
  if (!clean) return null;

  // Formato pt-MZ/UFSA: `10.000.000,00` → milhar por '.', decimal por ','.
  const normalized = clean.replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isNaN(value) ? null : value;
}

export function parseListDate(text: string): Date | null {
  const clean = sanitize(text);
  if (!clean) return null;

  const value = new Date(clean.substring(0, 10));
  return Number.isNaN(value.getTime()) ? null : value;
}

export function parseDetailsDate(text: string): Date | null {
  const clean = sanitize(text);
  if (!clean) return null;

  const value = new Date(clean);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}