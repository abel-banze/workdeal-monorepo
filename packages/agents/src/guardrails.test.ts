import { describe, it, expect } from "vitest";
import { guardInputBudget, guardOutputBudget, guardCostBudget, sanitizeUserMessage, estimateInputTokens, estimatePromptTokens, AgentGuardError } from "./guardrails.js";

describe("guardrails", () => {
  it("guardInputBudget passes small context", () => {
    expect(guardInputBudget({ system: "sys", user: "user", maxInputTokens: 8000 })).toBeNull();
  });

  it("guardInputBudget blocks oversized context", () => {
    const big = "x".repeat(40_000);
    const guard = guardInputBudget({ system: big, user: big, maxInputTokens: 8000 });
    expect(guard).toBeInstanceOf(AgentGuardError);
    expect(guard?.code).toBe("INPUT_TOO_LARGE");
  });

  it("guardOutputBudget blocks oversize output", () => {
    const guard = guardOutputBudget({ outputTokens: 5000, maxOutputTokens: 2000 });
    expect(guard?.code).toBe("OUTPUT_TOO_LARGE");
  });

  it("guardOutputBudget passes within limit", () => {
    expect(guardOutputBudget({ outputTokens: 500, maxOutputTokens: 2000 })).toBeNull();
  });

  it("guardCostBudget blocks over budget", () => {
    const guard = guardCostBudget({ estimatedCostUsd: 0.5, maxCostUsd: 0.05 });
    expect(guard?.code).toBe("COST_EXCEEDED");
  });

  it("guardCostBudget passes under budget", () => {
    expect(guardCostBudget({ estimatedCostUsd: 0.01, maxCostUsd: 0.05 })).toBeNull();
  });

  it("sanitizeUserMessage collapses whitespace and caps length", () => {
    expect(sanitizeUserMessage("  a\n\n  b \t c  ", 10)).toBe("a b c");
    expect(sanitizeUserMessage("x".repeat(5000), 100).length).toBe(100);
  });

  it("estimateInputTokens is length based", () => {
    expect(estimateInputTokens("abcd")).toBe(1);
    expect(estimateInputTokens("")).toBe(0);
  });

  it("estimatePromptTokens trata texto latino como o estimador histórico", () => {
    expect(estimatePromptTokens("")).toBe(0);
    expect(estimatePromptTokens("abcd")).toBe(1);
    expect(estimatePromptTokens("x".repeat(400))).toBe(100);
  });

  it("estimatePromptTokens conta CJK em separado (1 char ≈ 1+ tokens)", () => {
    const latin = estimatePromptTokens("x".repeat(40));
    const cjk = estimatePromptTokens("日本語".repeat(10));
    expect(cjk).toBeGreaterThan(latin);
  });

  it("guardInputBudget conta o histórico no orçamento", () => {
    const history = ["x".repeat(20_000), "y".repeat(20_000)];
    const guard = guardInputBudget({ system: "sys", user: "user", history, maxInputTokens: 8000 });
    expect(guard).toBeInstanceOf(AgentGuardError);
    expect(guard?.code).toBe("INPUT_TOO_LARGE");
  });

  it("sanitizeUserMessage com preserveNewlines mantém parágrafos", () => {
    expect(sanitizeUserMessage("  Olá\n\ncomo  estás?  ", 4000, { preserveNewlines: true })).toBe("Olá\n\ncomo estás?");
    expect(sanitizeUserMessage("a\n\n\n\nb", 4000, { preserveNewlines: true })).toBe("a\n\nb");
  });

  it("sanitizeUserMessage sem a opção mantém o comportamento histórico", () => {
    expect(sanitizeUserMessage("  a\n\n  b \t c  ", 10)).toBe("a b c");
  });
});