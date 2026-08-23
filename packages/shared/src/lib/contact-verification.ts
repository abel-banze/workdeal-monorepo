import { createHmac, timingSafeEqual } from "node:crypto";

// Bind servidor do "contacto verificado": após OTP validado, a web emite um
// token HMAC-SHA256 (chave = BETTER_AUTH_SECRET) que a API exige no
// POST /api/v1/onboarding/complete — garante que o contacto gravado é o mesmo
// que passou verificação, imune a manipulação de UI. Server-only (node:crypto).

const TOKEN_VERSION = "cv1";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export interface ContactVerificationPayload {
  channel: string; // whatsapp | phone | email
  identifier: string; // forma canónica (258XXXXXXXXX ou email lowercase)
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function signContactVerification(
  secret: string,
  payload: ContactVerificationPayload,
  ttlMs: number = DEFAULT_TTL_MS,
): string {
  const body = { c: payload.channel, i: payload.identifier, e: Date.now() + ttlMs };
  const encoded = b64url(JSON.stringify(body));
  return `${TOKEN_VERSION}.${encoded}.${hmac(secret, `${TOKEN_VERSION}.${encoded}`)}`;
}

export function verifyContactVerification(secret: string, token: string): ContactVerificationPayload | null {
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;
  const [, encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expected = hmac(secret, `${TOKEN_VERSION}.${encoded}`);
  // comparação constante
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(encoded, "base64url").toString()) as {
      c?: string;
      i?: string;
      e?: number;
    };
    if (!body.c || !body.i || typeof body.e !== "number") return null;
    if (Date.now() > body.e) return null;
    return { channel: body.c, identifier: body.i };
  } catch {
    return null;
  }
}

/** Valida uma lista de tokens (header/cookie) e devolve os pares válidos. */
export function parseVerifiedContacts(secret: string, raw: string | null | undefined): ContactVerificationPayload[] {
  if (!raw) return [];
  const out: ContactVerificationPayload[] = [];
  for (const token of raw.split(/[\s,]+/).filter(Boolean)) {
    const v = verifyContactVerification(secret, token);
    if (v) out.push(v);
  }
  return out;
}
