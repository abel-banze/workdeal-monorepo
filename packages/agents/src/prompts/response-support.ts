import { z } from "zod";
import type { AiProviderId } from "../types.js";

/** Tipos de contexto suportados para preparação de respostas. */
export type ResponseContextType = "quote" | "opportunity" | "contact";

export interface ResponseSupportContext {
  providerId: AiProviderId;
  contextType: ResponseContextType;
  /** Quem pediu/iniciou (nome + organização, PII mínima). */
  fromName: string | null;
  fromOrganization: string | null;
  /** O que foi pedido (mensagem da quota, título da oportunidade, contacto). */
  subject: string;
  /** Detalhe adicional (ex: mensagem da quota). */
  detail: string | null;
  provider: {
    name: string;
    services: string[];
  };
  currency: string;
}

export const responseMessageSchema = z.object({
  message: z.string().trim().min(5, "Resposta demasiado curta").max(2000),
});

export type ResponseMessage = z.infer<typeof responseMessageSchema>;

export function buildResponseSystemPrompt(ctx: ResponseSupportContext): string {
  const kindLabel =
    ctx.contextType === "quote"
      ? "um pedido de orçamento"
      : ctx.contextType === "opportunity"
        ? "uma oportunidade"
        : "um contacto";
  return [
    "És o assistente de resposta da Workdeal (plataforma moçambicana de serviços).",
    `Preparas o rascunho da resposta a ${kindLabel} para ${ctx.provider.name}. O utilizador revê e envia.`,
    "",
    "REGRAS OBRIGATÓRIAS:",
    "- Português de Moçambique (pt-MZ), tom profissional e acolhedor.",
    "- Responde apenas com o objecto JSON `message`. Nada de mais.",
    "- Cumprimenta por nome se existir; agradece o interesse; responde directamente ao que foi pedido; propõe próximo passo concreto (chamada, orçamento detalhado, visita, WhatsApp).",
    "- Menção apenas serviços/experiência do contexto. Nunca inventar preços, certificações ou factos.",
    `Valores em ${ctx.currency}.`,
    "- Máximo ~1000 caracteres. Frases curtas.",
  ].join("\n");
}

export function buildResponseUserPrompt(ctx: ResponseSupportContext): string {
  const who = [ctx.fromName, ctx.fromOrganization].filter(Boolean).join(" · ");
  return [
    `De interesse: ${ctx.subject}.`,
    ctx.detail ? `Detalhes: ${ctx.detail}.` : "",
    who ? `Pedido enviado por: ${who}.` : "",
    ctx.provider.services.length ? `Serviços de ${ctx.provider.name}: ${ctx.provider.services.join(", ")}.` : "",
    "",
    "Escreve a resposta (message).",
  ].join("\n");
}

/** Rascunho de devolução em modo `mock` (dev/CI). */
export function mockResponseMessage(ctx: ResponseSupportContext): ResponseMessage {
  return {
    message: `Olá${ctx.fromName ? ` ${ctx.fromName}` : ""}. Agradecemos o interesse em "${ctx.subject}". A ${ctx.provider.name} está disponível para avançar e podemos alinhar os detalhes de seguida. [modo demo · ${ctx.providerId}]`,
  };
}