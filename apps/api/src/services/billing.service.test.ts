import { describe, it, expect, vi, beforeEach } from "vitest";

// O service importa o affiliateService (usado noutros fluxos) — mock para
// isolar os testes da subscrição self-service.
const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  billing: {
    findPlanById: vi.fn(),
    listFeatures: vi.fn(),
    findSubscriptionForScope: vi.fn(),
    findSubscriptionById: vi.fn(),
    listPaymentsForSubscription: vi.fn(),
    createSubscription: vi.fn(),
    createManualPayment: vi.fn(),
    updateSubscription: vi.fn(),
    createInvoice: vi.fn(),
    createInvoiceLineItem: vi.fn(),
    setPaymentInvoice: vi.fn(),
    findBillingContact: vi.fn(),
    findInvoiceById: vi.fn(),
    findInvoiceByNumber: vi.fn(),
    findPaymentById: vi.fn(),
    createReceipt: vi.fn(),
    findReceiptByPaymentId: vi.fn(),
    findReceiptByNumber: vi.fn(),
    confirmManualPayment: vi.fn(),
  },
  affiliateService: {
    creditOnInvoicePaid: vi.fn(),
  },
  emailInvoice: vi.fn(),
  emailReceipt: vi.fn(),
  emailNotice: vi.fn(),
}));

vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));
vi.mock("../repositories/billing.repository.js", () => ({ billingRepository: mocks.billing }));
vi.mock("./affiliate.service.js", () => ({ affiliateService: mocks.affiliateService }));
vi.mock("./email.service.js", () => ({
  sendSubscriptionInvoiceEmail: mocks.emailInvoice,
  sendSubscriptionReceiptEmail: mocks.emailReceipt,
  sendSubscriptionNoticeEmail: mocks.emailNotice,
}));

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
  mocks.billing.listPaymentsForSubscription.mockResolvedValue([]);
  mocks.billing.listFeatures.mockResolvedValue([]);
  mocks.billing.createSubscription.mockResolvedValue({ id: "sub-1" });
  mocks.billing.updateSubscription.mockResolvedValue({ id: "sub-1" });
  mocks.billing.createInvoice.mockResolvedValue({ id: "inv-1" });
  mocks.billing.createInvoiceLineItem.mockResolvedValue({ id: "li-1" });
  mocks.billing.setPaymentInvoice.mockResolvedValue({ id: "pay-1" });
  mocks.billing.findInvoiceByNumber.mockResolvedValue(null);
  mocks.billing.findReceiptByNumber.mockResolvedValue(null);
  mocks.billing.confirmManualPayment.mockResolvedValue({
    paymentId: "pay-1",
    invoiceId: "inv-1",
    organizationId: "org-1",
    totalMzn: 3500,
    alreadyPaid: false,
  });
  mocks.billing.findBillingContact.mockResolvedValue({
    userEmail: "ana@empresa.co.mz",
    userName: "Ana",
    organization: { name: "Empresa XYZ", contactEmail: "contato@empresa.co.mz" },
  });
  mocks.emailInvoice.mockResolvedValue({ ok: true });
  mocks.emailReceipt.mockResolvedValue({ ok: true });
  mocks.emailNotice.mockResolvedValue({ ok: true });
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

  it("plano pago com comprovativo cria subscrição em pausa + factura + pagamento + email", async () => {
    mocks.billing.findPlanById.mockResolvedValue(PLAN_PAID);
    mocks.billing.createManualPayment.mockResolvedValue({ id: "pay-1" });
    const result = await billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust", payment: PROOF });
    expect(mocks.billing.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paused", metadata: { awaitingPayment: true } }),
    );
    expect(mocks.billing.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", organizationId: "org-1", totalMzn: 3500 }),
    );
    expect(mocks.billing.createInvoiceLineItem).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: "inv-1", quantity: 1, totalMzn: 3500 }),
    );
    expect(mocks.billing.setPaymentInvoice).toHaveBeenCalledWith("pay-1", "inv-1");
    expect(mocks.billing.createManualPayment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", amountMzn: 3500, method: "bank_transfer" }),
    );
    const meta = mocks.billing.createManualPayment.mock.calls[0]?.[0].metadata as Record<string, unknown>;
    expect(meta).toMatchObject({
      kind: "subscription_activation",
      proof: { fileId: "file-1", url: "https://cdn/x.pdf", name: "comp.pdf", reference: "Titular X" },
    });
    expect(mocks.emailInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ to: "contato@empresa.co.mz", customerName: "Empresa XYZ", planName: "Workdeal Trust" }),
    );
    expect(result).toMatchObject({ payment: { id: "pay-1" } });
  });

  it("plano gratuito activa sem pagamento", async () => {
    const result = await billingService.subscribeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust" });
    expect(mocks.billing.createSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.billing.createManualPayment).not.toHaveBeenCalled();
    expect(result).toMatchObject({ payment: null });
  });

  it("retoma própria bloqueada enquanto aguarda pagamento (409 PAYMENT_PENDING)", async () => {
    mocks.billing.findSubscriptionForScope.mockResolvedValue({ id: "sub-1", status: "paused", metadata: { awaitingPayment: true } });
    await expect(billingService.resumeMySubscription("u1", "org-1")).rejects.toMatchObject({
      status: 409,
      code: "PAYMENT_PENDING",
    });
  });

  it("validação admin confirma, emite recibo, activa e envia email", async () => {
    mocks.billing.findPaymentById.mockResolvedValue({
      id: "pay-1",
      userId: "u1",
      amountMzn: 3500,
      invoiceId: "inv-1",
      metadata: { kind: "subscription_activation", subscriptionId: "sub-1" },
    });
    mocks.billing.findSubscriptionById.mockResolvedValue({
      id: "sub-1",
      userId: "u1",
      organizationId: "org-1",
      status: "paused",
      metadata: { awaitingPayment: true },
      planName: "Workdeal Trust",
      planPriceMzn: 3500,
    });
    mocks.billing.findInvoiceById.mockResolvedValue({ id: "inv-1", invoiceNumber: "FT-2026-ABC123" });
    mocks.billing.findReceiptByPaymentId.mockResolvedValue(null);
    mocks.billing.createReceipt.mockResolvedValue({ id: "rc-1", receiptNumber: "RC-2026-XYZ789" });
    const result = await billingService.validateSubscriptionPaymentAsAdmin("pay-1", { note: "Conferido no BIM" });
    expect(mocks.billing.updateSubscription).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({ status: "active", pausedAt: null, resumeAt: null }),
    );
    const cleared = mocks.billing.updateSubscription.mock.calls[0]?.[1] as { metadata: Record<string, unknown> };
    expect(cleared.metadata.awaitingPayment).toBeUndefined();
    expect(mocks.billing.createReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay-1", userId: "u1", amountMzn: 3500 }),
    );
    expect(mocks.emailReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ to: "contato@empresa.co.mz", receiptNumber: "RC-2026-XYZ789" }),
    );
    expect(result.receiptEmail).toMatchObject({ ok: true });
  });

  it("validação rejeita pagamento que não é de activação (400)", async () => {
    mocks.billing.findPaymentById.mockResolvedValue({ id: "pay-9", userId: "u1", metadata: {} });
    await expect(billingService.validateSubscriptionPaymentAsAdmin("pay-9", {})).rejects.toMatchObject({
      status: 400,
      code: "NOT_ACTIVATION_PAYMENT",
    });
  });

  it("notificação admin envia email e regista nota", async () => {
    mocks.billing.findSubscriptionById.mockResolvedValue({
      id: "sub-1",
      userId: "u1",
      organizationId: "org-1",
      status: "paused",
      planName: "Workdeal Trust",
      planPriceMzn: 3500,
      metadata: {},
    });
    const result = await billingService.notifyCompanyAsAdmin("sub-1", { message: "Aguarda pagamento" });
    expect(mocks.emailNotice).toHaveBeenCalledWith(
      expect.objectContaining({ to: "contato@empresa.co.mz", message: "Aguarda pagamento" }),
    );
    expect(mocks.billing.updateSubscription).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({ metadata: expect.objectContaining({}) }),
    );
    expect(result).toMatchObject({ emailed: "contato@empresa.co.mz" });
  });

  it("getMySubscription devolve pagamento pendente com comprovativo", async () => {
    mocks.billing.findSubscriptionForScope.mockResolvedValue({ id: "sub-1", planId: "plan-trust" });
    mocks.billing.listPaymentsForSubscription.mockResolvedValue([
      {
        id: "pay-1",
        amountMzn: 3500,
        method: "bank_transfer",
        status: "pending",
        invoiceNumber: "FT-2026-A1",
        createdAt: new Date("2026-09-09"),
        metadata: {
          kind: "subscription_activation",
          proof: { fileId: "f1", url: "https://cdn/x.pdf", name: "comp.pdf", reference: "Titular" },
        },
      },
      { id: "pay-0", status: "succeeded", metadata: {} },
    ]);
    const result = await billingService.getMySubscription("u1", "org-1");
    expect(result.pendingPayment).toMatchObject({
      id: "pay-1",
      amountMzn: 3500,
      invoiceNumber: "FT-2026-A1",
      proof: { url: "https://cdn/x.pdf", name: "comp.pdf", reference: "Titular" },
    });
  });

  it("getMySubscription devolve pendingPayment nulo sem pendentes", async () => {
    mocks.billing.findSubscriptionForScope.mockResolvedValue({ id: "sub-1", planId: "plan-trust" });
    mocks.billing.listPaymentsForSubscription.mockResolvedValue([]);
    const result = await billingService.getMySubscription("u1", "org-1");
    expect(result.pendingPayment).toBeNull();
  });

  it("subir de plano sem comprovativo responde 400 PROOF_REQUIRED", async () => {
    mocks.billing.findSubscriptionForScope.mockResolvedValue({ id: "sub-1", status: "active", planId: "plan-free" });
    mocks.billing.findPlanById.mockImplementation(async (id: string) =>
      id === "plan-trust" ? PLAN_PAID : { ...PLAN_MONTHLY, id: "plan-free", priceMzn: 0 },
    );
    await expect(
      billingService.changeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust", prorate: true }),
    ).rejects.toMatchObject({ status: 400, code: "PROOF_REQUIRED" });
    expect(mocks.billing.updateSubscription).not.toHaveBeenCalled();
  });

  it("subir de plano com comprovativo muda o plano e regista pagamento", async () => {
    mocks.billing.findSubscriptionForScope.mockResolvedValue({
      id: "sub-1",
      status: "active",
      planId: "plan-free",
      currentPeriodStart: new Date("2026-01-01"),
      currentPeriodEnd: new Date("2026-02-01"),
    });
    mocks.billing.findPlanById.mockImplementation(async (id: string) =>
      id === "plan-trust" ? PLAN_PAID : { ...PLAN_MONTHLY, id: "plan-free", priceMzn: 0 },
    );
    const result = await billingService.changeMySubscriptionPlan("u1", "org-1", { planId: "plan-trust", prorate: true, payment: PROOF });
    expect(mocks.billing.updateSubscription).toHaveBeenCalledWith("sub-1", { planId: "plan-trust" });
    expect(mocks.billing.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ totalMzn: 3500 }));
    expect(mocks.billing.createManualPayment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", amountMzn: 3500 }),
    );
    expect(mocks.emailInvoice).toHaveBeenCalled();
    expect(result).toMatchObject({ payment: { id: "pay-1" } });
  });

  it("descer de plano não exige comprovativo nem cria pagamento", async () => {
    mocks.billing.findSubscriptionForScope.mockResolvedValue({ id: "sub-1", status: "active", planId: "plan-trust" });
    mocks.billing.findPlanById.mockImplementation(async (id: string) =>
      id === "plan-free" ? { ...PLAN_MONTHLY, id: "plan-free", priceMzn: 0 } : PLAN_PAID,
    );
    const before = mocks.billing.createInvoice.mock.calls.length;
    const result = await billingService.changeMySubscriptionPlan("u1", "org-1", { planId: "plan-free", prorate: true });
    expect(mocks.billing.updateSubscription).toHaveBeenCalledWith("sub-1", { planId: "plan-free" });
    expect(mocks.billing.createInvoice.mock.calls.length).toBe(before);
    expect(mocks.billing.createManualPayment).not.toHaveBeenCalled();
    expect(result).toMatchObject({ payment: null, invoice: null });
  });

  it("permite âmbito pessoal sem verificação de papel", async () => {
    await billingService.subscribeMySubscriptionPlan("u1", null, { planId: "plan-trust" });
    expect(mocks.getOrgRole).not.toHaveBeenCalled();
    expect(mocks.billing.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", organizationId: null }),
    );
  });
});
