// ── Constantes de modelos (FONTE DE VERDADE) ──────────────────────────────
// Actualizar um modelo = editar UMA linha aqui (ex: gemini-3.8-flash →
// gemini-3.9-flash). Nunca espalhar IDs de modelo pelo código.

export const AI_PROVIDERS = ["google", "anthropic", "openai", "mock"] as const;

export const MODEL_TIERS = {
  /** Rápido e barato — suficiente para a maioria dos agentes. */
  flash: {
    google: "gemini-3.8-flash",
    anthropic: "claude-haiku-4-5",
    openai: "gpt-5-mini",
  },
  /** Qualidade superior — para tarefas que exigem mais cuidado. */
  pro: {
    google: "gemini-3.8-pro",
    anthropic: "claude-sonnet-4-5",
    openai: "gpt-5",
  },
} as const;

/** Preços USD por 1M tokens (input/output) — fallback de estimativa de custo
 *  quando o AI SDK não devolve `cost` para o provider/modelo. */
export const MODEL_PRICES = {
  flash: {
    google: { input: 0.75, output: 3.75 },
    anthropic: { input: 1.0, output: 5.0 },
    openai: { input: 0.4, output: 1.6 },
  },
  pro: {
    google: { input: 2.5, output: 15.0 },
    anthropic: { input: 3.0, output: 15.0 },
    openai: { input: 1.25, output: 10.0 },
  },
} as const;

/** Orçamentos por defeito de cada execução — sobrescritos por env quando existir. */
export const DEFAULT_BUDGETS = {
  maxInputTokens: 8000,
  maxOutputTokens: 2000,
  maxCostUsd: 0.05,
} as const;