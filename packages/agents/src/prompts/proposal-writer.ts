import { z } from "zod";
import type { AiProviderId } from "../types.js";

/** Contexto da tarefa + perfil do fornecedor (fornecido pelo serviço). */
export interface ProposalWriterContext {
  providerId: AiProviderId;
  /** Dados da tarefa — já validados pelo serviço via repository. */
  task: {
    id: string;
    title: string;
    description: string;
    category: string | null;
    tags: string[];
    priceMinMzn: number | null;
    priceMaxMzn: number | null;
    province: string | null;
    district: string | null;
    contractType: string | null;
    dueAt: string | null;
    proposalDeadlineAt: string | null;
  };
  /** Resumo do perfil do fornecedor que vai propor. */
  provider: {
    name: string;
    services: string[];
    portfolioHighlights: string[];
    badges: string[];
    averageRating: number | null;
    cities: string[];
  };
  /** Pistas opcionais enviadas pelo utilizador (preço/dias). */
  priceMzn: number | null;
  estimatedDays: number | null;
  currency: string;
}

export const proposalMessageSchema = z.object({
  message: z.string().trim().min(20, "Proposta deve ter pelo menos 20 caracteres").max(4000),
});

export type ProposalMessage = z.infer<typeof proposalMessageSchema>;

export function buildProposalSystemPrompt(ctx: ProposalWriterContext): string {
  const budget = ctx.task.priceMinMzn != null || ctx.task.priceMaxMzn != null
    ? ` Orçamento: ${ctx.task.priceMinMzn ?? ""}–${ctx.task.priceMaxMzn ?? ""} ${ctx.currency}.`
    : " Sem faixa de orçamento indicada.";
  return [
    "És um assistente de redacção de propostas comerciais da Workdeal (plataforma moçambicana de serviços).",
    "Escreves o rascunho da mensagem de proposta que o fornecedor vai revê e enviar numa tarefa.",
    "",
    "REGRAS OBRIGATÓRIAS:",
    "- Português de Moçambique (pt-MZ), tom profissional mas directo.",
    "- Responde apenas com o objecto JSON `message`. Nada de mais.",
    "- A mensagem deve: 1) cumprimentar de forma sóbria; 2) mostrar que leu o pedido; 3) destacar a experiência RELEVANTE do fornecedor para este pedido (apenas dados do contexto); 4) indicar prazo/preço se tiverem sido dados; 5) fechar com um próximo passo claro (ex: disponibilidade para alinhar detalhes).",
    "- NUNCA inventar certificações, números, clientes ou experiências que não estejam no contexto.",
    "- Não prometer prazos/preços que não estejam no contexto (não inventar valores).",
    "- Máximo ~2000 caracteres. Frases curtas.",
    "",
    "TAREFA:",
    ctx.task.title,
    ctx.task.description,
    `Categoria: ${ctx.task.category ?? "—"}${ctx.task.tags.length ? ` · Tags: ${ctx.task.tags.join(", ")}` : ""}`,
    `Local: ${[ctx.task.district, ctx.task.province].filter(Boolean).join(", ") || "—"} · Tipo: ${ctx.task.contractType ?? "—"}.${budget}`,
    ctx.task.dueAt ? ` Prazo previsto: ${ctx.task.dueAt}.` : "",
    "",
    "FORNECEDOR:",
    ctx.provider.name,
    `Serviços: ${ctx.provider.services.join(", ") || "—"}`,
    ctx.provider.cities.length ? `Cidades: ${ctx.provider.cities.join(", ")}` : "",
    ctx.provider.badges.length ? `Selo/verificações: ${ctx.provider.badges.join(", ")}` : "",
    ctx.provider.portfolioHighlights.length ? `Destaques: ${ctx.provider.portfolioHighlights.join("; ")}` : "",
    ctx.provider.averageRating != null ? `Avaliação média: ${ctx.provider.averageRating}/5` : "",
    "",
    "PISTAS DO UTILIZADOR (usar se coerentes):",
    ctx.priceMzn != null ? `Preço sugerido: ${ctx.priceMzn} ${ctx.currency}` : "Preço: não indicado.",
    ctx.estimatedDays != null ? `Prazo sugerido: ${ctx.estimatedDays} dias.` : "Prazo: não indicado.",
  ].join("\n");
}

export function buildProposalUserPrompt(ctx: ProposalWriterContext): string {
  return `Escreve a proposta (message) para a tarefa "${ctx.task.title}".`;
}

/** Rascunho de devolução em modo `mock` (dev/CI). */
export function mockProposalMessage(ctx: ProposalWriterContext): ProposalMessage {
  const budget = ctx.task.priceMinMzn != null || ctx.task.priceMaxMzn != null
    ? ` Orçamento indicado: ${ctx.task.priceMinMzn ?? ""}–${ctx.task.priceMaxMzn ?? ""} ${ctx.currency}.`
    : "";
  const hs = ctx.provider.services.slice(0, 3).join(", ") || "os nossos serviços";
  return {
    message: `Olá. Leio com atenção o pedido "${ctx.task.title}".${budget} A ${ctx.provider.name} actua em ${hs} e pode apoiar este serviço. Podemos alinhar os detalhes e prazos para apresentar uma proposta final. Obrigado pela oportunidade. [modo demo · ${ctx.providerId}]`,
  };
}