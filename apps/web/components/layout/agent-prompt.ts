/**
 * Composição de pedidos ao assistente a partir do fluxo guiado (Questionnaire).
 * Puro e testado: transforma intenção + respostas em mensagens que activam
 * as tools do servidor (search_profiles, search_tasks, my_activity, …).
 */

export type AgentIntent = "companies" | "opportunities" | "activity" | "free";

export interface AgentSlots {
  q: string;
  province: string;
}

export interface AgentHistoryTurn {
  question: string;
  answer: string;
}

function clean(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

/** Mensagem inicial a partir da intenção e das respostas do questionário. */
export function composeGuidedPrompt(intent: AgentIntent, slots: AgentSlots): string {
  const q = clean(slots.q);
  const province = clean(slots.province);
  const where = province ? ` na província de ${province}` : "";

  switch (intent) {
    case "companies":
      return `Encontra empresas${q ? ` de ${q}` : ""}${where}. Para cada uma indica nome, província e selos.`;
    case "opportunities":
      return `Que tarefas abertas há${q ? ` sobre ${q}` : ""}${where}? Lista título, orçamento e prazo de cada uma.`;
    case "activity":
      return "Resume a minha actividade: quantas tarefas tenho abertas, quantas propostas enviei e quantas negociações tenho abertas de cada lado.";
    case "free":
      return q;
  }
}

/**
 * Seguimento dentro da mesma conversa. Como o endpoint é stateless,
 * reenviamos o par pergunta/resposta anterior como contexto.
 */
export function composeFollowUp(history: AgentHistoryTurn[], followUp: string): string {
  const last = history[history.length - 1];
  const ask = clean(followUp);
  if (!last) return ask;
  return `Contexto: perguntei "${last.question}" e respondeste "${last.answer.slice(0, 800)}". Agora: ${ask}`;
}
