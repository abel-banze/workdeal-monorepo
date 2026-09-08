import { describe, it, expect } from "vitest";
import {
  checkSubscription,
  checkPlanLimit,
  evaluateRequirement,
  evaluateEntitlements,
  isSubscriptionActive,
  isTrialActive,
  remainingTrialDays,
  type EntitlementsContext,
  type PlanEntitlements,
  type SubscriptionSnapshot,
} from "./entitlements.js";
import type { Actor, ResourceAccess } from "./permissions.js";

const activeSub: SubscriptionSnapshot = { status: "active", currentPeriodEnd: new Date("2099-01-01"), trialEndsAt: null };
const trialingSub: SubscriptionSnapshot = { status: "trialing", currentPeriodEnd: new Date("2099-01-01"), trialEndsAt: new Date(Date.now() + 5 * 86_400_000) };
const expiredTrialSub: SubscriptionSnapshot = { status: "trialing", currentPeriodEnd: new Date("2099-01-01"), trialEndsAt: new Date(Date.now() - 86_400_000) };
const cancelledSub: SubscriptionSnapshot = { status: "cancelled", currentPeriodEnd: new Date("2099-01-01"), trialEndsAt: null };
const pastDueSub: SubscriptionSnapshot = { status: "past_due", currentPeriodEnd: new Date("2099-01-01"), trialEndsAt: null };

const freePlan: PlanEntitlements = {
  maxProfiles: 1,
  maxTeamMembers: 1,
  maxListings: 3,
  maxEvents: null,
  maxBranches: 0,
  apiAccess: false,
  maxApiCallsPerMonth: null,
};

describe("checkSubscription", () => {
  it("aceita active", () => {
    expect(checkSubscription(activeSub).ok).toBe(true);
    expect(checkSubscription(activeSub).code).toBe("subscription.active");
  });

  it("aceita past_due com tolerância", () => {
    const res = checkSubscription(pastDueSub);
    expect(res.ok).toBe(true);
    expect(res.code).toBe("subscription.past_due");
  });

  it("aceita trial activo", () => {
    const res = checkSubscription(trialingSub);
    expect(res.ok).toBe(true);
    expect(res.code).toBe("subscription.trialing");
  });

  it("rejeita trial expirado", () => {
    expect(checkSubscription(expiredTrialSub).ok).toBe(false);
  });

  it("rejeita cancelled", () => {
    const res = checkSubscription(cancelledSub);
    expect(res.ok).toBe(false);
    expect(res.code).toBe("subscription.inactive");
  });

  it("rejeita trial quando excludeTrial=true", () => {
    const res = checkSubscription(trialingSub, { excludeTrial: true });
    expect(res.ok).toBe(false);
  });

  it("isSubscriptionActive reflecte status", () => {
    expect(isSubscriptionActive("active")).toBe(true);
    expect(isSubscriptionActive("past_due")).toBe(true);
    expect(isSubscriptionActive("trialing")).toBe(true);
    expect(isSubscriptionActive("cancelled")).toBe(false);
    expect(isSubscriptionActive("expired")).toBe(false);
    expect(isSubscriptionActive("paused")).toBe(false);
  });

  it("isTrialActive / remainingTrialDays", () => {
    expect(isTrialActive(trialingSub)).toBe(true);
    expect(isTrialActive(expiredTrialSub)).toBe(false);
    expect(remainingTrialDays(activeSub)).toBe(0);
    expect(remainingTrialDays(trialingSub)).toBe(5);
  });
});

describe("checkPlanLimit", () => {
  it("ilimitado quando max é null", () => {
    const res = checkPlanLimit(freePlan, "events", 100);
    expect(res.ok).toBe(true);
    expect(res.max).toBe(null);
  });

  it("permite dentro do limite", () => {
    const res = checkPlanLimit(freePlan, "profiles", 0, 0);
    expect(res.ok).toBe(true);
    expect(res.used).toBe(0);
    expect(res.max).toBe(1);
  });

  it("bloqueia uso actual no limite", () => {
    const res = checkPlanLimit(freePlan, "profiles", 1);
    expect(res.ok).toBe(true);
  });

  it("bloqueia criação acima do limite (count)", () => {
    const res = checkPlanLimit(freePlan, "profiles", 1, 1);
    expect(res.ok).toBe(false);
    expect(res.code).toBe("limit.profiles");
  });

  it("bloqueia uso acima do limite", () => {
    const res = checkPlanLimit(freePlan, "branches", 2);
    expect(res.ok).toBe(false);
    expect(res.code).toBe("limit.branches");
  });
});

describe("evaluateRequirement", () => {
  const ctx: EntitlementsContext = { plan: freePlan, subscription: activeSub, usage: { profiles: 1, branches: 2 } };

  it("subscrição válida", () => {
    const res = evaluateRequirement({ type: "subscription" }, ctx);
    expect(res.ok).toBe(true);
  });

  it("subscrição inválida bloqueia", () => {
    const res = evaluateRequirement({ type: "subscription" }, { ...ctx, subscription: cancelledSub });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.check).toBe("subscription");
  });

  it("limite respeita uso+count", () => {
    const res = evaluateRequirement({ type: "limit", kind: "profiles", count: 1 }, ctx);
    expect(res.ok).toBe(false);
    if (!res.ok && res.check === "limit") expect(res.kind).toBe("profiles");
  });

  it("permissão RBAC", () => {
    const actor: Actor = { systemRole: "user" };
    const resource: ResourceAccess = { type: "organization", orgRole: "admin" };
    const res = evaluateRequirement({ type: "permission", actor, resource, permission: "events:manage" }, ctx);
    expect(res.ok).toBe(true);
  });

  it("permissão RBAC negada para role insuficiente", () => {
    const actor: Actor = { systemRole: "user" };
    const resource: ResourceAccess = { type: "organization", orgRole: "member" };
    const res = evaluateRequirement({ type: "permission", actor, resource, permission: "events:manage" }, ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.check).toBe("permission");
  });

  it("admin do sistema bypassa permissões de organização", () => {
    const actor: Actor = { systemRole: "admin" };
    const resource: ResourceAccess = { type: "organization", orgRole: null };
    const res = evaluateRequirement({ type: "permission", actor, resource, permission: "events:manage" }, ctx);
    expect(res.ok).toBe(true);
  });
});

describe("evaluateEntitlements", () => {
  it("com subscrição activa e limites respeitados não sinaliza violações", () => {
    const eval_ = evaluateEntitlements({ plan: freePlan, subscription: activeSub, usage: { profiles: 1, team_members: 1, listings: 2 } });
    expect(eval_.ok).toBe(true);
    expect(eval_.violations).toHaveLength(0);
  });

  it("sinaliza violação de limite nos limits", () => {
    const eval_ = evaluateEntitlements({ plan: freePlan, subscription: activeSub, usage: { branches: 3 } });
    expect(eval_.ok).toBe(false);
    expect(eval_.limits.branches.ok).toBe(false);
    expect(eval_.limits.branches.used).toBe(3);
    expect(eval_.violations.some((v) => v.check === "limit.branches")).toBe(true);
  });

  it("violação de subscrição entra primeiro", () => {
    const eval_ = evaluateEntitlements({ plan: freePlan, subscription: cancelledSub, usage: {} });
    expect(eval_.ok).toBe(false);
    expect(eval_.violations[0].check).toBe("subscription.inactive");
  });
});