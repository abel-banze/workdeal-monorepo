import { describe, it, expect } from "vitest";
import { guardInputBudget, guardOutputBudget, guardCostBudget, sanitizeUserMessage, estimateInputTokens, AgentGuardError } from "./guardrails.js";

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
});