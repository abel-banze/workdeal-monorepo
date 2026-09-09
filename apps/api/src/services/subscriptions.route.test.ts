import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Integração route → controller → service da primeira activação, sem BD:
// - auth middleware com passthrough (utilizador fixo);
// - repository + RBAC mockados;
// - o Hono despacha pedidos HTTP reais via app.request().
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

vi.mock("../middlewares/auth.middleware.js", () => ({
  requireAuth: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("user", { id: "u1" });
    c.set("session", null);
    await next();
  },
}));
vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));
vi.mock("../repositories/billing.repository.js", () => ({ billingRepository: mocks.billing }));
vi.mock("./affiliate.service.js", () => ({ affiliateService: mocks.affiliateService }));

import { subscriptionsRoute } from "../routes/subscriptions.route.js";
import { errorHandler } from "../lib/errors.js";

const PLAN = {
  id: "plan-trust",
  slug: "trust",
  name: "Workdeal Trust",
  interval: "monthly",
  isPublic: true,
  isActive: true,
};

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/subscriptions", subscriptionsRoute);
  app.onError(errorHandler);
  return app;
}

async function postSubscribe(app: Hono, body: unknown) {
  const res = await app.request("/api/v1/subscriptions/current/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrgRole.mockResolvedValue("owner");
  mocks.billing.findPlanById.mockResolvedValue(PLAN);
  mocks.billing.findSubscriptionForScope.mockResolvedValue(null);
  mocks.billing.createSubscription.mockResolvedValue({ id: "sub-1" });
  mocks.billing.updateSubscription.mockResolvedValue({ id: "sub-0" });
});

describe("POST /api/v1/subscriptions/current/subscribe", () => {
  it("cria subscrição e responde 201 + envelope ok", async () => {
    const { status, json } = await postSubscribe(buildApp(), { organizationId: "org-1", planId: "plan-trust" });
    expect(status).toBe(201);
    expect(json).toMatchObject({ success: true });
    expect(mocks.billing.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", organizationId: "org-1", planId: "plan-trust", status: "active" }),
    );
  });

  it("segunda activação responde 409 ALREADY_SUBSCRIBED", async () => {
    const app = buildApp();
    await postSubscribe(app, { organizationId: "org-1", planId: "plan-trust" });
    mocks.billing.findSubscriptionForScope.mockResolvedValue({ id: "sub-1", status: "active" });
    const { status, json } = await postSubscribe(app, { organizationId: "org-1", planId: "plan-trust" });
    expect(status).toBe(409);
    expect(json).toMatchObject({ success: false, error: expect.objectContaining({ code: "ALREADY_SUBSCRIBED" }) });
  });

  it("reactiva subscrição cancelada em vez de falhar", async () => {
    mocks.billing.findSubscriptionForScope.mockResolvedValue({ id: "sub-0", status: "cancelled" });
    const { status, json } = await postSubscribe(buildApp(), { organizationId: "org-1", planId: "plan-trust" });
    expect(status).toBe(201);
    expect(json).toMatchObject({ success: true });
    expect(mocks.billing.updateSubscription).toHaveBeenCalledWith(
      "sub-0",
      expect.objectContaining({ planId: "plan-trust", status: "active" }),
    );
  });

  it("plano indisponível responde 404", async () => {
    mocks.billing.findPlanById.mockResolvedValue(null);
    const { status, json } = await postSubscribe(buildApp(), { organizationId: "org-1", planId: "plan-x" });
    expect(status).toBe(404);
    expect(json).toMatchObject({ success: false });
  });

  it("corpo inválido responde 400 (zValidator antes do service)", async () => {
    const { status } = await postSubscribe(buildApp(), { organizationId: "org-1" });
    expect(status).toBe(400);
    expect(mocks.billing.findPlanById).not.toHaveBeenCalled();
  });

  it("plano pago sem comprovativo responde 400 PROOF_REQUIRED", async () => {
    mocks.billing.findPlanById.mockResolvedValue({ ...PLAN, priceMzn: 3500 });
    const { status, json } = await postSubscribe(buildApp(), { organizationId: "org-1", planId: "plan-trust" });
    expect(status).toBe(400);
    expect(json).toMatchObject({ success: false, error: expect.objectContaining({ code: "PROOF_REQUIRED" }) });
    expect(mocks.billing.createSubscription).not.toHaveBeenCalled();
  });

  it("plano pago com comprovativo responde 201 e regista pagamento", async () => {
    mocks.billing.findPlanById.mockResolvedValue({ ...PLAN, priceMzn: 3500 });
    mocks.billing.createManualPayment.mockResolvedValue({ id: "pay-1" });
    const { status, json } = await postSubscribe(buildApp(), {
      organizationId: "org-1",
      planId: "plan-trust",
      payment: { method: "bank_transfer", fileId: "file-1", url: "https://cdn/x.pdf", name: "comp.pdf", reference: "Titular X" },
    });
    expect(status).toBe(201);
    expect(json).toMatchObject({ success: true });
    expect(mocks.billing.createManualPayment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", amountMzn: 3500 }),
    );
  });
});
