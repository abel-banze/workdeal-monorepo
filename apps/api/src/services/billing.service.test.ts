import { describe, it, expect, vi, beforeEach } from "vitest";

// O service importa o affiliateService (usado noutros fluxos) — mock para
// isolar os testes da subscrição self-service.
const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  billing: {
    findPlanById: vi.fn(),
    findSubscriptionForScope: vi.fn(),
    createSubscription: vi.fn(),
    createManualPayment: vi.fn(),
    updateSubscription: vi.fn(),
  },
  affiliateService: {
    creditOnInvoicePaid: vi.fn(),
  },
}));

vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));
vi.mock("../repositories/billing.repository.js", () => ({ billingRepository: mocks.billing }));
vi.mock("./affiliate.service.js", () => ({ affiliateService: mocks.affiliateService }));

import { billingService } from "./billing.service.js";

const PLAN_MONTHLY = {
  id: "plan-trust",
  slug: "trust",
  name: "Workdeal Trust",
  interval: "monthly",
  isPublic: true,
  isActive: true,
};

const PLAN_YEARLY = { ...PLAN_MONTHLY, id: "plan-est", slug: "est", interval: "yearly" };

const PLAN_PAID = { ...PLAN_MONTHLY, id: "plan-trust", slug: "trust", priceMzn: 3500 };

const PROOF = { method: "bank_transfer" as const, fileId: "file-1", url: "https://cdn/x.pdf", name: "comp.pdf", reference: "Titular X" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrgRole.mockResolvedValue("owner");
  mocks.billing.findPlanById.mockResolvedValue(PLAN_MONTHLY);
  mocks.billing.findSubscriptionForScope.mockResolvedValue(null);
  mocks.billing.createSubscription.mockResolvedValue({ id: "sub-1" });
  mocks.billing.updateSubscription.mockResolvedValue({ id: "sub-1" });
});

describe("billingService.subscribeMySubscriptionPlan", () => {
  it("rejeita sem papel na organização (403 FORBIDDEN)", async () => {
    mocks.getOrgRole.mockResolvedValue(null);
    await expect(
      billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust" }),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(mocks.billing.createSubscription).not.toHaveBeenCalled();
  });

  it("rejeita plano inexistente/inactivo/não-público (404 NOT_FOUND)", async () => {
    mocks.billing.findPlanById.mockResolvedValue(null);
    await expect(
      billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-x" }),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

    mocks.billing.findPlanById.mockResolvedValue({ ...PLAN_MONTHLY, isPublic: false });
    await expect(
      billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust" }),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    expect(mocks.billing.createSubscription).not.toHaveBeenCalled();
  });

  it("rejeita quando já existe subscrição activa (409 ALREADY_SUBSCRIBED)", async () => {
    for (const status of ["active", "trialing", "past_due", "paused"]) {
      mocks.billing.findSubscriptionForScope.mockResolvedValue({ id: "sub-0", status });
      await expect(
        billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust" }),
      ).rejects.toMatchObject({ status: 409, code: "ALREADY_SUBSCRIBED" });
    }
    expect(mocks.billing.createSubscription).not.toHaveBeenCalled();
    expect(mocks.billing.updateSubscription).not.toHaveBeenCalled();
  });

  it("cria subscrição activa com período do plano quando não existe nenhuma", async () => {
    await billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust" });
    expect(mocks.billing.createSubscription).toHaveBeenCalledTimes(1);
    const payload = mocks.billing.createSubscription.mock.calls[0]?.[0] as {
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
    };
    expect(payload).toMatchObject({
      userId: "u1",
      organizationId: "org-1",
      planId: "plan-trust",
      status: "active",
    });
    const start: Date = payload.currentPeriodStart;
    const end: Date = payload.currentPeriodEnd;
    expect(end.getFullYear() * 12 + end.getMonth()).toBe(start.getFullYear() * 12 + start.getMonth() + 1);
  });

  it("deriva período anual para planos yearly", async () => {
    mocks.billing.findPlanById.mockResolvedValue(PLAN_YEARLY);
    await billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-est" });
    const payload = mocks.billing.createSubscription.mock.calls[0]?.[0] as {
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
    };
    expect(payload.currentPeriodEnd.getFullYear()).toBe(payload.currentPeriodStart.getFullYear() + 1);
  });

  it("reactiva subscrição cancelada em vez de criar nova", async () => {
    mocks.billing.findSubscriptionForScope.mockResolvedValue({ id: "sub-0", status: "cancelled" });
    await billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust" });
    expect(mocks.billing.createSubscription).not.toHaveBeenCalled();
    expect(mocks.billing.updateSubscription).toHaveBeenCalledWith(
      "sub-0",
      expect.objectContaining({
        planId: "plan-trust",
        status: "active",
        cancelAt: null,
        cancelledAt: null,
        cancelReason: null,
        pausedAt: null,
        resumeAt: null,
      }),
    );
  });

  it("plano pago sem comprovativo responde 400 PROOF_REQUIRED", async () => {
    mocks.billing.findPlanById.mockResolvedValue(PLAN_PAID);
    await expect(
      billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust" }),
    ).rejects.toMatchObject({ status: 400, code: "PROOF_REQUIRED" });
    expect(mocks.billing.createSubscription).not.toHaveBeenCalled();
    expect(mocks.billing.createManualPayment).not.toHaveBeenCalled();
  });

  it("plano pago com comprovativo cria pagamento pending com a prova", async () => {
    mocks.billing.findPlanById.mockResolvedValue(PLAN_PAID);
    mocks.billing.createManualPayment.mockResolvedValue({ id: "pay-1" });
    const result = await billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust", payment: PROOF });
    expect(mocks.billing.createManualPayment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", amountMzn: 3500, method: "bank_transfer" }),
    );
    const meta = mocks.billing.createManualPayment.mock.calls[0]?.[0].metadata as Record<string, unknown>;
    expect(meta).toMatchObject({
      kind: "subscription_activation",
      proof: { fileId: "file-1", url: "https://cdn/x.pdf", name: "comp.pdf", reference: "Titular X" },
    });
    expect(result).toMatchObject({ payment: { id: "pay-1" } });
  });

  it("plano gratuito activa sem pagamento", async () => {
    const result = await billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust" });
    expect(mocks.billing.createSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.billing.createManualPayment).not.toHaveBeenCalled();
    expect(result).toMatchObject({ payment: null });
  });

  it("permite âmbito pessoal sem verificação de papel", async () => {
    await billingService.subscribeMySubscriptionPlan("u1", null, { planId: "plan-trust" });
    expect(mocks.getOrgRole).not.toHaveBeenCalled();
    expect(mocks.billing.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", organizationId: null }),
    );
  });
});
