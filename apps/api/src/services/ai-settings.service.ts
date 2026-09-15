import {
  AGENTS,
  AI_PROVIDERS,
  createModel,
  DEFAULT_BUDGETS,
  MODEL_TIERS,
  runAgent,
  type AiProviderId,
  type ModelTier,
} from "@workdeal/agents";
import type { AiSettingsUpdateInput, AiUsageQueryInput } from "@workdeal/shared";
import { env } from "../env.js";
import { AppError } from "../lib/errors.js";
import { decryptSecret, encryptSecret, maskSecret } from "../lib/crypto.js";
import { aiSettingsRepository } from "../repositories/ai-settings.repository.js";
import { ttlCache } from "../lib/ttl-cache.js";

type RealProvider = "google" | "anthropic" | "openai";
const REAL_PROVIDERS: readonly RealProvider[] = ["google", "anthropic", "openai"];

const PROVIDER_LABELS: Record<string, string> = {
  mock: "Modo demo (mock)",
  google: "Google Gemini",
  anthropic: "Anthropic Claude",
  openai: "OpenAI GPT",
};

const ENV_KEY_BY_PROVIDER: Record<RealProvider, string | undefined> = {
  google: env.GOOGLE_GENERATIVE_AI_API_KEY,
  anthropic: env.ANTHROPIC_API_KEY,
  openai: env.OPENAI_API_KEY,
};

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

export type AiRuntimeConfig = {
  activeProvider: AiProviderId;
  apiKeyOf: (provider: AiProviderId) => string | undefined;
  modelOf: (provider: AiProviderId, tier: ModelTier) => string;
  budgets: { maxInputTokens: number; maxOutputTokens: number; maxCostUsd: number };
};

// Config runtime consolidada — TTL 30s para o motor não ir à BD a cada run,
// mas reflectir alterações do admin em ~30s.
const getRuntimeCached = ttlCache(resolveRuntimeConfig, 30_000);

// Override único para testes (agents.service.test.ts injeta configuração de env).
let _runtimeOverride: AiRuntimeConfig | null = null;
export function __setRuntimeConfigOverride(cfg: AiRuntimeConfig | null) {
  _runtimeOverride = cfg;
  getRuntimeCached.invalidate();
}

async function resolveRuntimeConfig(): Promise<AiRuntimeConfig> {
  if (_runtimeOverride) return _runtimeOverride;
  const snapshot = await aiSettingsRepository.getRuntimeSnapshot();
  const settings = snapshot.settings;

  const credentials: Partial<Record<RealProvider, string>> = {};
  for (const cred of snapshot.credentials) {
    if (REAL_PROVIDERS.includes(cred.provider as RealProvider)) {
      try {
        credentials[cred.provider as RealProvider] = decryptSecret(cred.apiKeyEncrypted);
      } catch (err) {
        // Credencial ilegível — cai para env (se existir). Não bloqueia o motor.
        console.error(`[ai-settings] credencial ${cred.provider} não desencriptável:`, err instanceof Error ? err.message : err);
      }
    }
  }

  const overrides = asRecord(settings?.modelOverrides);
  const budgets = asRecord(settings?.budgets);

  const modelOf = (provider: AiProviderId, tier: ModelTier): string => {
    if (provider === "mock") return "mock";
    const tierOverrides = asRecord(overrides[tier]);
    if (typeof tierOverrides[provider] === "string" && (tierOverrides[provider] as string).trim()) {
      return tierOverrides[provider] as string;
    }
    return MODEL_TIERS[tier][provider as RealProvider];
  };

  const envKey = (provider: RealProvider): string | undefined => ({
    google: env.GOOGLE_GENERATIVE_AI_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
  }[provider]);

  const apiKeyOf = (provider: AiProviderId): string | undefined =>
    provider === "mock" ? undefined : credentials[provider] ?? envKey(provider);

  const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback);

  const activeProvider: AiProviderId = settings?.provider && AI_PROVIDERS.includes(settings.provider as AiProviderId)
    ? (settings.provider as AiProviderId)
    : env.AI_PROVIDER;

  return {
    activeProvider,
    apiKeyOf,
    modelOf,
    budgets: {
      maxInputTokens: num(budgets.maxInputTokens, env.AI_MAX_INPUT_TOKENS ?? DEFAULT_BUDGETS.maxInputTokens),
      maxOutputTokens: num(budgets.maxOutputTokens, env.AI_MAX_OUTPUT_TOKENS ?? DEFAULT_BUDGETS.maxOutputTokens),
      maxCostUsd: num(budgets.maxCostUsd, env.AI_MAX_COST_USD ?? DEFAULT_BUDGETS.maxCostUsd),
    },
  };
}

export const aiSettingsService = {
  /** Config consolidada para o motor (agents.service). TTL 30s. */
  async getRuntimeConfig(): Promise<AiRuntimeConfig> {
    return getRuntimeCached();
  },

  // ── Admin: overview ─────────────────────────────────────────────────────

  async getAdminOverview() {
    const snapshot = await aiSettingsRepository.getRuntimeSnapshot();

    const providers = REAL_PROVIDERS.map((provider) => {
      const fromEnv = ENV_KEY_BY_PROVIDER[provider];
      const cred = snapshot.credentials.find((c) => c.provider === provider);
      return {
        provider,
        label: PROVIDER_LABELS[provider],
        hasEnvKey: Boolean(fromEnv),
        envKeyMasked: fromEnv ? maskSecret(fromEnv) : null,
        hasDbKey: Boolean(cred),
        dbKeyMasked: cred ? maskSecret(decryptSecretSafe(cred.apiKeyEncrypted)) : null,
        credentialUpdatedAt: cred?.updatedAt ?? null,
      };
    });

    const settings = snapshot.settings;
    const overrides = asRecord(settings?.modelOverrides);
    const budgets = asRecord(settings?.budgets);

    const modelMatrix: Record<ModelTier, Record<RealProvider, string>> = {
      flash: { google: "", anthropic: "", openai: "" },
      pro: { google: "", anthropic: "", openai: "" },
    };
    for (const tier of ["flash", "pro"] as const) {
      for (const provider of REAL_PROVIDERS) {
        const override = asRecord(overrides[tier])[provider];
        modelMatrix[tier][provider] =
          typeof override === "string" && override.trim() ? override : MODEL_TIERS[tier][provider];
      }
    }
    // Overrides efetivos guardados na BD (só os que o admin definiu).
    const savedOverrides: Partial<Record<ModelTier, Record<RealProvider, string>>> = {};
    for (const tier of ["flash", "pro"] as const) {
      const tierRec = asRecord(overrides[tier]);
      const keep: Record<RealProvider, string> = { google: "", anthropic: "", openai: "" };
      for (const provider of REAL_PROVIDERS) {
        const v = tierRec[provider];
        if (typeof v === "string" && v.trim()) keep[provider] = v;
      }
      savedOverrides[tier] = keep;
    }

    return {
      activeProvider:
        settings?.provider && AI_PROVIDERS.includes(settings.provider as AiProviderId)
          ? (settings.provider as AiProviderId)
          : env.AI_PROVIDER,
      envProvider: env.AI_PROVIDER,
      sources: {
        settings: settings
          ? { provider: settings.provider, updatedAt: settings.updatedAt, modelOverrides: settings.modelOverrides, budgets: settings.budgets }
          : null,
        env: {
          provider: env.AI_PROVIDER,
          hasAnyEnvKey: REAL_PROVIDERS.some((p) => Boolean(ENV_KEY_BY_PROVIDER[p])),
        },
      },
      providers,
      modelMatrix,
      savedOverrides,
      defaultMatrix: MODEL_TIERS,
      budgets: {
        maxInputTokens: resolveBudget(budgets, "maxInputTokens", env.AI_MAX_INPUT_TOKENS, DEFAULT_BUDGETS.maxInputTokens),
        maxOutputTokens: resolveBudget(budgets, "maxOutputTokens", env.AI_MAX_OUTPUT_TOKENS, DEFAULT_BUDGETS.maxOutputTokens),
        maxCostUsd: resolveBudget(budgets, "maxCostUsd", env.AI_MAX_COST_USD, DEFAULT_BUDGETS.maxCostUsd),
      },
      agents: Object.values(AGENTS).map((a) => ({ key: a.key, featureKey: a.featureKey, label: a.label, tier: a.tier })),
      masterKeyConfigured: Boolean(env.AI_CREDENTIALS_MASTER_KEY),
      providerLabels: PROVIDER_LABELS,
    };
  },

  // ── Admin: mutações ─────────────────────────────────────────────────────

  async updateSettings(input: AiSettingsUpdateInput) {
    const row = await aiSettingsRepository.upsertSettings({
      provider: input.provider,
      modelOverrides: (input.modelOverrides ?? {}) as Json,
      budgets: (input.budgets ?? {}) as Json,
    });
    getRuntimeCached.invalidate();
    return { provider: row.provider, updatedAt: row.updatedAt };
  },

  async upsertCredential(provider: RealProvider, apiKey: string) {
    if (!env.AI_CREDENTIALS_MASTER_KEY) {
      throw new AppError(400, "MASTER_KEY_REQUIRED", "AI_CREDENTIALS_MASTER_KEY não está configurada no servidor — impossível guardar credenciais na BD");
    }
    let encrypted: string;
    try {
      encrypted = encryptSecret(apiKey);
    } catch (err) {
      throw new AppError(500, "ENCRYPT_FAILED", err instanceof Error ? err.message : "Falha ao encriptar credencial");
    }
    const row = await aiSettingsRepository.upsertCredential(provider, encrypted);
    getRuntimeCached.invalidate();
    return { provider: row.provider, updatedAt: row.updatedAt };
  },

  async deleteCredential(provider: RealProvider) {
    const ok = await aiSettingsRepository.deleteCredential(provider);
    getRuntimeCached.invalidate();
    return ok;
  },

  async testConnection() {
    const runtime = await this.getRuntimeConfig();
    const provider = runtime.activeProvider;
    if (provider === "mock") {
      return { ok: true, provider, model: "mock", message: "Modo demo ativo — sem integração real." };
    }
    const tier: ModelTier = "flash";
    const model = runtime.modelOf(provider, tier);
    const apiKey = runtime.apiKeyOf(provider);
    if (!apiKey) {
      return { ok: false, provider, model, message: `Sem API key para ${PROVIDER_LABELS[provider]} — configura a credencial ou usa o env.` };
    }
    const started = Date.now();
    try {
      const lm = createModel(provider, tier, { modelId: model, apiKey });
      const result = await runAgent(lm, {
        providerId: provider,
        model,
        tier,
        system: "Responde apenas: OK",
        user: "ping",
        temperature: 0,
        maxInputTokens: 1000,
        maxOutputTokens: 16,
        maxCostUsd: 0.01,
      });
      return {
        ok: result.status === "ok",
        provider,
        model,
        message:
          result.status === "ok"
            ? "Ligação OK"
            : `Falha: ${result.errorCode ?? result.status}${result.errorDetail ? ` — ${result.errorDetail}` : ""}`,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      return {
        ok: false,
        provider,
        model,
        message: err instanceof Error ? err.message : "Falha de ligação",
        latencyMs: Date.now() - started,
      };
    }
  },

  // ── Telemetria (agent_usage) ────────────────────────────────────────────

  async getUsage(q: AiUsageQueryInput) {
    const [totals, byAgent, byProvider, daily, recent] = await Promise.all([
      aiSettingsRepository.getUsageTotals(q),
      aiSettingsRepository.getUsageByAgent(q),
      aiSettingsRepository.getUsageByProvider(q),
      aiSettingsRepository.getUsageDaily({ ...q, maxDays: 30 }),
      aiSettingsRepository.getRecentRuns(50),
    ]);
    return { totals, byAgent, byProvider, daily, recent };
  },
};

function resolveBudget(budgets: Json, key: string, envValue?: number, fallback?: number): number {
  const fromDb = budgets[key];
  if (typeof fromDb === "number" && Number.isFinite(fromDb) && fromDb > 0) return fromDb;
  if (typeof envValue === "number" && Number.isFinite(envValue) && envValue > 0) return envValue;
  return fallback ?? DEFAULT_BUDGETS.maxInputTokens;
}

function decryptSecretSafe(payload: string): string {
  try {
    return decryptSecret(payload);
  } catch {
    return "";
  }
}