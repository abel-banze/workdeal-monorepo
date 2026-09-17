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

/**
 * Gate de subscrição/features (`/subscriptions/current`): leitura agregada
 * (plano + direitos) que costuma responder depressa mas apanha picos de
 * latência — 5s rebentava o chat do agente de forma intermitente. 15s com
 * UMA repetição em caso de timeout chega para absorver o pico sem prender
 * a UI por muito tempo no pior caso.
 */
export const FEATURE_API_TIMEOUT_MS = 15000;

/** Erro lançado pelo `apiFetch` quando o AbortController corta o pedido. */
export function isApiTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("API timeout");
}

/**
 * Repete uma leitura idempotente quando o timeout a corta (pico transitório).
 * Só repete erros de timeout — qualquer outro erro sai logo à primeira.
 */
export async function fetchWithTimeoutRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (retries <= 0 || !isApiTimeoutError(err)) throw err;
      retries -= 1;
    }
  }
}

export type WithTimeoutMs = { timeoutMs?: number };

export function resolveApiTimeoutMs(init?: WithTimeoutMs): number {
  const t = init?.timeoutMs;
  if (typeof t === "number" && Number.isFinite(t) && t > 0) return Math.floor(t);
  return DEFAULT_API_TIMEOUT_MS;
}
