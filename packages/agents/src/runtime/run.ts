import { generateText, Output, stepCountIs, tool as sdkTool, type LanguageModel, type ToolSet } from "ai";
import { z } from "zod";
import { AgentGuardError, estimatePromptTokens, guardCostBudget, guardInputBudget, guardOutputBudget } from "../guardrails.js";
import { buildUsageRecord, maxAffordableOutputTokens, ZERO_USAGE } from "../usage.js";
import type { AgentMessage, AgentRunResult, AgentRunStatus, AgentTool, AgentToolCall, RunAgentOptions } from "../types.js";

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

export function extractSdkCost(cost: unknown): number | null {
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
  steps?: { toolCalls?: { toolName?: string; args?: unknown }[] }[] | undefined;
};

/** Tecto de segurança: nenhuma execução com tools passa deste nº de passos. */
export const MAX_TOOL_STEPS = 8;

/** Trunca o valor devolvido por uma tool para não rebentar o contexto. */
function truncateToolOutput(value: unknown, maxChars = 6000): unknown {
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (text.length <= maxChars) return value;
    return { truncated: true, preview: text.slice(0, maxChars) };
  } catch {
    return { truncated: true, preview: "[valor não serializável]" };
  }
}

/**
 * Envolve o `execute` de uma tool: nunca lança — devolve erro estruturado
 * que o modelo consegue interpretar e contornar na resposta.
 */
export async function executeToolSafely(def: AgentTool, input: unknown): Promise<unknown> {
  try {
    return truncateToolOutput(await def.execute(input));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha na ferramenta" };
  }
}

export function toSdkTools(tools: AgentTool[] | undefined): ToolSet | undefined {
  if (!tools || tools.length === 0) return undefined;
  const set: ToolSet = {};
  for (const def of tools) {
    set[def.name] = sdkTool({
      description: def.description,
      inputSchema: def.inputSchema,
      execute: (input: unknown) => executeToolSafely(def, input),
    }) as ToolSet[string];
  }
  return set;
}

function collectToolCalls(raw: RawResult): { toolCalls: AgentToolCall[]; steps: number } {
  const steps = raw.steps ?? [];
  const toolCalls: AgentToolCall[] = [];
  for (const step of steps) {
    for (const call of step.toolCalls ?? []) {
      if (call.toolName) toolCalls.push({ name: call.toolName, args: call.args });
    }
  }
  return { toolCalls, steps: steps.length };
}

/** Mensagem do SDK numa linha, truncada — o código vai para `errorCode`. */
export function truncateSdkMessage(err: unknown, max = 300): string | null {
  const msg = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ").trim();
  return msg ? msg.slice(0, max) : null;
}

/**
 * Monta o prompt do utilizador para a segunda tentativa de output estruturado:
 * o pedido original mais o motivo da rejeição (erros Zod ou validação de
 * conteúdo), para o modelo corrigir em vez de repetir o mesmo erro.
 */
export function buildStructuredRetryUserPrompt(baseUser: string, feedback: string): string {
  return `${baseUser}\n\nA resposta anterior foi rejeitada: ${feedback} Responde apenas com o objecto JSON válido.`;
}

/** Resultado bloqueado por guardrail — partilhado com `streamAgent`. */
export function blockedResult(options: RunAgentOptions, guard: { code: string; message: string }, now: number): AgentRunResult {
  return {
    text: "",
    output: undefined,
    model: options.model,
    providerId: options.providerId,
    status: "guardrail_blocked",
    errorCode: guard.code,
    usage: ZERO_USAGE,
    durationMs: now,
    toolCalls: [],
    steps: 0,
  };
}

/**
 * Normaliza o histórico: capa cada turno para evitar crescimento ilimitado do
 * contexto quando o chamador acumula turnos sem sanitizar.
 */
export function normalizeHistory(history: AgentMessage[] | undefined, maxCharsPerTurn = 4000): AgentMessage[] {
  if (!history || history.length === 0) return [];
  return history
    .filter((turn) => turn && typeof turn.text === "string" && turn.text.trim().length > 0)
    .map((turn) => ({ role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const), text: turn.text.slice(0, maxCharsPerTurn) }));
}

/**
 * Executa um agent via generateText (sem streaming — ver `streamAgent`).
 * Sem tools: tiro único (comportamento actual). Com tools: ciclo
 * ferramenta→modelo até `maxSteps` (omissão 5, tecto 8).
 * Antes de chamar o modelo, o custo do pior caso é estimado e o output é
 * capado ao orçamento — em vez de pagar a chamada e bloquear depois.
 * Devolve sempre um resultado tipado (inclusive em falha) para que o chamador
 * consiga registar o uso/metering com o status correcto.
 */
export async function runAgent(model: LanguageModel, options: RunAgentOptions): Promise<AgentRunResult> {
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;
  const emptyToolCalls = (): Pick<AgentRunResult, "toolCalls" | "steps"> => ({ toolCalls: [], steps: 0 });

  const history = normalizeHistory(options.history);
  const historyTexts = history.map((turn) => turn.text);
  const inputGuard = guardInputBudget({ system: options.system, user: options.user, history: historyTexts, maxInputTokens: options.maxInputTokens });
  if (inputGuard) return { ...blockedResult(options, inputGuard, elapsed()), ...emptyToolCalls() };

  // Preflight: estima o input e capa o output ao orçamento. Se nem o input
  // cabe, bloqueia SEM chamar o modelo (custo zero).
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
      ...blockedResult(options, new AgentGuardError("COST_EXCEEDED", `Orçamento esgotado pelo contexto (≈${estimatedInputTokens} tokens est.) — máx $${options.maxCostUsd}`), elapsed()),
      ...emptyToolCalls(),
    };
  }

  const sdkTools = toSdkTools(options.tools);
  const maxSteps = sdkTools ? Math.min(Math.max(options.maxSteps ?? 5, 1), MAX_TOOL_STEPS) : 1;

  let raw: RawResult;
  try {
    const conversation =
      history.length > 0
        ? { messages: [...history.map((turn) => ({ role: turn.role, content: turn.text })), { role: "user" as const, content: options.user }] }
        : { prompt: options.user };
    const base = {
      model,
      system: options.system,
      ...conversation,
      temperature: options.temperature,
      maxOutputTokens: effectiveMaxOutputTokens,
      ...(sdkTools ? { tools: sdkTools, stopWhen: stepCountIs(maxSteps) } : {}),
    };
    raw = options.output
      ? ((await generateText({ ...base, output: Output.object({ schema: options.output.schema }) })) as RawResult)
      : ((await generateText(base)) as RawResult);
  } catch (err) {
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
      durationMs: elapsed(),
      ...emptyToolCalls(),
    };
  }

  const { toolCalls, steps } = collectToolCalls(raw);
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
    return { ...blockedResult(options, outputGuard, elapsed()), usage, toolCalls, steps };
  }
  const costGuard = guardCostBudget({ estimatedCostUsd: usage.estimatedCostUsd, maxCostUsd: options.maxCostUsd });
  if (costGuard) {
    return { ...blockedResult(options, costGuard, elapsed()), usage, errorCode: "COST_EXCEEDED", toolCalls, steps };
  }

  return {
    text: raw.text ?? "",
    output: raw.output,
    model: options.model,
    providerId: options.providerId,
    status: "ok",
    errorCode: null,
    usage,
    durationMs: elapsed(),
    toolCalls,
    steps,
  };
}