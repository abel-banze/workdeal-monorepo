import { describe, it, expect } from "vitest";
import {
  FEATURE_CATALOG,
  FEATURE_KEYS,
  isFeatureKey,
  featureLabel,
  resolveFeatureMap,
  hasFeature,
  getFeatureValue,
  parseFeatureValue,
  resolveFlagEnabled,
  featureAccessible,
  isSubscriptionGranting,
  resolveFeatureReason,
  resolveFlagBlockReason,
  collectFeatureReasons,
  missingFeatureKeys,
  explainFlagBlock,
  flagBlockLabel,
  type FeatureEntry,
  type FlagDefinition,
  type FlagOverride,
} from "./features.js";

describe("FEATURE_CATALOG / FEATURE_KEYS", () => {
  it("todas as chaves do catálogo existem em FEATURE_KEYS e vice-versa", () => {
    const catalogKeys = FEATURE_CATALOG.map((f) => f.key);
    expect(new Set(catalogKeys)).toEqual(new Set(FEATURE_KEYS));
    expect(FEATURE_CATALOG.length).toBe(FEATURE_KEYS.length);
  });

  it("cada definição tem label e description em pt-MZ", () => {
    for (const f of FEATURE_CATALOG) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it("isFeatureKey / featureLabel", () => {
    expect(isFeatureKey("ai_assistant")).toBe(true);
    expect(isFeatureKey("nao_existe")).toBe(false);
    expect(featureLabel("ai_assistant")).toBe("Assistente comercial (IA)");
    expect(featureLabel("desconhecida")).toBe("desconhecida");
  });
});

describe("resolveFeatureMap", () => {
  it("default 'true' quando featureValue é null", () => {
    const map = resolveFeatureMap([{ featureKey: "ai_assistant", featureValue: null }]);
    expect(hasFeature(map, "ai_assistant")).toBe(true);
    expect(getFeatureValue(map, "ai_assistant")).toBe("true");
  });

  it("a primeira ocorrência ganha (próprio plano tem prioridade sobre herdadas)", () => {
    const entries: FeatureEntry[] = [
      { featureKey: "search_boost", featureValue: "3" },
      { featureKey: "search_boost", featureValue: "2" },
      { featureKey: "search_boost", featureValue: "1" },
    ];
    const map = resolveFeatureMap(entries);
    expect(getFeatureValue(map, "search_boost")).toBe("3");
  });

  it("mescla chaves distintas", () => {
    const map = resolveFeatureMap([
      { featureKey: "ai_assistant", featureValue: null },
      { featureKey: "api_access", featureValue: "true" },
    ]);
    expect(hasFeature(map, "ai_assistant")).toBe(true);
    expect(hasFeature(map, "api_access")).toBe(true);
    expect(hasFeature(map, "procurement")).toBe(false);
  });
});

describe("parseFeatureValue", () => {
  it("boolean", () => {
    expect(parseFeatureValue("true", "boolean")).toBe(true);
    expect(parseFeatureValue("1", "boolean")).toBe(true);
    expect(parseFeatureValue("false", "boolean")).toBe(false);
    expect(parseFeatureValue("0", "boolean")).toBe(false);
    expect(parseFeatureValue(null, "boolean")).toBe(null);
  });

  it("number", () => {
    expect(parseFeatureValue("3", "number")).toBe(3);
    expect(parseFeatureValue("abc", "number")).toBe(null);
    expect(parseFeatureValue(null, "number")).toBe(null);
  });

  it("string", () => {
    expect(parseFeatureValue("x", "string")).toBe("x");
    expect(parseFeatureValue(null, "string")).toBe(null);
  });
});

describe("resolveFlagEnabled", () => {
  const defOff: FlagDefinition = { key: "ai_assistant", defaultEnabled: false, emergencyDisabled: false };
  const defOn: FlagDefinition = { key: "ai_assistant", defaultEnabled: true, emergencyDisabled: false };

  it("sem flag definida → não bloqueia", () => {
    expect(resolveFlagEnabled(undefined, [], null)).toBe(true);
  });

  it("usa o default global quando não há override", () => {
    expect(resolveFlagEnabled(defOff, [], null)).toBe(false);
    expect(resolveFlagEnabled(defOn, [], null)).toBe(true);
  });

  it("override da org vence o default", () => {
    const overrides: FlagOverride[] = [{ flagKey: "ai_assistant", organizationId: "org-1", enabled: true, expiresAt: null }];
    expect(resolveFlagEnabled(defOff, overrides, "org-1")).toBe(true);
    expect(resolveFlagEnabled(defOff, overrides, "org-2")).toBe(false);
  });

  it("override expirado é ignorado", () => {
    const overrides: FlagOverride[] = [
      { flagKey: "ai_assistant", organizationId: "org-1", enabled: true, expiresAt: new Date(Date.now() - 1000) },
    ];
    expect(resolveFlagEnabled(defOff, overrides, "org-1")).toBe(false);
  });

  it("emergencyDisabled (kill-switch) vence overrides e defaults", () => {
    const def = { ...defOn, emergencyDisabled: true };
    const overrides: FlagOverride[] = [{ flagKey: "ai_assistant", organizationId: "org-1", enabled: true, expiresAt: null }];
    expect(resolveFlagEnabled(def, overrides, "org-1")).toBe(false);
    expect(resolveFlagEnabled(def, [], null)).toBe(false);
  });
});

describe("featureAccessible", () => {
  const planMap = resolveFeatureMap([
    { featureKey: "ai_assistant", featureValue: null },
    { featureKey: "api_access", featureValue: null },
  ]);
  const flagDefs = new Map<FlagDefinition["key"], FlagDefinition>([
    ["ai_assistant", { key: "ai_assistant", defaultEnabled: false, emergencyDisabled: false }],
  ]);

  it("plano concede + flag ligado → acessível", () => {
    const overrides: FlagOverride[] = [{ flagKey: "ai_assistant", organizationId: "org-1", enabled: true, expiresAt: null }];
    expect(featureAccessible(planMap, flagDefs, overrides, "org-1", "ai_assistant")).toBe(true);
  });

  it("plano concede + flag desligado → bloqueado", () => {
    expect(featureAccessible(planMap, flagDefs, [], "org-1", "ai_assistant")).toBe(false);
  });

  it("feature sem flag definida segue só o plano", () => {
    expect(featureAccessible(planMap, flagDefs, [], "org-1", "api_access")).toBe(true);
  });

  it("plano não concede → bloqueado mesmo com flag ligado", () => {
    const overrides: FlagOverride[] = [{ flagKey: "procurement", organizationId: "org-1", enabled: true, expiresAt: null }];
    expect(featureAccessible(planMap, flagDefs, overrides, "org-1", "procurement")).toBe(false);
  });
});

describe("isSubscriptionGranting", () => {
  it("active/past_due/trialing concedem; restantes não", () => {
    expect(isSubscriptionGranting("active")).toBe(true);
    expect(isSubscriptionGranting("past_due")).toBe(true);
    expect(isSubscriptionGranting("trialing")).toBe(true);
    expect(isSubscriptionGranting("cancelled")).toBe(false);
    expect(isSubscriptionGranting("paused")).toBe(false);
    expect(isSubscriptionGranting("expired")).toBe(false);
    expect(isSubscriptionGranting(null)).toBe(false);
    expect(isSubscriptionGranting(undefined)).toBe(false);
  });
});

describe("resolveFlagBlockReason", () => {
  const def: FlagDefinition = { key: "ai_assistant", defaultEnabled: false, emergencyDisabled: false };
  const on: FlagDefinition = { key: "ai_assistant", defaultEnabled: true, emergencyDisabled: false };

  it("sem flag definida → não bloqueia", () => {
    expect(resolveFlagBlockReason(undefined, [], null)).toBeNull();
  });

  it("default desligado → default_disabled", () => {
    expect(resolveFlagBlockReason(def, [], null)).toBe("default_disabled");
  });

  it("override da org ligado → não bloqueia", () => {
    const overrides: FlagOverride[] = [{ flagKey: "ai_assistant", organizationId: "org-1", enabled: true, expiresAt: null }];
    expect(resolveFlagBlockReason(def, overrides, "org-1")).toBeNull();
  });

  it("override da org desligado → org_override_disabled (mesmo com default ligado)", () => {
    const overrides: FlagOverride[] = [{ flagKey: "ai_assistant", organizationId: "org-1", enabled: false, expiresAt: null }];
    expect(resolveFlagBlockReason(on, overrides, "org-1")).toBe("org_override_disabled");
  });

  it("override expirado é ignorado", () => {
    const overrides: FlagOverride[] = [
      { flagKey: "ai_assistant", organizationId: "org-1", enabled: true, expiresAt: new Date(Date.now() - 1000) },
    ];
    expect(resolveFlagBlockReason(def, overrides, "org-1")).toBe("default_disabled");
  });

  it("kill-switch vence overrides e defaults", () => {
    const emg = { ...on, emergencyDisabled: true };
    expect(resolveFlagBlockReason(emg, [], null)).toBe("kill_switch");
    const overrides: FlagOverride[] = [{ flagKey: "ai_assistant", organizationId: "org-1", enabled: true, expiresAt: null }];
    expect(resolveFlagBlockReason(emg, overrides, "org-1")).toBe("kill_switch");
  });

  it("flagBlockLabel devolve texto pt-MZ", () => {
    expect(flagBlockLabel("kill_switch")).toContain("Kill-switch");
    expect(flagBlockLabel("default_disabled")).toContain("por defeito");
    expect(flagBlockLabel("org_override_disabled")).toContain("Sobreposição");
  });
});

describe("resolveFeatureReason", () => {
  const ctx = { hasSubscription: true, subscriptionGranting: true };

  it("tudo ok → accessible", () => {
    expect(resolveFeatureReason({ ...ctx, planGrants: true, flagBlockReason: null })).toEqual({
      accessible: true,
      reason: "ok",
    });
  });

  it("sem subscrição → no_subscription", () => {
    expect(resolveFeatureReason({ hasSubscription: false, subscriptionGranting: false, planGrants: false, flagBlockReason: null })).toEqual({
      accessible: false,
      reason: "no_subscription",
    });
  });

  it("subscrição sem acesso → subscription_inactive", () => {
    expect(resolveFeatureReason({ hasSubscription: true, subscriptionGranting: false, planGrants: true, flagBlockReason: null })).toEqual({
      accessible: false,
      reason: "subscription_inactive",
    });
  });

  it("plano não concede → plan_does_not_grant", () => {
    expect(resolveFeatureReason({ ...ctx, planGrants: false, flagBlockReason: null })).toEqual({
      accessible: false,
      reason: "plan_does_not_grant",
    });
  });

  it("flag bloqueado → flag_blocked com blockReason", () => {
    expect(resolveFeatureReason({ ...ctx, planGrants: true, flagBlockReason: "kill_switch" })).toEqual({
      accessible: false,
      reason: "flag_blocked",
      flagBlockReason: "kill_switch",
    });
  });
});

describe("collectFeatureReasons / missingFeatureKeys", () => {
  const planMap = resolveFeatureMap([
    { featureKey: "ai_assistant", featureValue: null },
    { featureKey: "api_access", featureValue: null },
  ]);
  const flagDefs = new Map<FlagDefinition["key"], FlagDefinition>([
    ["ai_assistant", { key: "ai_assistant", defaultEnabled: false, emergencyDisabled: false }],
  ]);
  const overrides: FlagOverride[] = [{ flagKey: "ai_assistant", organizationId: "org-1", enabled: true, expiresAt: null }];
  const ctx = { hasSubscription: true, subscriptionGranting: true };

  it("devolve razão por key", () => {
    const reasons = collectFeatureReasons(planMap, flagDefs, overrides, "org-1", ["ai_assistant", "api_access"], ctx);
    expect(reasons.get("ai_assistant")!.accessible).toBe(true);
    expect(reasons.get("api_access")!.accessible).toBe(true);
  });

  it("missingFeatureKeys devolve apenas os bloqueados", () => {
    const { missing, reasons } = missingFeatureKeys(
      planMap,
      flagDefs,
      [],
      "org-1",
      ["ai_assistant", "api_access", "procurement"],
      ctx,
    );
    expect(missing).toEqual(["ai_assistant", "procurement"]);
    expect(reasons.get("ai_assistant")!.reason).toBe("flag_blocked");
    expect(reasons.get("ai_assistant")!.flagBlockReason).toBe("default_disabled");
    expect(reasons.get("procurement")!.reason).toBe("plan_does_not_grant");
  });

  it("subscrição inactiva bloqueia tudo com subscription_inactive", () => {
    const { missing, reasons } = missingFeatureKeys(
      planMap,
      flagDefs,
      overrides,
      "org-1",
      ["ai_assistant", "api_access"],
      { hasSubscription: true, subscriptionGranting: false },
    );
    expect(missing).toEqual(["ai_assistant", "api_access"]);
    expect(reasons.get("api_access")!.reason).toBe("subscription_inactive");
  });
});

describe("explainFlagBlock", () => {
  const def: FlagDefinition = { key: "ai_assistant", defaultEnabled: true, emergencyDisabled: false };
  const overrides: FlagOverride[] = [{ flagKey: "ai_assistant", organizationId: "org-1", enabled: false, expiresAt: null }];

  it("sem flag → flagExists false, sem block", () => {
    expect(explainFlagBlock(undefined, [], "org-1", "ai_assistant")).toEqual({
      flagExists: false,
      blockReason: null,
      blockLabel: null,
    });
  });

  it("override desligado → exposto com label", () => {
    const r = explainFlagBlock(def, overrides, "org-1", "ai_assistant");
    expect(r.flagExists).toBe(true);
    expect(r.blockReason).toBe("org_override_disabled");
    expect(r.blockLabel).toBeTruthy();
  });
});