import { describe, expect, it } from "vitest";
import { AI_API_TIMEOUT_MS, DEFAULT_API_TIMEOUT_MS, resolveApiTimeoutMs } from "../lib/api-timeout";

describe("api-timeout", () => {
  it("usa o timeout curto (5s) por omissão", () => {
    expect(resolveApiTimeoutMs()).toBe(DEFAULT_API_TIMEOUT_MS);
    expect(resolveApiTimeoutMs({})).toBe(DEFAULT_API_TIMEOUT_MS);
    expect(DEFAULT_API_TIMEOUT_MS).toBe(5000);
  });

  it("honra um timeoutMs explícito (usado pelas acções de IA)", () => {
    expect(resolveApiTimeoutMs({ timeoutMs: AI_API_TIMEOUT_MS })).toBe(90000);
    expect(resolveApiTimeoutMs({ timeoutMs: 15000 })).toBe(15000);
  });

  it("rejeita valores inválidos e cai para o padrão", () => {
    expect(resolveApiTimeoutMs({ timeoutMs: 0 })).toBe(DEFAULT_API_TIMEOUT_MS);
    expect(resolveApiTimeoutMs({ timeoutMs: -100 })).toBe(DEFAULT_API_TIMEOUT_MS);
    expect(resolveApiTimeoutMs({ timeoutMs: Number.NaN })).toBe(DEFAULT_API_TIMEOUT_MS);
  });

  it("o timeout de IA é folgado face a geração LLM (regressão: timeout 5s no chat)", () => {
    // O chat do assistente (`/assistant/chat`) gerava "API timeout 5s"
    // porque a geração LLM excede o timeout curto. Garante que o timeout
    // dedicado continua muito acima do padrão.
    expect(AI_API_TIMEOUT_MS).toBeGreaterThan(DEFAULT_API_TIMEOUT_MS * 10);
  });
});
