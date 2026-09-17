import { streamText, Output, stepCountIs, type LanguageModel } from "ai";
import { AgentGuardError, estimatePromptTokens, guardCostBudget, guardInputBudget, guardOutputBudget } from "../guardrails.js";
import { buildUsageRecord, maxAffordableOutputTokens, ZERO_USAGE } from "../usage.js";
import type { AgentRunResult, AgentToolCall, RunAgentOptions } from "../types.js";
import { blockedResult, classifyAgentError, extractSdkCost, MAX_TOOL_STEPS, normalizeHistory, toSdkTools, truncateSdkMessage } from "./run.js";

/** Streaming de um agent: deltas de texto em tempo real + resultado final tipado. */
export interface AgentStreamHandle {
  /** Fragmentos de texto por ordem de chegada (pode ser vazio em output estruturado). */
  deltas: AsyncIterable<string>;
  /**
   * Resultado final — resolve quando o stream termina (com o texto completo,
   * usage/metering e status). Rejeita nunca: falhas vêm em `status`.
   */
  completion: Promise<AgentRunResult>;
}

interface StreamStep {
  toolCalls?: { toolName?: string; args?: unknown; input?: unknown }[] | undefined;
}

/** Forma mínima do resultado de `streamText` usada pelo motor. */
interface RawStream {
  textStream: AsyncIterable<unknown>;
  text: Promise<string> | string;
  output?: Promise<unknown> | unknown;
  usage?: Promise<unknown> | unknown;
  steps?: Promise<StreamStep[] | undefined> | StreamStep[] | undefined;
  cost?: unknown;
}

async function* emptyDeltas(): AsyncGenerator<string> {
  // Intencionalmente vazio: caminhos bloqueados não emitem deltas.
  return;
}

function errorResult(
  options: RunAgentOptions,
  err: unknown,
  durationMs: number,
): AgentRunResult {
  const { code, status } = classifyAgentError(err);
  return {
    text: "",
    output: undefined,
    model: options.model,
    providerId: options.providerId,
    status,
    errorCode: code,
    errorDetail: truncateSdkMessage(err),
    usage: ZERO_USAGE,
    durationMs,
    toolCalls: [],
    steps: 0,
  };
}

async function resolveStreamUsage(raw: RawStream): Promise<{ inputTokens: number; outputTokens: number }> {
  try {
    const usage = await raw.usage;
    if (usage && typeof usage === "object") {
      const rec = usage as Record<string, unknown>;
      const input = Number(rec.inputTokens ?? rec.promptTokens ?? 0);
      const output = Number(rec.outputTokens ?? rec.completionTokens ?? 0);
      return {
        inputTokens: Number.isFinite(input) && input > 0 ? Math.round(input) : 0,
        outputTokens: Number.isFinite(output) && output > 0 ? Math.round(output) : 0,
      };
    }
  } catch {
    // SDK sem usage — cai para zeros, o custo estima-se a 0
  }
  return { inputTokens: 0, outputTokens: 0 };
}

async function resolveStreamCost(raw: RawStream): Promise<number | null> {
  try {
    const cost = raw.cost;
    const value = cost && typeof (cost as PromiseLike<unknown>).then === "function" ? await cost : cost;
    return extractSdkCost(value);
  } catch {
    return null;
  }
}

async function resolveStreamSteps(raw: RawStream): Promise<{ toolCalls: AgentToolCall[]; steps: number }> {
  try {
    const steps = await raw.steps;
    if (!Array.isArray(steps)) return { toolCalls: [], steps: 0 };
    const toolCalls: AgentToolCall[] = [];
    for (const step of steps) {
      for (const call of step?.toolCalls ?? []) {
        if (call?.toolName) toolCalls.push({ name: call.toolName, args: call.args ?? call.input });
      }
    }
    return { toolCalls, steps: steps.length };
  } catch {
    return { toolCalls: [], steps: 0 };
  }
}

/**
 * Executa um agent em streaming (texto progressivo para chat).
 * Aplica os mesmos guardrails do `runAgent` — input, preflight de custo com
 * cap de output — e devolve sempre um handle: em bloqueio, `deltas` vem vazio
 * e `completion` resolve o resultado `guardrail_blocked` sem chamar o modelo.
 */
export async function streamAgent(model: LanguageModel, options: RunAgentOptions): Promise<AgentStreamHandle> {
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  const history = normalizeHistory(options.history);
  const historyTexts = history.map((turn) => turn.text);
  const inputGuard = guardInputBudget({ system: options.system, user: options.user, history: historyTexts, maxInputTokens: options.maxInputTokens });
  if (inputGuard) {
    return { deltas: emptyDeltas(), completion: Promise.resolve(blockedResult(options, inputGuard, elapsed())) };
  }

  const estimatedInputTokens =
    estimatePromptTokens(options.system) + estimatePromptTokens(options.user) + historyTexts.reduce((acc, text) => acc + estimatePromptTokens(text), 0);
  const effectiveMaxOutputTokens = maxAffordableOutputTokens({
    providerId: options.providerId,
    tier: options.tier,
    estimatedInputTokens,
    maxOutputTokens: options.maxOutputTokens,
    maxCostUsd: options.maxCostUsd,
  });
  if (effectiveMaxOutputTokens < 1) {
    return {
      deltas: emptyDeltas(),
      completion: Promise.resolve(
        blockedResult(
          options,
          new AgentGuardError("COST_EXCEEDED", `Orçamento esgotado pelo contexto (≈${estimatedInputTokens} tokens est.) — máx $${options.maxCostUsd}`),
          elapsed(),
        ),
      ),
    };
  }

  const sdkTools = toSdkTools(options.tools);
  const maxSteps = sdkTools ? Math.min(Math.max(options.maxSteps ?? 5, 1), MAX_TOOL_STEPS) : 1;

  let raw: RawStream;
  try {
    const conversation =
      history.length > 0
        ? { messages: [...history.map((turn) => ({ role: turn.role, content: turn.text })), { role: "user" as const, content: options.user }] }
        : { prompt: options.user };
    raw = streamText({
      model,
      system: options.system,
      ...conversation,
      temperature: options.temperature,
      maxOutputTokens: effectiveMaxOutputTokens,
      ...(sdkTools ? { tools: sdkTools, stopWhen: stepCountIs(maxSteps) } : {}),
      ...(options.output ? { output: Output.object({ schema: options.output.schema }) } : {}),
    }) as unknown as RawStream;
  } catch (err) {
    return { deltas: emptyDeltas(), completion: Promise.resolve(errorResult(options, err, elapsed())) };
  }

  // Fan-out: a bomba consome o stream UMA vez; os deltas vão para a fila e o
  // `completion` resolve no fim. Sinais sem polling — JS é single-threaded, o
  // executor da promessa corre de forma síncrona, por isso não há race.
  const queue: string[] = [];
  let finished = false;
  let waiter: (() => void) | null = null;
  const signal = () => {
    const w = waiter;
    waiter = null;
    w?.();
  };

  const completion: Promise<AgentRunResult> = (async () => {
    try {
      for await (const chunk of raw.textStream) {
        const delta = typeof chunk === "string" ? chunk : (chunk as { text?: unknown })?.text;
        if (typeof delta === "string" && delta) {
          queue.push(delta);
          signal();
        }
      }
      const text = typeof raw.text === "string" ? raw.text : await raw.text;
      const output = options.output ? await raw.output : undefined;
      const [{ inputTokens, outputTokens }, sdkCostUsd, { toolCalls, steps }] = await Promise.all([
        resolveStreamUsage(raw),
        resolveStreamCost(raw),
        resolveStreamSteps(raw),
      ]);
      const usage = buildUsageRecord({ providerId: options.providerId, tier: options.tier, inputTokens, outputTokens, sdkCostUsd });

      const outputGuard = guardOutputBudget({ outputTokens, maxOutputTokens: options.maxOutputTokens });
      if (outputGuard) return { ...blockedResult(options, outputGuard, elapsed()), usage, toolCalls, steps };
      const costGuard = guardCostBudget({ estimatedCostUsd: usage.estimatedCostUsd, maxCostUsd: options.maxCostUsd });
      if (costGuard) return { ...blockedResult(options, costGuard, elapsed()), usage, errorCode: "COST_EXCEEDED", toolCalls, steps };

      return {
        text: text ?? "",
        output,
        model: options.model,
        providerId: options.providerId,
        status: "ok",
        errorCode: null,
        usage,
        durationMs: elapsed(),
        toolCalls,
        steps,
      };
    } catch (err) {
      return errorResult(options, err, elapsed());
    } finally {
      finished = true;
      signal();
    }
  })();

  async function* deltas(): AsyncGenerator<string> {
    let index = 0;
    for (;;) {
      while (index < queue.length) {
        const delta = queue[index] as string;
        index += 1;
        yield delta;
      }
      if (finished) return;
      await new Promise<void>((resolve) => {
        waiter = resolve;
        if (index < queue.length || finished) {
          waiter = null;
          resolve();
        }
      });
    }
  }

  return { deltas: deltas(), completion };
}
