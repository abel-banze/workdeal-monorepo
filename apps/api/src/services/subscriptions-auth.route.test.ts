import { describe, it, expect } from "vitest";
import { Hono } from "hono";

// Middleware de auth REAL (sem mock): sem credenciais, o better-auth não
// encontra token de sessão e o requireAuth deve responder 401 — sem tocar na BD.
import { subscriptionsRoute } from "../routes/subscriptions.route.js";
import { errorHandler } from "../lib/errors.js";

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/subscriptions", subscriptionsRoute);
  app.onError(errorHandler);
  return app;
}

describe("POST /api/v1/subscriptions/current/subscribe sem sessão", () => {
  it("responde 401 UNAUTHORIZED com envelope fail", async () => {
    const res = await buildApp().request("/api/v1/subscriptions/current/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: "org-1", planId: "plan-trust" }),
    });
    expect(res.status).toBe(401);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ success: false, error: expect.objectContaining({ code: "UNAUTHORIZED" }) });
  }, 30000);
});
