import type { AgentConfig } from "./types.js";

/** Registo declarativo dos agents — novo agent = novo ficheiro de prompts + linha aqui. */
export const AGENTS = {
  assistant: {
    key: "ai_assistant",
    featureKey: "ai_assistant",
    label: "Assistente comercial (IA)",
    tier: "flash",
    temperature: 0.7,
    maxOutputTokens: 1200,
    maxInputTokens: 8000,
    maxSteps: 5,
  },
  proposalWriter: {
    key: "ai_proposal_generation",
    featureKey: "ai_proposal_generation",
    label: "Geração de propostas (IA)",
    // Propostas exigem redacção cuidada e o volume é baixo (uma por submissão):
    // aqui a qualidade do `pro` compensa o custo extra.
    tier: "pro",
    temperature: 0.5,
    maxOutputTokens: 1200,
    maxInputTokens: 8000,
  },
  responseSupport: {
    key: "ai_response_support",
    featureKey: "ai_response_support",
    label: "Apoio à preparação de respostas (IA)",
    tier: "flash",
    temperature: 0.6,
    maxOutputTokens: 1200,
    maxInputTokens: 8000,
  },
  /**
   * Assistente de perfil público — conversa com visitantes autenticados sobre
   * a empresa (serviços, garantias, contactos). Gate próprio
   * (`ai_profile_assistant`, com fallback a `ai_assistant` para planos
   * anteriores) e metering próprio para separar custos.
   */
  profileAssistant: {
    key: "ai_profile_assistant",
    featureKey: "ai_profile_assistant",
    label: "Assistente do perfil público (IA)",
    tier: "flash",
    temperature: 0.6,
    maxOutputTokens: 1200,
    maxInputTokens: 8000,
  },
} as const satisfies Record<string, AgentConfig>;

export type AgentName = keyof typeof AGENTS;

export const AGENT_CONFIGS: readonly AgentConfig[] = Object.values(AGENTS);