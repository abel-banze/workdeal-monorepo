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