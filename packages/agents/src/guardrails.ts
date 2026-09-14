/**
 * Guardrails do motor — 3 camadas, independentes do provider:
 *  1. INPUT  — tamanho estimado do contexto (chars → tokens) antes da chamada.
 *  2. OUTPUT — limite de tokens da resposta (o SDK também capa via maxOutputTokens).
 *  3. CUSTO  — teto de custo USD estimado por execução (evita fugas de billing).
 */
export class AgentGuardError extends Error {
  constructor(
    public readonly code: "INPUT_TOO_LARGE" | "OUTPUT_TOO_LARGE" | "COST_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "AgentGuardError";
  }
}

/** Estimativa grosseira de tokens a partir de texto (≈4 chars/token). */
export function estimateInputTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function guardInputBudget(opts: { system: string; user: string; maxInputTokens: number }): AgentGuardError | null {
  const consumed = estimateInputTokens(opts.system) + estimateInputTokens(opts.user);
  if (consumed > opts.maxInputTokens) {
    return new AgentGuardError("INPUT_TOO_LARGE", `Contexto demasiado grande (≈${consumed} tokens est.) — máx ${opts.maxInputTokens}`);
  }
  return null;
}

export function guardOutputBudget(opts: { outputTokens: number; maxOutputTokens: number }): AgentGuardError | null {
  if (opts.outputTokens > opts.maxOutputTokens) {
    return new AgentGuardError("OUTPUT_TOO_LARGE", `Resposta excedeu o limite (${opts.outputTokens} > ${opts.maxOutputTokens})`);
  }
  return null;
}

export function guardCostBudget(opts: { estimatedCostUsd: number; maxCostUsd: number }): AgentGuardError | null {
  if (opts.estimatedCostUsd > opts.maxCostUsd) {
    return new AgentGuardError("COST_EXCEEDED", `Custo estimado excede o limite ($${opts.estimatedCostUsd.toFixed(6)} > $${opts.maxCostUsd})`);
  }
  return null;
}

/** Normaliza a mensagem do utilizador: tira espaços repetidos e capa o tamanho. */
export function sanitizeUserMessage(message: string, maxChars: number = 4000): string {
  return message.replace(/\s+/g, " ").trim().slice(0, maxChars);
}