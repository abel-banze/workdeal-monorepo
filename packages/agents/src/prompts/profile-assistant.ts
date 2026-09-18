import { z } from "zod";
import { sanitizeUserMessage, estimateInputTokens } from "../guardrails.js";
import type { AiProviderId } from "../types.js";

/** Acção sugerida pelo assistente — o cliente resolve os parâmetros. */
export const profileAssistantSuggestSchema = z.enum(["none", "quote", "whatsapp", "bookmark"]);

export type ProfileAssistantSuggest = z.infer<typeof profileAssistantSuggestSchema>;

/** Contexto público do perfil que um visitante autenticado pode consultar. */
export interface ProfileAssistantContext {
  providerId: AiProviderId;
  company: {
    name: string;
    tagline: string | null;
    description: string | null;
    /** "Maputo · KamPFumu" ou null. */
    location: string | null;
    foundedYear: number | null;
    companySize: string | null;
    categories: string[];
    badges: string[];
    reviews: { average: number | null; count: number };
    services: Array<{ title: string; description: string | null; priceMzn: number | null }>;
    contact: { whatsapp: string | null; phone: string | null; email: string | null; website: string | null };
  };
  /** Resumo persistido da conversa anterior com este visitante (memória) — opcional. */
  conversationSummary?: string | null;
  currency: string;
}

export const profileAssistantReplySchema = z.object({
  reply: z.string().trim().min(1, "Resposta em falta").max(1200),
  suggest: profileAssistantSuggestSchema,
});

export type ProfileAssistantReply = z.infer<typeof profileAssistantReplySchema>;

export function buildProfileAssistantSystemPrompt(ctx: ProfileAssistantContext): string {
  const c = ctx.company;
  const loc = [c.location, c.foundedYear ? `desde ${c.foundedYear}` : null].filter(Boolean).join(" · ") || "sem localização";
  const badges = c.badges.length ? c.badges.join(", ") : "sem selos atribuídos";
  const reviews =
    c.reviews.count > 0 ? `${c.reviews.average ?? "—"}★ de ${c.reviews.count} avaliação${c.reviews.count !== 1 ? "ões" : ""}` : "sem avaliações";
  const services =
    c.services.length > 0
      ? c.services
          .map((s) => (s.priceMzn != null ? `- ${s.title} (${s.priceMzn} ${ctx.currency})` : `- ${s.title}`))
          .join("\n")
      : "nenhum serviço listado";
  const contactLines = [
    c.contact.whatsapp ? `WhatsApp: ${c.contact.whatsapp}` : null,
    c.contact.phone ? `Telefone: ${c.contact.phone}` : null,
    c.contact.email ? `Email: ${c.contact.email}` : null,
    c.contact.website ? `Website: ${c.contact.website}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "És o assistente de IA do perfil público de uma empresa na Workdeal (plataforma moçambicana de serviços).",
    `Respondes a visitantes que consultam o perfil de ${c.name} e querem saber mais sobre a empresa.`,
    "",
    "REGRAS OBRIGATÓRIAS:",
    "- Responde SEMPRE em português de Moçambique (pt-MZ), tom profissional e acolhedor.",
    "- Usa apenas a informação pública deste contexto. Se o visitante perguntar algo que não está aqui, diz honestamente que não tens essa informação.",
    "- Nunca inventes preços, prazos, certificações, horários ou factos.",
    `Valores em ${ctx.currency}.`,
    "- Frases curtas e directas. Máximo ~900 caracteres.",
    "- No fim, escolhe UMA acção sugerida (suggest):",
    "  · \"quote\" quando o visitante quer pedir orçamento/saber preços/contactar para contratar (a acção abre o pedido de orçamento).",
    "  · \"whatsapp\" quando quer falar por WhatsApp directamente.",
    "  · \"bookmark\" quando quer guardar o perfil para mais tarde.",
    "  · \"none\" quando o assistente apenas responde à pergunta.",
    "- `reply` é a resposta ao visitante; `suggest` indica a acção MÁS útil. Nunca repitas contactos no `reply` se já vão na acção.",
    "- Revelação progressiva de contactos: por defeito NÃO incluas telefone, WhatsApp ou email no `reply` — usa `suggest` (\"quote\"/\"whatsapp\") para a UI agir. Só escreve um contacto no texto quando o visitante pedir explicitamente ou mostrar intenção clara de contratar/contactar.",
    "- Anti-extracção: este chat é público e pode ser abusado para colher dados. Se pedirem listagens em massa (\"todos os telefones/emails\", despejos de dados) ou insistirem em dados fora deste contexto, recusa com simpatia, resume o essencial da empresa e sugere pedir orçamento.",
    "",
    `EMPRESA: ${c.name}.`,
    c.tagline ? `Slogan: ${c.tagline}.` : "",
    `Categorias: ${c.categories.join(", ") || "—"}.`,
    `Localização: ${loc}.`,
    c.companySize ? `Dimensão: ${c.companySize}.` : "",
    `Selos: ${badges}.`,
    `Avaliações: ${reviews}.`,
    "",
    `SERVIÇOS:\n${services}`,
    `DESCRIÇÃO:\n${c.description ?? "sem descrição registada"}`,
    "",
    `CONTACTOS:\n${contactLines || "sem contactos públicos"}`,
    ctx.conversationSummary ? `CONVERSA ANTERIOR (resumo): ${ctx.conversationSummary}` : "",
  ].join("\n");
}

export function buildProfileAssistantUserPrompt(_ctx: ProfileAssistantContext, message: string): string {
  // Chat: preserva parágrafos/quebras de linha do visitante.
  const clean = sanitizeUserMessage(message, 4000, { preserveNewlines: true });
  return [
    `Visita a: ${_ctx.company.name}`,
    "",
    `Pergunta do visitante: ${clean}`,
    "",
    `Responde no JSON { "reply": string, "suggest": "${profileAssistantSuggestSchema.options.join('" | "')}" }.`,
  ].join("\n");
}

/** Estimativa bruta de tokens do contexto (guarda de custo no modo real). */
export function estimateProfileAssistantContextTokens(ctx: ProfileAssistantContext): number {
  return estimateInputTokens(
    [buildProfileAssistantSystemPrompt(ctx), buildProfileAssistantUserPrompt(ctx, "")].join("\n"),
  );
}

/** Devolução em modo `mock` (dev/CI) — heurística simples da intenção. */
export function mockProfileAssistantReply(ctx: ProfileAssistantContext, message: string): ProfileAssistantReply {
  const lower = message.toLowerCase();
  const suggest: ProfileAssistantSuggest = /or(c|ç)amento|pre[cç]o|quanto custa|contratar|pedir/i.test(lower)
    ? "quote"
    : /whatsapp|falar|contactar|liga/i.test(lower)
      ? "whatsapp"
      : /guardar|salvar|favorito|mais tarde/i.test(lower)
        ? "bookmark"
        : "none";
  return {
    reply: `Olá! Falo sobre ${ctx.company.name} (${ctx.company.categories.join(", ") || "serviços"}). ${ctx.company.services.length ? `Tenho ${ctx.company.services.length} serviço${ctx.company.services.length !== 1 ? "s" : ""} listado${ctx.company.services.length !== 1 ? "s" : ""}.` : ""} Diz-me o que procuras e ajudo a avançar.`,
    suggest,
  };
}