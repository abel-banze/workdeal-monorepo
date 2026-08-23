// Normalização/validação de telefone de Moçambique — usada por OTP (web) e
// pelo endpoint de onboarding (api) para garantir que o contacto verificado
// é exactamente o mesmo que o gravado.
// Mobile MZ: 8[2-7]XXXXXXX (9 dígitos). Fixo: 2[0-8]XXXXXXX.

const MOBILE_RE = /^8[2-7]\d{7}$/;
const LANDLINE_RE = /^2[0-8]\d{7}$/;

export type ContactChannel = "whatsapp" | "phone" | "email";

/** Devolve "258XXXXXXXXX" se válido, senão null. Aceita +258, 258, 0-prefixed ou local. */
export function normalizeMzPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 9) {
    digits = `258${digits}`;
  } else if (digits.length === 12 && digits.startsWith("258")) {
    // já com indicativo
  } else {
    return null;
  }
  const local = digits.slice(3);
  return MOBILE_RE.test(local) || LANDLINE_RE.test(local) ? digits : null;
}

export function isValidMzPhone(input: string | null | undefined): boolean {
  return normalizeMzPhone(input) !== null;
}

/**
 * Identificador canónico para comparação entre "verificado" e "gravado":
 * telemóveis → 258XXXXXXXXX; emails → lowercase trimmed; inválidos → null.
 */
export function contactIdentifier(channel: ContactChannel, value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (channel === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.toLowerCase() : null;
  }
  return normalizeMzPhone(v);
}
