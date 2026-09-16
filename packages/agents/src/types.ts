import type { z } from "zod";
import type { FeatureKey } from "@workdeal/shared";

/** Provedores de LLM suportados pelo motor (AI SDK + adapters por provider). */
export type AiProviderId = "google" | "anthropic" | "openai" | "mock";

/** Nível/custo de modelo — `flash` (rápido/barato) vs `pro` (qualidade). */
export type ModelTier = "flash" | "pro";

/** Chaves dos agents — identidade de metering (1:1 com as FEATURE_KEYS de IA). */
export type AgentKey = "ai_assistant" | "ai_proposal_generation" | "ai_response_support" | "ai_profile_assistant";

export type AgentRunStatus = "ok" | "error" | "guardrail_blocked" | "rate_limited";

/** Pedido de output estruturado (Output.object) para `runAgent`. */
export interface StructuredOutput {
  type: "object";
  schema: z.ZodType<unknown>;
}

/**
 * Ferramenta chamável pelo modelo — definição pura (sem negócio).
 * A implementação concreta (`execute`) vive no consumidor (ex: API com DB);
 * o motor garante que `execute` nunca rebenta a execução (ver runAgent).
 */
export interface AgentTool {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
  execute: (input: unknown) => Promise<unknown>;
}

/** Chamada de ferramenta observada numa execução (transparência/metering). */
export interface AgentToolCall {
  name: string;
  args: unknown;
}

/** Opções de uma execução do motor — puro, sem contexto de negócio. */
export interface RunAgentOptions {
  providerId: AiProviderId;
  /** ID do modelo resolvido (models.ts) — usado para registo/metering. */
  model: string;
  tier: ModelTier;
  system: string;
  user: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxCostUsd: number;
  /** Output estruturado (Output.object) — sem schema, devolve texto simples. */
  output?: StructuredOutput;
  temperature?: number;
  /** Ferramentas com acesso a dados (via `execute` do consumidor). */
  tools?: AgentTool[];
  /**
   * Máximo de passos do ciclo ferramenta→modelo. Sem tools vale 1
   * (comportamento actual de tiro único); com tools, omissão 5.
   */
  maxSteps?: number;
}

export interface AgentUsageRecord {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** USD estimado (do SDK quando disponível, senão dos preços de referência). */
  estimatedCostUsd: number;
}

export interface AgentRunResult {
  text: string;
  output: unknown;
  model: string;
  providerId: AiProviderId;
  status: AgentRunStatus;
  errorCode: string | null;
  /** Mensagem original do provider/SDK (truncada) — para diagnóstico no admin. */
  errorDetail?: string | null;
  usage: AgentUsageRecord;
  durationMs: number;
  /** Ferramentas efectivamente chamadas (ordem de execução). */
  toolCalls: AgentToolCall[];
  /** Passos do ciclo ferramenta→modelo executados. */
  steps: number;
}

/** Config declarativa de um agent — liga o motor às features/budget. */
export interface AgentConfig {
  key: AgentKey;
  featureKey: FeatureKey;
  label: string;
  tier: ModelTier;
  temperature: number;
  maxOutputTokens: number;
  maxInputTokens: number;
}