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

/**
 * Estimativa grosseira de tokens a partir de texto (≈4 chars/token).
 * Mantida por compatibilidade — para texto com CJK ou histórico de conversa
 * prefere `estimatePromptTokens`, que conta esses casos em separado.
 */
export function estimateInputTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimador de tokens consciente de escrita não-latina: caracteres CJK
 * (chinês/japonês/coreano) custam ≈1 token cada nos tokenizers BPE, enquanto
 * o texto latino segue a heurística ≈4 chars/token. A estimativa peca sempre
 * por excesso — direcção segura para um guarda de orçamento.
 */
export function estimatePromptTokens(text: string): number {
  if (!text) return 0;
  const cjk = text.match(/[\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]/g)?.length ?? 0;
  const rest = text.length - cjk;
  return Math.max(1, Math.ceil(cjk * 1.2 + rest / 4));
}

export function guardInputBudget(opts: {
  system: string;
  user: string;
  /** Turnos anteriores (já sanitizados) — contam para o orçamento de contexto. */
  history?: readonly string[];
  maxInputTokens: number;
}): AgentGuardError | null {
  const consumed =
    estimatePromptTokens(opts.system) +
    estimatePromptTokens(opts.user) +
    (opts.history ?? []).reduce((acc, turn) => acc + estimatePromptTokens(turn), 0);
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

/**
 * Normaliza a mensagem do utilizador e capa o tamanho.
 * Por omissão colapsa todo o whitespace (comportamento histórico); com
 * `preserveNewlines: true` mantém parágrafos/quebras de linha — indicado para
 * chat, onde colapsar `\n` destrói formatação do utilizador.
 */
export function sanitizeUserMessage(
  message: string,
  maxChars: number = 4000,
  opts: { preserveNewlines?: boolean } = {},
): string {
  if (!opts.preserveNewlines) {
    return message.replace(/\s+/g, " ").trim().slice(0, maxChars);
  }
  const lines = message
    .replace(/[^\S\n]+/g, " ")
    .split("\n")
    .map((line) => line.trim());
  const collapsed: string[] = [];
  for (const line of lines) {
    if (line === "" && collapsed[collapsed.length - 1] === "") continue;
    collapsed.push(line);
  }
  return collapsed.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxChars);
}