import { createAnthropic, anthropic } from "@ai-sdk/anthropic";
import { createGoogle, google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { MODEL_TIERS } from "./models.js";
import type { AiProviderId, ModelTier } from "./types.js";

export class AgentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentProviderError";
  }
}

/** ID do modelo para provider+tier. `mock` não tem modelo — lança erro. */
export function resolveModelId(providerId: AiProviderId, tier: ModelTier, overrideModelId?: string): string {
  if (overrideModelId && overrideModelId.trim()) return overrideModelId.trim();
  if (providerId === "mock") {
    throw new AgentProviderError("'mock' não tem modelo real — trata o caminho mock fora do motor");
  }
  return MODEL_TIERS[tier][providerId];
}

export type CreateModelOptions = {
  /** ID de modelo explícito (override gerido no admin) — senão usa MODEL_TIERS. */
  modelId?: string;
  /** API key explícita (credential gerida no admin) — senão o adapter lê do env. */
  apiKey?: string;
};

/**
 * Instância de modelo no AI SDK a partir do provider/tier configurados.
 * Por defeito as chaves de API são lidas pelo próprio adapter (@ai-sdk/*) do env:
 * google → GOOGLE_GENERATIVE_AI_API_KEY, anthropic → ANTHROPIC_API_KEY,
 * openai → OPENAI_API_KEY. Uma `apiKey`/`modelId` explícita sobrepõe o env/constante.
 */
export function createModel(providerId: AiProviderId, tier: ModelTier, options: CreateModelOptions = {}): LanguageModel {
  const id = resolveModelId(providerId, tier, options.modelId);
  if (!id) {
    throw new AgentProviderError(`Sem modelo para provider="${providerId}" tier="${tier}" — usa AI_PROVIDER válido ou 'mock'`);
  }
  switch (providerId) {
    case "google": {
      // Na SDK v4 a apiKey só é aceite no factory (create*), não na chamada do modelo.
      const provider = options.apiKey ? createGoogle({ apiKey: options.apiKey }) : google;
      return provider(id);
    }
    case "anthropic": {
      const provider = options.apiKey ? createAnthropic({ apiKey: options.apiKey }) : anthropic;
      return provider(id);
    }
    case "openai": {
      const provider = options.apiKey ? createOpenAI({ apiKey: options.apiKey }) : openai;
      return provider(id);
    }
    default:
      throw new AgentProviderError(`Provider desconhecido: ${providerId}`);
  }
}