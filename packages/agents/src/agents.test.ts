import { describe, it, expect } from "vitest";
import { AGENTS, AGENT_CONFIGS } from "./agents.js";
import { FEATURE_KEYS, type FeatureKey } from "@workdeal/shared";

describe("agents registry", () => {
  it("all agent keys exist as AI feature keys in the shared catalog", () => {
    for (const config of AGENT_CONFIGS) {
      expect(FEATURE_KEYS).toContain(config.featureKey as FeatureKey);
      expect(config.key.startsWith("ai_")).toBe(true);
    }
  });

  it("budgets are sane", () => {
    for (const config of AGENT_CONFIGS) {
      expect(config.maxOutputTokens).toBeGreaterThan(0);
      expect(config.maxInputTokens).toBeGreaterThan(0);
      expect(config.temperature).toBeGreaterThanOrEqual(0);
      expect(config.temperature).toBeLessThanOrEqual(1);
      expect(config.tier).toMatch(/^flash$|^pro$/);
    }
  });

  it("registry has exactly four AI agents", () => {
    expect(AGENT_CONFIGS).toHaveLength(4);
    expect(Object.keys(AGENTS).sort()).toEqual(["assistant", "profileAssistant", "proposalWriter", "responseSupport"]);
  });
});