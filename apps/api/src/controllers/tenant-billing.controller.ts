import { ok } from "../lib/api-response.js";
import { billingService } from "../services/billing.service.js";
import type { AuthUser } from "@workdeal/shared";

export const tenantBillingController = {
  // Catálogo público de planos (sem auth).
  async listPublicPlans() {
    const rows = await billingService.listPublicPlans();
    return { body: ok(rows), status: 200 as const };
  },

  // Subscrição actual do utilizador no âmbito indicado.
  async getCurrentSubscription(user: AuthUser, organizationId: string | null) {
    const row = await billingService.getMySubscription(user.id, organizationId);
    return { body: ok(row), status: 200 as const };
  },

  async changePlan(user: AuthUser, organizationId: string | null, input: Parameters<typeof billingService.changeMySubscriptionPlan>[2]) {
    const row = await billingService.changeMySubscriptionPlan(user.id, organizationId, input);
    return { body: ok(row), status: 200 as const };
  },

  async cancelSubscription(user: AuthUser, organizationId: string | null, input: Parameters<typeof billingService.cancelMySubscription>[2]) {
    const row = await billingService.cancelMySubscription(user.id, organizationId, input);
    return { body: ok(row), status: 200 as const };
  },

  async pauseSubscription(user: AuthUser, organizationId: string | null, input: { resumeAt?: Date | null }) {
    const row = await billingService.pauseMySubscription(user.id, organizationId, input);
    return { body: ok(row), status: 200 as const };
  },

  async resumeSubscription(user: AuthUser, organizationId: string | null) {
    const row = await billingService.resumeMySubscription(user.id, organizationId);
    return { body: ok(row), status: 200 as const };
  },
};