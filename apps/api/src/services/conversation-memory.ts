import type { AgentMessage } from "@workdeal/agents";

/** Tecto de turnos guardados/enviados (alinhado ao `chatHistorySchema`, máx 20). */
export const CONVERSATION_MAX_TURNS = 20;
/** Turnos recentes preservados quando os mais antigos são resumidos. */
export const CONVERSATION_KEEP_RECENT = 14;

export type MemoryAgent = "assistant" | "profileAssistant";

export interface MemoryScope {
  userId: string;
  organizationId: string | null;
  agent: MemoryAgent;
  profileId: string | null;
}

/**
 * Chave única da conversa — âmbito por utilizador (nunca partilhada entre
 * membros): `ai:v1:u:{userId}:a:{agent}:o:{orgId|-}:p:{profileId|-}`.
 */
export function buildConversationKey(scope: MemoryScope): string {
  const parts = ["ai:v1", `u:${scope.userId}`, `a:${scope.agent}`, `o:${scope.organizationId ?? "-"}`, `p:${scope.profileId ?? "-"}`];
  return parts.join(":");
}

const cleanTurn = (t: AgentMessage): boolean => typeof t.text === "string" && t.text.trim().length > 0;

/**
 * Junta turnos guardados (fonte de verdade) com os enviados pelo cliente,
 * sem duplicar (mesmo `role`+`text`), com teto de `max` turnos.
 */
export function mergeHistories(stored: AgentMessage[], client: AgentMessage[] | undefined, max = CONVERSATION_MAX_TURNS): AgentMessage[] {
  const valid = stored.filter(cleanTurn).map((t) => ({ role: t.role, text: t.text }));
  const seen = new Set(valid.map((t) => `${t.role}\n${t.text}`));
  for (const turn of client ?? []) {
    if (!cleanTurn(turn)) continue;
    const key = `${turn.role}\n${turn.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      valid.push({ role: turn.role, text: turn.text });
    }
  }
  return valid.slice(-max);
}

/** Formata turnos para o pedido de resumo ("Utilizador: … / Assistente: …"). */
export function formatTurnsForSummary(turns: AgentMessage[]): string {
  return turns.map((t) => `${t.role === "user" ? "Utilizador" : "Assistente"}: ${t.text}`).join("\n");
}

/**
 * Resumo extractivo de recurso (modo mock / falha do resumidor): primeira
 * intenção do utilizador, combinada com o resumo anterior. Determinístico.
 */
export function summarizeFallback(previous: string | null, turns: AgentMessage[]): string {
  const firstUser = turns.find((t) => t.role === "user" && t.text.trim().length > 0);
  const snippet = (firstUser?.text ?? turns.find((t) => t.text.trim().length > 0)?.text ?? "").slice(0, 300);
  const combined = previous ? `${previous} | ${snippet}` : snippet;
  return combined.slice(0, 1000);
}
