/**
 * Timeouts do fetch server-side para a API Hono.
 *
 * O timeout curto é o padrão para leituras/escritas rápidas. Chamadas de
 * geração IA (LLM) routinely demoram dezenas de segundos, por isso usam
 * `AI_API_TIMEOUT_MS` — sem ele, o AbortController corta a resposta a meio
 * e a Server Action falha com "API timeout 5s".
 */
export const DEFAULT_API_TIMEOUT_MS = 5000;

/** Geração IA (LLM) pode demorar dezenas de segundos — nunca usar o timeout curto. */
export const AI_API_TIMEOUT_MS = 90000;

export type WithTimeoutMs = { timeoutMs?: number };

export function resolveApiTimeoutMs(init?: WithTimeoutMs): number {
  const t = init?.timeoutMs;
  if (typeof t === "number" && Number.isFinite(t) && t > 0) return Math.floor(t);
  return DEFAULT_API_TIMEOUT_MS;
}
