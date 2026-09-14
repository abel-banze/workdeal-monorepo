import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  billing: {
    findSubscriptionForScope: vi.fn(),
  },
  features: {
    resolvePlanFeatures: vi.fn(),
    listFeatureFlags: vi.fn(),
    listOverrides: vi.fn(),
    listGrantingSubscriptions: vi.fn(),
  },
}));

vi.mock("../repositories/billing.repository.js", () => ({ billingRepository: mocks.billing }));
vi.mock("../repositories/features.repository.js", () => ({ featuresRepository: mocks.features }));

import { featuresService } from "./features.service.js";

const SUB_ACTIVE = {
  id: "sub-1",
  planId: "plan-premium",
  planName: "Premium",
  planSlug: "premium",
  status: "active",
  currentPeriodEnd: new Date(Date.now() + 86_400_000 * 30),
  trialEndsAt: null,
};

const SUB_CANCELLED = { ...SUB_ACTIVE, status: "cancelled" };
const SUB_PAUSED = { ...SUB_ACTIVE, status: "paused" };
const SUB_EXPIRED = { ...SUB_ACTIVE, status: "expired" };
const SUB_TRIALING_FUTURE = { ...SUB_ACTIVE, status: "trialing", trialEndsAt: new Date(Date.now() + 86_400_000 * 3) };
const SUB_TRIALING_ENDED = { ...SUB_ACTIVE, status: "trialing", trialEndsAt: new Date(Date.now() - 1000) };

const PREMIUM_PLAN_FEATURES = [
  { planId: "plan-premium", featureKey: "multimedia_content", featureValue: null },
  { planId: "plan-premium", featureKey: "analytics_visits_contacts", featureValue: null },
  { planId: "plan-premium", featureKey: "ai_assistant", featureValue: null },
];

function flag(key: string, defaultEnabled: boolean, emergencyDisabled = false) {
  return { key, name: key, description: null, defaultEnabled, emergencyDisabled, group: null, sortOrder: 100, createdAt: new Date(), updatedAt: new Date() };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.billing.findSubscriptionForScope.mockResolvedValue(null);
  mocks.features.resolvePlanFeatures.mockResolvedValue([]);
  mocks.features.listFeatureFlags.mockResolvedValue([]);
  mocks.features.listOverrides.mockResolvedValue([]);
  mocks.features.listGrantingSubscriptions.mockResolvedValue([]);
});

async function scoped(
  opts: { sub?: object | null; flags?: ReturnType<typeof flag>[]; overrides?: { flagKey: string; organizationId: string; enabled: boolean; expiresAt: Date | null }[] },
) {
  mocks.billing.findSubscriptionForScope.mockResolvedValue((opts.sub ?? null) as never);
  mocks.features.resolvePlanFeatures.mockResolvedValue(opts.sub ? PREMIUM_PLAN_FEATURES : []);
  mocks.features.listFeatureFlags.mockResolvedValue(opts.flags ?? ([] as never));
  mocks.features.listOverrides.mockResolvedValue(opts.overrides ?? ([] as never));
  return featuresService;
}

describe("featuresService.hasFeature (status-gating)", () => {
  it("sem subscrição → false (fail-closed)", async () => {
    await scoped({ sub: null });
    expect(await featuresService.hasFeature({ userId: "u1", organizationId: "org-1" }, "multimedia_content")).toBe(false);
  });

  it("subscrição activa + plano concede + flag ligado → true", async () => {
    await scoped({ sub: SUB_ACTIVE, flags: [flag("multimedia_content", true)] });
    expect(await featuresService.hasFeature({ userId: "u1", organizationId: "org-1" }, "multimedia_content")).toBe(true);
  });

  it("active/past_due/trialing (dentro da janela) concedem", async () => {
    for (const sub of [SUB_ACTIVE, { ...SUB_ACTIVE, status: "past_due" }, SUB_TRIALING_FUTURE]) {
      await scoped({ sub: sub as typeof SUB_ACTIVE });
      expect(await featuresService.hasFeature({ userId: "u1", organizationId: "org-1" }, "multimedia_content")).toBe(true);
    }
  });

  it("cancelled/paused/expired NÃO concedem (corrige o buraco do findSubscriptionForScope sem filtro de status)", async () => {
    for (const sub of [SUB_CANCELLED, SUB_PAUSED, SUB_EXPIRED]) {
      await scoped({ sub });
      expect(await featuresService.hasFeature({ userId: "u1", organizationId: "org-1" }, "multimedia_content")).toBe(false);
    }
  });

  it("trialing terminado não concede", async () => {
    await scoped({ sub: SUB_TRIALING_ENDED });
    expect(await featuresService.hasFeature({ userId: "u1", organizationId: "org-1" }, "multimedia_content")).toBe(false);
  });

  it("plano não concede a feature → false mesmo com flag ligado", async () => {
    await scoped({ sub: SUB_ACTIVE });
    expect(await featuresService.hasFeature({ userId: "u1", organizationId: "org-1" }, "ai_assistant")).toBe(true);
    mocks.features.resolvePlanFeatures.mockResolvedValue([]);
    expect(await featuresService.hasFeature({ userId: "u1", organizationId: "org-1" }, "ai_assistant")).toBe(false);
  });
});

describe("featuresService.getFeatureState", () => {
  it("accessible = entitled && enabled && subscrição activa", async () => {
    // default desligado → enabled false
    await scoped({ sub: SUB_ACTIVE, flags: [flag("multimedia_content", false)] });
    const { decisions } = await featuresService.getFeatureState({ userId: "u1", organizationId: "org-1" });
    expect(decisions.get("multimedia_content")).toEqual({ entitled: true, enabled: false, accessible: false });

    await scoped({ sub: SUB_ACTIVE, flags: [flag("multimedia_content", true)] });
    const d2 = (await featuresService.getFeatureState({ userId: "u1", organizationId: "org-1" })).decisions.get("multimedia_content");
    expect(d2).toEqual({ entitled: true, enabled: true, accessible: true });
  });
});

describe("featuresService.requireFeature / requireFeatureKeys", () => {
  it("requireFeature lança 403 FEATURE_REQUIRED com detalhes", async () => {
    await scoped({ sub: SUB_PAUSED, flags: [flag("multimedia_content", true)] });
    await expect(
      featuresService.requireFeature({ userId: "u1", organizationId: "org-1" }, "multimedia_content"),
    ).rejects.toMatchObject({ status: 403, code: "FEATURE_REQUIRED", details: { feature: ["multimedia_content"], reason: "subscription_inactive" } });
  });

  it("requireFeatureKeys strategy=all bloqueia com o motivo flag_blocked", async () => {
    await scoped({ sub: SUB_ACTIVE, flags: [flag("multimedia_content", false)] });
    await expect(
      featuresService.requireFeatureKeys({ userId: "u1", organizationId: "org-1" }, ["multimedia_content", "analytics_visits_contacts"]),
    ).rejects.toMatchObject({
      status: 403,
      code: "FEATURE_REQUIRED",
      details: { feature: ["multimedia_content"], reason: "flag_blocked", flagBlockReason: "default_disabled" },
    });
  });

  it("requireFeatureKeys strategy=any passa quando pelo menos uma acessível", async () => {
    await scoped({ sub: SUB_ACTIVE, flags: [flag("multimedia_content", true), flag("analytics_visits_contacts", false)] });
    await expect(
      featuresService.requireFeatureKeys({ userId: "u1", organizationId: "org-1" }, ["multimedia_content", "analytics_visits_contacts"], { strategy: "any" }),
    ).resolves.toBeUndefined();
  });

  it("override da org desligado bloqueia mesmo com default ligado", async () => {
    await scoped({
      sub: SUB_ACTIVE,
      flags: [flag("multimedia_content", true)],
      overrides: [{ flagKey: "multimedia_content", organizationId: "org-1", enabled: false, expiresAt: null }],
    });
    await expect(
      featuresService.requireFeature({ userId: "u1", organizationId: "org-1" }, "multimedia_content"),
    ).rejects.toMatchObject({ details: { reason: "flag_blocked", flagBlockReason: "org_override_disabled" } });
  });

  it("override da org ligado permite com default desligado", async () => {
    await scoped({
      sub: SUB_ACTIVE,
      flags: [flag("multimedia_content", false)],
      overrides: [{ flagKey: "multimedia_content", organizationId: "org-1", enabled: true, expiresAt: null }],
    });
    await expect(
      featuresService.requireFeature({ userId: "u1", organizationId: "org-1" }, "multimedia_content"),
    ).resolves.toBeUndefined();
  });
});

describe("featuresService.explainFeature", () => {
  it("devolve razão estruturada com label", async () => {
    await scoped({ sub: SUB_CANCELLED });
    const r = await featuresService.explainFeature({ userId: "u1", organizationId: "org-1" }, "multimedia_content");
    expect(r.accessible).toBe(false);
    expect(r.reason).toBe("subscription_inactive");
    expect(r.label).toBeTruthy();
  });
});

describe("featuresService.assertEntitlementIntegrity", () => {
  it("detecta feature de plano activo bloqueada por flag (garantia #2)", async () => {
    mocks.features.listGrantingSubscriptions.mockResolvedValue([
      {
        subscriptionId: "sub-1",
        organizationId: "org-1",
        organizationName: "Empresa XYZ",
        planId: "plan-premium",
        planSlug: "premium",
        planName: "Premium",
        status: "active",
      },
    ]);
    // Plano concede analytics_visits_contacts mas o flag está desligado por defeito
    mocks.features.resolvePlanFeatures.mockResolvedValue(PREMIUM_PLAN_FEATURES);
    mocks.features.listFeatureFlags.mockResolvedValue([flag("analytics_visits_contacts", false)]);
    mocks.features.listOverrides.mockResolvedValue([]);

    const report = await featuresService.assertEntitlementIntegrity();
    expect(report.totalGrantingSubscriptions).toBe(1);
    expect(report.totalGrants).toBe(3);
    expect(report.blockedEntitlements).toHaveLength(1);
    expect(report.blockedEntitlements[0]).toMatchObject({
      organizationName: "Empresa XYZ",
      planSlug: "premium",
      featureKey: "analytics_visits_contacts",
      blockReason: "default_disabled",
    });
    expect(report.summary.default_disabled).toBe(1);
  });

  it("sem flags bloqueantes → healthy (sem issues)", async () => {
    mocks.features.listGrantingSubscriptions.mockResolvedValue([
      {
        subscriptionId: "sub-1",
        organizationId: "org-1",
        organizationName: "Empresa XYZ",
        planId: "plan-premium",
        planSlug: "premium",
        planName: "Premium",
        status: "active",
      },
    ]);
    mocks.features.resolvePlanFeatures.mockResolvedValue(PREMIUM_PLAN_FEATURES);
    mocks.features.listFeatureFlags.mockResolvedValue(PREMIUM_PLAN_FEATURES.map((f) => flag(f.featureKey, true)));
    mocks.features.listOverrides.mockResolvedValue([]);

    const report = await featuresService.assertEntitlementIntegrity();
    expect(report.blockedEntitlements).toEqual([]);
    expect(report.summary.default_disabled).toBe(0);
  });
});