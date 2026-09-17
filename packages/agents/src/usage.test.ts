import { describe, it, expect } from "vitest";
import { buildUsageRecord, ZERO_USAGE, estimateCostUsd, maxAffordableOutputTokens } from "./usage.js";

describe("usage", () => {
  it("ZERO_USAGE has all zero fields", () => {
    expect(ZERO_USAGE).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 });
  });

  it("estimateCostUsd returns 0 for mock", () => {
    expect(estimateCostUsd("mock", "flash", 1000, 500)).toBe(0);
  });

  it("estimateCostUsd returns positive number for real providers", () => {
    const cost = estimateCostUsd("openai", "flash", 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it("buildUsageRecord uses sdkCostUsd when provided", () => {
    const record = buildUsageRecord({
      providerId: "openai",
      tier: "flash",
      inputTokens: 1000,
      outputTokens: 500,
      sdkCostUsd: 0.00321,
    });
    expect(record.inputTokens).toBe(1000);
    expect(record.outputTokens).toBe(500);
    expect(record.totalTokens).toBe(1500);
    expect(record.estimatedCostUsd).toBeCloseTo(0.00321, 5);
  });

  it("buildUsageRecord falls back to estimated cost when sdkCostUsd is null/undefined", () => {
    const withSdk = buildUsageRecord({ providerId: "openai", tier: "flash", inputTokens: 1000, outputTokens: 500, sdkCostUsd: null });
    const withoutSdk = buildUsageRecord({ providerId: "openai", tier: "flash", inputTokens: 1000, outputTokens: 500, sdkCostUsd: undefined });
    expect(withSdk.estimatedCostUsd).toBe(withoutSdk.estimatedCostUsd);
    expect(withSdk.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("buildUsageRecord normalizes negative tokens to 0", () => {
    const record = buildUsageRecord({ providerId: "openai", tier: "flash", inputTokens: -5, outputTokens: -2, sdkCostUsd: 0.001 });
    expect(record.inputTokens).toBe(0);
    expect(record.outputTokens).toBe(0);
    expect(record.totalTokens).toBe(0);
  });

  it("buildUsageRecord rounds fractional tokens", () => {
    const record = buildUsageRecord({ providerId: "openai", tier: "flash", inputTokens: 1000.3, outputTokens: 200.7, sdkCostUsd: 0.001 });
    expect(record.inputTokens).toBe(1000);
    expect(record.outputTokens).toBe(201);
    expect(record.totalTokens).toBe(1201);
  });
});

describe("maxAffordableOutputTokens", () => {
  it("mantém o pedido quando cabe no orçamento", () => {
    expect(maxAffordableOutputTokens({ providerId: "openai", tier: "flash", estimatedInputTokens: 100, maxOutputTokens: 1200, maxCostUsd: 0.05 })).toBe(1200);
  });

  it("capa o output quando o orçamento só chega para resposta curta", () => {
    const capped = maxAffordableOutputTokens({ providerId: "openai", tier: "flash", estimatedInputTokens: 100, maxOutputTokens: 2000, maxCostUsd: 0.001 });
    expect(capped).toBeGreaterThan(0);
    expect(capped).toBeLessThan(2000);
  });

  it("devolve 0 quando nem o input cabe no orçamento", () => {
    expect(maxAffordableOutputTokens({ providerId: "openai", tier: "flash", estimatedInputTokens: 500_000, maxOutputTokens: 2000, maxCostUsd: 0.0001 })).toBe(0);
  });

  it("mock nunca capa (custo zero)", () => {
    expect(maxAffordableOutputTokens({ providerId: "mock", tier: "flash", estimatedInputTokens: 999_999, maxOutputTokens: 2000, maxCostUsd: 0 })).toBe(2000);
  });
});