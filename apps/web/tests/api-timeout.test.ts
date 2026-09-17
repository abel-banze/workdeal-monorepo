import { describe, expect, it, vi } from "vitest";
import {
  AI_API_TIMEOUT_MS,
  DEFAULT_API_TIMEOUT_MS,
  FEATURE_API_TIMEOUT_MS,
  fetchWithTimeoutRetry,
  isApiTimeoutError,
  resolveApiTimeoutMs,
} from "../lib/api-timeout";

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

  it("o gate de subscrição usa timeout intermédio (regressão: timeout 5s intermitente no chat do agente)", () => {
    // O pré-check `requireFeature` (`/subscriptions/current`) rebentava o
    // chat de vez em quando: leitura agregada com o timeout curto de 5s.
    expect(FEATURE_API_TIMEOUT_MS).toBe(15000);
    expect(FEATURE_API_TIMEOUT_MS).toBeGreaterThan(DEFAULT_API_TIMEOUT_MS);
    expect(FEATURE_API_TIMEOUT_MS).toBeLessThan(AI_API_TIMEOUT_MS);
  });
});

describe("fetchWithTimeoutRetry", () => {
  const timeoutErr = () => new Error("API timeout 5s: /api/v1/subscriptions/current?organizationId=x");

  it("detecta só erros de timeout do apiFetch", () => {
    expect(isApiTimeoutError(timeoutErr())).toBe(true);
    expect(isApiTimeoutError(new Error("Sessão expirada. Faça login novamente."))).toBe(false);
    expect(isApiTimeoutError(new Error("fetch failed"))).toBe(false);
    expect(isApiTimeoutError(null)).toBe(false);
  });

  it("não repete quando a primeira tentativa vence", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(fetchWithTimeoutRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("repete UMA vez no timeout e devolve o sucesso da segunda", async () => {
    const fn = vi.fn().mockRejectedValueOnce(timeoutErr()).mockResolvedValueOnce("ok");
    await expect(fetchWithTimeoutRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("não repete erros que não são timeout", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("FORBIDDEN"));
    await expect(fetchWithTimeoutRetry(fn)).rejects.toThrow("FORBIDDEN");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("desiste após a repetição se o timeout persistir", async () => {
    const fn = vi.fn().mockRejectedValue(timeoutErr());
    await expect(fetchWithTimeoutRetry(fn)).rejects.toThrow("API timeout");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
