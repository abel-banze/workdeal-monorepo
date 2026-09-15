import { describe, it, expect, vi, beforeEach } from "vitest";
import { MODEL_TIERS } from "@workdeal/agents";
import { encryptSecret } from "../lib/crypto.js";

const mocks = vi.hoisted(() => ({
  runAgent: vi.fn(),
  env: {
    AI_PROVIDER: "mock",
    GOOGLE_GENERATIVE_AI_API_KEY: undefined as string | undefined,
    ANTHROPIC_API_KEY: undefined as string | undefined,
    OPENAI_API_KEY: undefined as string | undefined,
    AI_MAX_INPUT_TOKENS: 8000,
    AI_MAX_OUTPUT_TOKENS: 2000,
    AI_MAX_COST_USD: 0.05,
    AI_CREDENTIALS_MASTER_KEY: undefined as string | undefined,
    PAYMENT_CURRENCY: "MZN",
  },
  repo: {
    getRuntimeSnapshot: vi.fn(),
    upsertSettings: vi.fn(),
    upsertCredential: vi.fn(),
    deleteCredential: vi.fn(),
    getUsageTotals: vi.fn(),
    getUsageByAgent: vi.fn(),
    getUsageByProvider: vi.fn(),
    getUsageDaily: vi.fn(),
    getRecentRuns: vi.fn(),
  },
}));

vi.mock("../env.js", () => ({ env: mocks.env }));
vi.mock("../repositories/ai-settings.repository.js", () => ({ aiSettingsRepository: mocks.repo }));
vi.mock("@workdeal/agents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workdeal/agents")>();
  return { ...actual, runAgent: mocks.runAgent };
});

import { aiSettingsService, __setRuntimeConfigOverride } from "./ai-settings.service.js";
import type { AiCredentialRow, AiSettingsRow } from "../repositories/ai-settings.repository.js";

const SETTINGS_ROW = (overrides: Partial<AiSettingsRow> = {}): AiSettingsRow => ({
  id: "default",
  provider: "google",
  modelOverrides: {},
  budgets: {},
  updatedAt: new Date(),
  ...overrides,
});

const CRED_ROW = (overrides: Partial<AiCredentialRow> = {}): AiCredentialRow => ({
  provider: "google",
  apiKeyEncrypted: "aes256gcm.v1.ignored",
  updatedAt: new Date(),
  ...overrides,
});

describe("aiSettingsService.getRuntimeConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setRuntimeConfigOverride(null);
    mocks.env.GOOGLE_GENERATIVE_AI_API_KEY = "sk-env-google";
    mocks.env.ANTHROPIC_API_KEY = "sk-env-anthropic";
    mocks.env.OPENAI_API_KEY = undefined;
    mocks.env.AI_PROVIDER = "mock";
    mocks.env.AI_CREDENTIALS_MASTER_KEY = "chave-mestra-de-teste-com-32-caracteres!";
    mocks.repo.getRuntimeSnapshot.mockResolvedValue({ settings: null, credentials: [] });
  });

  it("sem config na BD usa o env como fallback (provider, chaves, modelos, budgets)", async () => {
    mocks.env.AI_PROVIDER = "google";
    const rt = await aiSettingsService.getRuntimeConfig();

    expect(rt.activeProvider).toBe("google");
    expect(rt.apiKeyOf("google")).toBe("sk-env-google");
    expect(rt.apiKeyOf("anthropic")).toBe("sk-env-anthropic");
    expect(rt.apiKeyOf("openai")).toBeUndefined();
    expect(rt.modelOf("google", "flash")).toBe(MODEL_TIERS.flash.google);
    expect(rt.modelOf("anthropic", "pro")).toBe(MODEL_TIERS.pro.anthropic);
    expect(rt.budgets.maxInputTokens).toBe(8000);
    expect(rt.budgets.maxOutputTokens).toBe(2000);
    expect(rt.budgets.maxCostUsd).toBe(0.05);
  });

  it("a BD sobrepõe-se ao env (provider, override de modelo, budgets e credential encriptada)", async () => {
    mocks.env.AI_PROVIDER = "google";
    mocks.repo.getRuntimeSnapshot.mockResolvedValue({
      settings: SETTINGS_ROW({
        provider: "openai",
        modelOverrides: { flash: { openai: "gpt-4o-mini-fast" } },
        budgets: { maxInputTokens: 50000, maxCostUsd: 0.1 },
      }),
      credentials: [CRED_ROW({ provider: "openai", apiKeyEncrypted: encryptSecret("sk-bd-secreto") })],
    });

    const rt = await aiSettingsService.getRuntimeConfig();

    expect(rt.activeProvider).toBe("openai");
    expect(rt.apiKeyOf("openai")).toBe("sk-bd-secreto");
    // env key não deve sobrepor a credential guardada quando ambas existem
    expect(rt.apiKeyOf("google")).toBe("sk-env-google");
    expect(rt.modelOf("openai", "flash")).toBe("gpt-4o-mini-fast");
    expect(rt.modelOf("google", "flash")).toBe(MODEL_TIERS.flash.google);
    expect(rt.budgets.maxInputTokens).toBe(50000);
    expect(rt.budgets.maxOutputTokens).toBe(2000); // sem override → env
    expect(rt.budgets.maxCostUsd).toBe(0.1);
  });

  it("credential ilegível cai para a env key sem bloquear o motor", async () => {
    mocks.env.AI_PROVIDER = "google";
    mocks.repo.getRuntimeSnapshot.mockResolvedValue({
      settings: null,
      credentials: [CRED_ROW({ provider: "google", apiKeyEncrypted: "aes256gcm.v1.lixo.invalido" })],
    });

    const oracle = vi.spyOn(console, "error").mockImplementation(() => {});
    const rt = await aiSettingsService.getRuntimeConfig();
    expect(oracle).toHaveBeenCalled();
    oracle.mockRestore();
    expect(rt.apiKeyOf("google")).toBe("sk-env-google");
  });

  it("provider mock devolve mock sem chaves necessárias", async () => {
    const rt = await aiSettingsService.getRuntimeConfig();
    expect(rt.activeProvider).toBe("mock");
    expect(rt.apiKeyOf("mock")).toBeUndefined();
    expect(rt.modelOf("mock", "flash")).toBe("mock");
  });
});

describe("aiSettingsService.upsertCredential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setRuntimeConfigOverride(null);
  });

  it("exige AI_CREDENTIALS_MASTER_KEY antes de guardar na BD", async () => {
    mocks.env.AI_CREDENTIALS_MASTER_KEY = undefined;
    await expect(aiSettingsService.upsertCredential("google", "sk-x")).rejects.toMatchObject({ code: "MASTER_KEY_REQUIRED" });
    expect(mocks.repo.upsertCredential).not.toHaveBeenCalled();
  });

  it("encripta a chave antes de persistir", async () => {
    mocks.env.AI_CREDENTIALS_MASTER_KEY = "chave-mestra-de-teste-com-32-caracteres!";
    mocks.repo.upsertCredential.mockImplementation(async (_p, encrypted) => CRED_ROW({ provider: "google", apiKeyEncrypted: encrypted }));

    const res = await aiSettingsService.upsertCredential("google", "sk-secret");
    expect(res).toMatchObject({ provider: "google" });
    const encrypted = mocks.repo.upsertCredential.mock.calls[0]![1] as string;
    expect(encrypted.startsWith("aes256gcm.v1.")).toBe(true);
    expect(encrypted).not.toContain("sk-secret");
  });
});

describe("aiSettingsService.testConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setRuntimeConfigOverride(null);
    mocks.repo.getRuntimeSnapshot.mockResolvedValue({ settings: null, credentials: [] });
  });

  it("modo mock devolve ok sem integração real", async () => {
    mocks.env.AI_PROVIDER = "mock";
    const res = await aiSettingsService.testConnection();
    expect(res.ok).toBe(true);
    expect(res.model).toBe("mock");
  });

  it("provider real sem chave devolve ok:false com mensagem", async () => {
    mocks.env.AI_PROVIDER = "openai";
    const res = await aiSettingsService.testConnection();
    expect(res.ok).toBe(false);
    expect(res.message).toContain("Sem API key");
  });

  it("falha do provider expõe o detalhe do erro na mensagem", async () => {
    mocks.env.AI_PROVIDER = "openai";
    mocks.env.OPENAI_API_KEY = "sk-test";
    mocks.runAgent.mockResolvedValue({
      text: "",
      output: undefined,
      model: "gpt-5-mini",
      providerId: "openai",
      status: "error",
      errorCode: "AI_ERROR",
      errorDetail: "401 - Incorrect API key provided",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
      durationMs: 115,
    });
    const res = await aiSettingsService.testConnection();
    expect(res.ok).toBe(false);
    expect(res.message).toContain("AI_ERROR");
    expect(res.message).toContain("Incorrect API key");
    mocks.env.OPENAI_API_KEY = undefined;
  });
});

describe("aiSettingsService.updateSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setRuntimeConfigOverride(null);
  });

  it("persiste e invalida a cache runtime", async () => {
    mocks.repo.upsertSettings.mockImplementation(async (data) =>
      SETTINGS_ROW({ provider: data.provider, modelOverrides: data.modelOverrides, budgets: data.budgets }),
    );

    const res = await aiSettingsService.updateSettings({
      provider: "anthropic",
      modelOverrides: {
        flash: { google: "", anthropic: "claude-haiku-x", openai: "" },
        pro: { google: "", anthropic: "", openai: "" },
      },
      budgets: { maxInputTokens: 10000 },
    });
    expect(res).toMatchObject({ provider: "anthropic" });
    expect(mocks.repo.upsertSettings).toHaveBeenCalledWith({
      provider: "anthropic",
      modelOverrides: {
        flash: { google: "", anthropic: "claude-haiku-x", openai: "" },
        pro: { google: "", anthropic: "", openai: "" },
      },
      budgets: { maxInputTokens: 10000 },
    });

    // A cache foi invalidada → novo snapshot é lido da repo.
    mocks.repo.getRuntimeSnapshot.mockResolvedValue({
      settings: SETTINGS_ROW({
        provider: "anthropic",
        modelOverrides: {
          flash: { google: "", anthropic: "claude-haiku-x", openai: "" },
          pro: { google: "", anthropic: "", openai: "" },
        },
        budgets: { maxInputTokens: 10000 },
      }),
      credentials: [],
    });
    const rt = await aiSettingsService.getRuntimeConfig();
    expect(rt.activeProvider).toBe("anthropic");
    expect(rt.modelOf("anthropic", "flash")).toBe("claude-haiku-x");
  });
});