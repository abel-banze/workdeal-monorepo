// Anonimato nas negociações de propostas — única fonte de verdade partilhada
// entre a API Hono e as Server Actions do Next.js (AGENTS.md §1).
//
// Regra de produto: enquanto uma proposta está em discussão (lista de
// propostas + chat de negociação), nenhuma das partes vê a identidade real
// da outra — só aliases anónimos. A identidade só é revelada após a
// adjudicação (bid). Contactos directos (telefone, email, links) são
// bloqueados em qualquer texto escrito pelas partes antes da adjudicação.

import type { SenderSide } from "../schemas/negotiation.js";

/** Alias apresentado no lugar do nome real de cada lado. */
export const NEGOTIATION_SIDE_ALIASES: Record<SenderSide, string> = {
  requester: "Solicitante",
  provider: "Fornecedor",
} as const;

export function negotiationSideAlias(side: SenderSide): string {
  return NEGOTIATION_SIDE_ALIASES[side];
}

/**
 * Código curto e determinístico derivado de um id (thread ou proposta),
 * para distinguir interlocutores nas listas sem revelar identidade.
 * Ex.: "Fornecedor · #3F9A". Não é reversível para o id original.
 */
export function anonymousCode(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).toUpperCase().padStart(4, "0").slice(-4);
}

/** Nome anónimo do fornecedor numa proposta em discussão. */
export function anonymousProviderName(proposalId: string): string {
  return `${NEGOTIATION_SIDE_ALIASES.provider} · #${anonymousCode(proposalId)}`;
}

/** Nome anónimo do fornecedor numa thread de negociação. */
export function anonymousThreadProviderName(threadId: string): string {
  return `${NEGOTIATION_SIDE_ALIASES.provider} · #${anonymousCode(threadId)}`;
}

// ── Bloqueio de contactos ────────────────────────────────────────────

export type ContactViolationKind = "email" | "url" | "phone";

export const CONTACT_BLOCK_MESSAGE_PT =
  "Por segurança, a negociação é anónima até à adjudicação: não partilhes contactos (telefone, email, links) nem nomes de empresas. Comunica apenas pela plataforma.";

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;
const URL_RE = /(https?:\/\/|www\.)[^\s]+/i;
const BARE_DOMAIN_RE =
  /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(com|co\.mz|org\.mz|ac\.mz|gov\.mz|edu\.mz|mz|org|net|io|info|biz|site|online|store|link|me|app|dev)\b/i;

// Palavras que, junto a uma sequência de dígitos, indicam contacto telefónico.
const PHONE_KEYWORDS_RE =
  /\b(whatsapp|whats|zap|telefone|telem[óo]vel|telemovel|celular|contacto|contato|liga-me|ligue|ligar|chamada|sms|telegram|tel|fone|numero|número)\b/i;

/** Conta os dígitos de um "aglomerado" (dígitos com separadores pelo meio). */
function maxDigitRun(text: string): number {
  const runs = text.match(/\(?\+?\d[\d\s.()-]*\d|\d/g) ?? [];
  let max = 0;
  for (const run of runs) {
    const digits = run.replace(/\D/g, "").length;
    if (digits > max) max = digits;
  }
  return max;
}

/**
 * Detecta tentativa de partilha de contacto directo no texto.
 * Devolve o tipo de violação ou null quando o texto é permitido.
 */
export function detectContactSharing(body: string | null | undefined): ContactViolationKind | null {
  if (!body) return null;
  const text = body.trim();
  if (!text) return null;
  if (EMAIL_RE.test(text)) return "email";
  if (URL_RE.test(text) || BARE_DOMAIN_RE.test(text)) return "url";
  const run = maxDigitRun(text);
  if (run >= 9) return "phone";
  if (run >= 7 && PHONE_KEYWORDS_RE.test(text)) return "phone";
  return null;
}

/** true quando o texto pode ser enviado por uma parte em negociação. */
export function isNegotiationTextAllowed(body: string | null | undefined): boolean {
  return detectContactSharing(body) === null;
}
