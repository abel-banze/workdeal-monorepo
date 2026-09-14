import { describe, it, expect } from "vitest";
import { MODEL_TIERS, MODEL_PRICES, AI_PROVIDERS } from "./models.js";

describe("models", () => {
  it("every tier has all non-mock providers", () => {
    for (const provider of AI_PROVIDERS.filter((p) => p !== "mock")) {
      expect(MODEL_TIERS.flash[provider]).toBeTypeOf("string");
      expect(MODEL_TIERS.pro[provider]).toBeTypeOf("string");
    }
  });

  it("all model IDs are non-empty strings", () => {
    for (const tier of Object.values(MODEL_TIERS)) {
      for (const id of Object.values(tier)) {
        expect(id.length).toBeGreaterThan(0);
      }
    }
  });

  it("pro models differ from flash", () => {
    for (const provider of AI_PROVIDERS.filter((p) => p !== "mock")) {
      expect(MODEL_TIERS.pro[provider]).not.toBe(MODEL_TIERS.flash[provider]);
    }
  });

  it("prices exist for all provider/tier combos", () => {
    for (const tier of Object.values(MODEL_PRICES)) {
      for (const p of Object.values(tier)) {
        expect(p.input).toBeGreaterThanOrEqual(0);
        expect(p.output).toBeGreaterThanOrEqual(0);
      }
    }
  });
});