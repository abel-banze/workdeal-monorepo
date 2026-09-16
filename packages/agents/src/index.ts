// @workdeal/agents — motor de IA para agentes Workdeal
// Motor puro (sem I/O a BD). Camada API (apps/api) compõe tools/context/metering.

// ── Tipos e constantes ─────────────────────────────────────────────────────
export type { AiProviderId, ModelTier, AgentKey, AgentRunStatus, AgentUsageRecord, AgentRunResult, RunAgentOptions, AgentConfig, StructuredOutput, AgentTool, AgentToolCall } from "./types.js";
export { executeToolSafely, MAX_TOOL_STEPS } from "./runtime/run.js";
export { AI_PROVIDERS, MODEL_TIERS, MODEL_PRICES, DEFAULT_BUDGETS } from "./models.js";

// ── Provider / motor ───────────────────────────────────────────────────────
export { createModel, resolveModelId, AgentProviderError } from "./provider.js";
export { runAgent, classifyAgentError, structuredOutput } from "./runtime/run.js";
export { mockResult } from "./runtime/mock.js";

// ── Guardrails e utilidades ────────────────────────────────────────────────
export { AgentGuardError, guardInputBudget, guardOutputBudget, guardCostBudget, sanitizeUserMessage, estimateInputTokens } from "./guardrails.js";
export { estimateCostUsd, buildUsageRecord, ZERO_USAGE } from "./usage.js";

// ── Agent configs (registo declarativo) ─────────────────────────────────────
export { AGENTS, AGENT_CONFIGS, type AgentName } from "./agents.js";

// ── Prompts (tipos de contexto + builders) ──────────────────────────────────
export type { AssistantContext } from "./prompts/assistant.js";
export { buildAssistantSystemPrompt, buildAssistantUserPrompt, mockAssistantReply } from "./prompts/assistant.js";

export type { ProposalWriterContext } from "./prompts/proposal-writer.js";
export { proposalMessageSchema, buildProposalSystemPrompt, buildProposalUserPrompt, mockProposalMessage, type ProposalMessage } from "./prompts/proposal-writer.js";

export type { ResponseContextType, ResponseSupportContext } from "./prompts/response-support.js";
export { responseMessageSchema, buildResponseSystemPrompt, buildResponseUserPrompt, mockResponseMessage, type ResponseMessage } from "./prompts/response-support.js";

export type { ProfileAssistantContext, ProfileAssistantSuggest } from "./prompts/profile-assistant.js";
export {
  profileAssistantSuggestSchema,
  profileAssistantReplySchema,
  buildProfileAssistantSystemPrompt,
  buildProfileAssistantUserPrompt,
  mockProfileAssistantReply,
  estimateProfileAssistantContextTokens,
  type ProfileAssistantReply,
} from "./prompts/profile-assistant.js";