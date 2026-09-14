import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { guardCostBudget, guardInputBudget, guardOutputBudget } from "../guardrails.js";
import { buildUsageRecord, ZERO_USAGE } from "../usage.js";
import type { AgentRunResult, AgentRunStatus, RunAgentOptions } from "../types.js";

/** Helper tipo para `Output.object({ schema })` — evita importar `ai` no consumidor. */
export function structuredOutput<T extends z.ZodType<unknown>>(schema: T) {
  return { type: "object" as const, schema };
}

/** Classifica erros do AI SDK num código estável para metering + resposta. */
export function classifyAgentError(err: unknown): { code: string; status: AgentRunStatus } {
  const text = (err instanceof Error ? `${err.name} ${err.message}` : String(err)).toLowerCase();
  if (text.includes("rate limit") || text.includes("429") || text.includes("too many requests")) {
    return { code: "RATE_LIMITED", status: "rate_limited" };
  }
  if (text.includes("content") && (text.includes("filter") || text.includes("policy") || text.includes("safety"))) {
    return { code: "CONTENT_FILTERED", status: "error" };
  }
  if (text.includes("invalid") || text.includes("no generated") || text.includes("json") || text.includes("parse")) {
    return { code: "INVALID_OUTPUT", status: "error" };
  }
  if (text.includes("api connection") || text.includes("fetch failed") || text.includes("enotfound") || text.includes("etimedout") || text.includes("timeout")) {
    return { code: "PROVIDER_ERROR", status: "error" };
  }
  return { code: "AI_ERROR", status: "error" };
}

function extractSdkCost(cost: unknown): number | null {
  if (typeof cost === "number") return Number.isFinite(cost) ? cost : null;
  if (cost && typeof cost === "object") {
    const c = cost as Record<string, unknown>;
    for (const key of ["totalCost", "cost", "total", "amount"]) {
      const v = c[key];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
  }
  return null;
}

type RawResult = {
  text?: string | undefined;
  output?: unknown;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;
  cost?: unknown;
};

function runGuard(options: RunAgentOptions, guard: { code: string; message: string }, now: number): AgentRunResult {
  return {
    text: "",
    output: undefined,
    model: options.model,
    providerId: options.providerId,
    status: "guardrail_blocked",
    errorCode: guard.code,
    usage: ZERO_USAGE,
    durationMs: now,
  };
}

/**
 * Executa um agent num único generateText (sem streaming — MVP).
 * Devolve sempre um resultado tipado (inclusive em falha) para que o chamador
 * consiga registar o uso/metering com o status correcto.
 */
export async function runAgent(model: LanguageModel, options: RunAgentOptions): Promise<AgentRunResult> {
  const startedAt = Date.now();

  const inputGuard = guardInputBudget({ system: options.system, user: options.user, maxInputTokens: options.maxInputTokens });
  if (inputGuard) return runGuard(options, inputGuard, Date.now() - startedAt);

  let raw: RawResult;
  try {
    raw = options.output
      ? ((await generateText({
          model,
          system: options.system,
          prompt: options.user,
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
          output: Output.object({ schema: options.output.schema }),
        })) as RawResult)
      : ((await generateText({
          model,
          system: options.system,
          prompt: options.user,
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
        })) as RawResult);
  } catch (err) {
    const { code, status } = classifyAgentError(err);
    return {
      text: "",
      output: undefined,
      model: options.model,
      providerId: options.providerId,
      status,
      errorCode: code,
      usage: ZERO_USAGE,
      durationMs: Date.now() - startedAt,
    };
  }

  const inputTokens = raw.usage?.inputTokens ?? 0;
  const outputTokens = raw.usage?.outputTokens ?? 0;
  const usage = buildUsageRecord({
    providerId: options.providerId,
    tier: options.tier,
    inputTokens,
    outputTokens,
    sdkCostUsd: extractSdkCost(raw.cost),
  });

  const outputGuard = guardOutputBudget({ outputTokens, maxOutputTokens: options.maxOutputTokens });
  if (outputGuard) {
    return { ...runGuard(options, outputGuard, Date.now() - startedAt), usage };
  }
  const costGuard = guardCostBudget({ estimatedCostUsd: usage.estimatedCostUsd, maxCostUsd: options.maxCostUsd });
  if (costGuard) {
    return { ...runGuard(options, costGuard, Date.now() - startedAt), usage, errorCode: "COST_EXCEEDED" };
  }

  return {
    text: raw.text ?? "",
    output: raw.output,
    model: options.model,
    providerId: options.providerId,
    status: "ok",
    errorCode: null,
    usage,
    durationMs: Date.now() - startedAt,
  };
}