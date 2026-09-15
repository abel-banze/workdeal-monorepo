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