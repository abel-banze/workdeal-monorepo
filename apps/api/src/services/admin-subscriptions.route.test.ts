import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// RBAC com passthrough (admin fixo) — o controlo real de papel é testado
// por middleware próprio; aqui valida-se o wiring das rotas admin.
const mocks = vi.hoisted(() => ({
  billing: {
    findPaymentById: vi.fn(),
    findSubscriptionById: vi.fn(),
    findInvoiceById: vi.fn(),
    findReceiptByPaymentId: vi.fn(),
    findReceiptByNumber: vi.fn(),
    createReceipt: vi.fn(),
    confirmManualPayment: vi.fn(),
    updateSubscription: vi.fn(),
    findBillingContact: vi.fn(),
  },
  emailReceipt: vi.fn(),
  emailNotice: vi.fn(),
}));

vi.mock("../middlewares/rbac.middleware.js", () => ({
  requireSystemRole: () => async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("user", { id: "admin-1" });
    await next();
  },
}));
vi.mock("../repositories/billing.repository.js", () => ({ billingRepository: mocks.billing }));
vi.mock("./affiliate.service.js", () => ({ affiliateService: { creditOnInvoicePaid: vi.fn() } }));
vi.mock("./email.service.js", () => ({
  sendSubscriptionReceiptEmail: mocks.emailReceipt,
  sendSubscriptionNoticeEmail: mocks.emailNotice,
}));

import { adminSubscriptionsRoute } from "../routes/admin-subscriptions.route.js";
import { errorHandler } from "../lib/errors.js";

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/admin/subscriptions", adminSubscriptionsRoute);
  app.onError(errorHandler);
  return app;
}

async function post(app: Hono, path: string, body: unknown) {
  const res = await app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.billing.findBillingContact.mockResolvedValue({
    userEmail: "ana@empresa.co.mz",
    userName: "Ana",
    organization: { name: "Empresa XYZ", contactEmail: "contato@empresa.co.mz" },
  });
  mocks.billing.findReceiptByNumber.mockResolvedValue(null);
  mocks.billing.confirmManualPayment.mockResolvedValue({
    paymentId: "pay-1",
    invoiceId: "inv-1",
    organizationId: "org-1",
    totalMzn: 3500,
    alreadyPaid: false,
  });
  mocks.emailReceipt.mockResolvedValue({ ok: true });
  mocks.emailNotice.mockResolvedValue({ ok: true });
});

describe("POST /api/v1/admin/subscriptions/payments/:id/validate", () => {
  it("valida, activa, emite recibo e responde 200", async () => {
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
    });
    mocks.billing.findInvoiceById.mockResolvedValue({ id: "inv-1", invoiceNumber: "FT-2026-A1" });
    mocks.billing.findReceiptByPaymentId.mockResolvedValue(null);
    mocks.billing.createReceipt.mockResolvedValue({ id: "rc-1", receiptNumber: "RC-2026-B2" });
    const { status, json } = await post(buildApp(), "/api/v1/admin/subscriptions/payments/pay-1/validate", {
      note: "Conferido",
    });
    expect(status).toBe(200);
    expect(json).toMatchObject({ success: true });
    expect(mocks.billing.updateSubscription).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({ status: "active" }),
    );
    expect(mocks.emailReceipt).toHaveBeenCalledWith(expect.objectContaining({ receiptNumber: "RC-2026-B2" }));
  });

  it("pagamento inexistente responde 404", async () => {
    mocks.billing.findPaymentById.mockResolvedValue(null);
    const { status, json } = await post(buildApp(), "/api/v1/admin/subscriptions/payments/pay-x/validate", {});
    expect(status).toBe(404);
    expect(json).toMatchObject({ success: false });
  });
});

describe("POST /api/v1/admin/subscriptions/:id/notify", () => {
  it("envia email, regista nota e responde 200", async () => {
    mocks.billing.findSubscriptionById.mockResolvedValue({
      id: "sub-1",
      userId: "u1",
      organizationId: "org-1",
      status: "paused",
      planName: "Workdeal Trust",
      planPriceMzn: 3500,
      metadata: {},
    });
    const { status, json } = await post(buildApp(), "/api/v1/admin/subscriptions/sub-1/notify", {
      message: "Falta confirmar o pagamento",
    });
    expect(status).toBe(200);
    expect(json).toMatchObject({ success: true, data: { emailed: "contato@empresa.co.mz" } });
    expect(mocks.emailNotice).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Falta confirmar o pagamento" }),
    );
  });

  it("mensagem vazia responde 400", async () => {
    const { status } = await post(buildApp(), "/api/v1/admin/subscriptions/sub-1/notify", { message: "" });
    expect(status).toBe(400);
    expect(mocks.emailNotice).not.toHaveBeenCalled();
  });
});
