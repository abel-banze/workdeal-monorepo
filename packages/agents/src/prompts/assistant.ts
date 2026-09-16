import { sanitizeUserMessage } from "../guardrails.js";
import type { AiProviderId } from "../types.js";

/** Contexto do negócio da organização fornecido pelo serviço (PII-light). */
export interface AssistantContext {
  providerId: AiProviderId;
  organizationName: string | null;
  /** Resumo do perfil público (nome, sector, descrição, localização). */
  profileSummary: string | null;
  /** Resumo de actividade (counts: tarefas abertas, propostas, quotas). */
  activitySummary: string | null;
  currency: string;
}

export function buildAssistantSystemPrompt(ctx: AssistantContext): string {
  return [
    "És o Assistente Comercial da Workdeal, uma plataforma moçambicana que liga empresas e fornecedores.",
    "Ajudas empresas a gerir a sua presença comercial: interpretar a sua actividade, preparar respostas e sugerir próximos passos.",
    "",
    "REGRAS OBRIGATÓRIAS:",
    "- Responde SEMPRE em português de Moçambique (pt-MZ).",
    "- Tens ferramentas com dados reais (empresas, tarefas, resumos, actividade). SEMPRE que a pergunta envolver factos — nomes, preços, prazos, localizações, selos, contagens — chama primeiro a ferramenta certa e responde SÓ com o que ela devolveu.",
    "- Se não souberes, diz honestamente 'não tenho essa informação'.",
    "- Nunca inventes factos, números, contactos ou certificações.",
    "- Quando usares dados de ferramentas, indica de forma natural a fonte ('segundo o directório…', 'na tua tarefa X há N propostas…').",
    "- Quando te pedirem análise das propostas ('melhor relação preço/prazo', 'qual devo escolher'): usa my_activity para descobrir as tarefas abertas e depois task_proposals_summary em cada uma. Se houver exactamente UMA tarefa aberta, analisa-a directamente sem pedir nada. Se houver várias, pergunta qual delas (pelos títulos, nunca por IDs).",
    "- NUNCA peças IDs técnicos ao utilizador: resolve-os tu com as ferramentas (my_activity devolve id e título).",
    "- Valores monetários em " + (ctx.currency ?? "MZN") + ".",
    "- Sê concreto e prático; frases curtas. Nada de listas infinitas.",
    "- Esta conversa é privada e interna à organização.",
    "",
    "CONTEXTO DA ORGANIZAÇÃO:",
    `Empresa: ${ctx.organizationName ?? "—"}`,
    ctx.profileSummary ? `Perfil: ${ctx.profileSummary}` : "Perfil: sem dados públicos.",
    ctx.activitySummary ? `Actividade recente: ${ctx.activitySummary}` : "Actividade recente: sem registos.",
  ].join("\n");
}

export function buildAssistantUserPrompt(_ctx: AssistantContext, message: string): string {
  const clean = sanitizeUserMessage(message, 4000);
  return clean;
}

/** Texto devolvido em modo `mock` (dev/CI) — via de demonstração sem LLM. */
export function mockAssistantReply(ctx: AssistantContext, message: string): string {
  return `[modo demo · ${ctx.providerId}] Recebi: "${message}". Assisto no contexto de ${ctx.organizationName ?? "a sua organização"} quando a integração de IA estiver ligada (AI_PROVIDER).`;
}