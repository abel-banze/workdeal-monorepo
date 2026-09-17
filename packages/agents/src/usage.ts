import { MODEL_PRICES } from "./models.js";
import type { AgentUsageRecord, AiProviderId, ModelTier } from "./types.js";

/** Estimativa de custo USD a partir dos preços de referência por modelo. */
export function estimateCostUsd(providerId: AiProviderId, tier: ModelTier, inputTokens: number, outputTokens: number): number {
  if (providerId === "mock") return 0;
  const p = MODEL_PRICES[tier][providerId];
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildUsageRecord(opts: {
  providerId: AiProviderId;
  tier: ModelTier;
  inputTokens: number;
  outputTokens: number;
  /** Custo devolvido pelo SDK (quando o provider o calcula) — tem prioridade. */
  sdkCostUsd?: number | null;
}): AgentUsageRecord {
  const inputTokens = Math.max(0, Math.round(opts.inputTokens));
  const outputTokens = Math.max(0, Math.round(opts.outputTokens));
  const estimatedCostUsd =
    typeof opts.sdkCostUsd === "number" && Number.isFinite(opts.sdkCostUsd)
      ? roundTo(opts.sdkCostUsd, 6)
      : roundTo(estimateCostUsd(opts.providerId, opts.tier, inputTokens, outputTokens), 6);
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, estimatedCostUsd };
}

export const ZERO_USAGE: AgentUsageRecord = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 };

/**
 * Tecto de output comportável pelo orçamento ANTES de chamar o modelo.
 * Devolve o `maxOutputTokens` efectivo: o pedido original quando cabe no
 * orçamento, um valor menor quando só cabe uma resposta curta, ou 0 quando
 * nem o input estimado cabe — nesse caso o motor bloqueia sem gastar nada.
 */
export function maxAffordableOutputTokens(opts: {
  providerId: AiProviderId;
  tier: ModelTier;
  estimatedInputTokens: number;
  maxOutputTokens: number;
  maxCostUsd: number;
}): number {
  if (opts.providerId === "mock") return opts.maxOutputTokens;
  const prices = MODEL_PRICES[opts.tier][opts.providerId];
  const inputCost = (opts.estimatedInputTokens / 1_000_000) * prices.input;
  const remaining = opts.maxCostUsd - inputCost;
  if (remaining <= 0) return 0;
  const affordable = Math.floor((remaining / prices.output) * 1_000_000);
  return Math.min(opts.maxOutputTokens, affordable);
}