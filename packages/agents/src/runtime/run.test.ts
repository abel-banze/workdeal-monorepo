import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: mocks.generateText,
  Output: {
    object: (args: unknown) => ({ type: "object", ...(args as object) }),
    text: () => ({ type: "text" }),
  },
}));

import { runAgent, classifyAgentError } from "./run.js";

function fakeModel() {
  return {} as never;
}

const BASE = {
  providerId: "openai" as const,
  model: "gpt-5-mini",
  tier: "flash" as const,
  system: "sistema",
  user: "olá!",
  maxInputTokens: 8000,
  maxOutputTokens: 2000,
  maxCostUsd: 0.05,
  temperature: 0.7,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runAgent", () => {
  it("returns ok with text output", async () => {
    mocks.generateText.mockResolvedValue({
      text: "Resposta gerada",
      usage: { inputTokens: 10, outputTokens: 5 },
    });
    const result = await runAgent(fakeModel(), BASE);
    expect(result.status).toBe("ok");
    expect(result.errorCode).toBeNull();
    expect(result.text).toBe("Resposta gerada");
    expect(result.usage.inputTokens).toBe(10);
    expect(result.usage.outputTokens).toBe(5);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("passes schema as structured output when provided", async () => {
    mocks.generateText.mockResolvedValue({
      text: "",
      output: { message: "Proposta válida com pelo menos vinte caracteres." },
      usage: { inputTokens: 20, outputTokens: 10 },
    });
    const schema = z.object({ message: z.string() });
    const result = await runAgent(fakeModel(), { ...BASE, output: { type: "object", schema } });
    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    const callArgs = mocks.generateText.mock.calls[0][0];
    expect(callArgs.output?.type).toBe("object");
    expect(result.status).toBe("ok");
    expect(result.output).toEqual({ message: "Proposta válida com pelo menos vinte caracteres." });
  });

  it("uses sdk cost when provided", async () => {
    mocks.generateText.mockResolvedValue({
      text: "ok",
      usage: { inputTokens: 1000, outputTokens: 500 },
      cost: { totalCost: 0.0042 },
    });
    const result = await runAgent(fakeModel(), BASE);
    expect(result.usage.estimatedCostUsd).toBeCloseTo(0.0042, 5);
    expect(result.status).toBe("ok");
  });

  it("blocks before calling the model when context is too large", async () => {
    const result = await runAgent(fakeModel(), { ...BASE, system: "x".repeat(100_000) });
    expect(mocks.generateText).not.toHaveBeenCalled();
    expect(result.status).toBe("guardrail_blocked");
    expect(result.errorCode).toBe("INPUT_TOO_LARGE");
  });

  it("reports provider errors without throwing", async () => {
    mocks.generateText.mockRejectedValue(new Error("APIConnectionError: fetch failed"));
    const result = await runAgent(fakeModel(), BASE);
    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("PROVIDER_ERROR");
  });

  it("keeps the provider message in errorDetail for diagnosis", async () => {
    mocks.generateText.mockRejectedValue(new Error("AI_APICallError: 404 - models/gemini-3.1-flash is not found for API version v1beta"));
    const result = await runAgent(fakeModel(), BASE);
    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("AI_ERROR");
    expect(result.errorDetail).toContain("gemini-3.1-flash is not found");
  });

  it("classifies rate limit errors to rate_limited status", async () => {
    mocks.generateText.mockRejectedValue(new Error("HTTP 429 Too Many Requests"));
    const result = await runAgent(fakeModel(), BASE);
    expect(result.status).toBe("rate_limited");
    expect(result.errorCode).toBe("RATE_LIMITED");
  });

  it("flags cost exceeded while keeping the usage record", async () => {
    mocks.generateText.mockResolvedValue({
      text: "ok",
      usage: { inputTokens: 500_000, outputTokens: 10 },
    });
    const result = await runAgent(fakeModel(), { ...BASE, maxCostUsd: 0.0001 });
    expect(result.status).toBe("guardrail_blocked");
    expect(result.errorCode).toBe("COST_EXCEEDED");
    expect(result.usage.inputTokens).toBe(500_000);
  });
});

describe("classifyAgentError", () => {
  it("maps timeout to PROVIDER_ERROR", () => {
    expect(classifyAgentError(new Error("etimedout"))).toEqual({ code: "PROVIDER_ERROR", status: "error" });
  });
  it("maps content policy to CONTENT_FILTERED", () => {
    expect(classifyAgentError(new Error("content_policy_violation"))).toEqual({ code: "CONTENT_FILTERED", status: "error" });
  });
  it("defaults to AI_ERROR", () => {
    expect(classifyAgentError(new Error("coisa estranha"))).toEqual({ code: "AI_ERROR", status: "error" });
  });
});