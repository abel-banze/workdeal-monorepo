import { ok } from "../lib/api-response.js";
import { billingService } from "../services/billing.service.js";
import type { CancelSubscriptionInput, ChangeSubscriptionPlanInput, AdminUpdateSubscriptionStatusInput, AdminValidatePaymentInput, AdminNotifyCompanyInput, PlanFeatureUpsertInput, PauseSubscriptionInput } from "@workdeal/shared";

export const adminBillingController = {
  // ── Planos ──────────────────────────────────────────────────────────────
  async listPlans(query: Parameters<typeof billingService.listPlans>[0]) {
    const result = await billingService.listPlans(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },

  async getPlan(id: string) {
    const row = await billingService.getPlanById(id);
    return { body: ok(row), status: 200 as const };
  },

  async createPlan(input: Parameters<typeof billingService.createPlan>[0]) {
    const row = await billingService.createPlan(input);
    return { body: ok(row), status: 201 as const };
  },

  async updatePlan(id: string, input: Parameters<typeof billingService.updatePlan>[1]) {
    const row = await billingService.updatePlan(id, input);
    return { body: ok(row), status: 200 as const };
  },

  async removePlan(id: string) {
    const removed = await billingService.removePlan(id);
    return { body: ok({ removed }), status: 200 as const };
  },

  async togglePlanActive(id: string) {
    const row = await billingService.togglePlanActive(id);
    return { body: ok(row), status: 200 as const };
  },

  async upsertPlanFeatures(id: string, input: PlanFeatureUpsertInput) {
    const rows = await billingService.upsertFeatures(id, input);
    return { body: ok(rows), status: 200 as const };
  },

  // ── Subscrições ─────────────────────────────────────────────────────────
  async listSubscriptions(query: Parameters<typeof billingService.listSubscriptions>[0]) {
    const result = await billingService.listSubscriptions(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },

  async getSubscription(id: string) {
    const row = await billingService.getSubscriptionById(id);
    return { body: ok(row), status: 200 as const };
  },

  async setSubscriptionStatus(id: string, input: AdminUpdateSubscriptionStatusInput) {
    const row = await billingService.setSubscriptionStatus(id, input);
    return { body: ok(row), status: 200 as const };
  },

  async changeSubscriptionPlan(id: string, input: ChangeSubscriptionPlanInput) {
    const row = await billingService.changeSubscriptionPlan(id, input);
    return { body: ok(row), status: 200 as const };
  },

  async cancelSubscription(id: string, input: CancelSubscriptionInput) {
    const row = await billingService.cancelSubscription(id, input);
    return { body: ok(row), status: 200 as const };
  },

  async pauseSubscription(id: string, input: PauseSubscriptionInput) {
    const row = await billingService.pauseSubscription(id, input.resumeAt ?? null);
    return { body: ok(row), status: 200 as const };
  },

  async resumeSubscription(id: string) {
    const row = await billingService.resumeSubscription(id);
    return { body: ok(row), status: 200 as const };
  },

  // ── Pagamentos (modo manual) ────────────────────────────────────────────
  async confirmPayment(id: string) {
    const row = await billingService.confirmPaymentAsAdmin(id);
    return { body: ok(row), status: 200 as const };
  },

  // Validação de activação: confirma, emite recibo, activa e envia-o à empresa.
  async validatePayment(id: string, input: AdminValidatePaymentInput) {
    const row = await billingService.validateSubscriptionPaymentAsAdmin(id, input);
    return { body: ok(row), status: 200 as const };
  },

  // Notificação à empresa (email + nota interna).
  async notifyCompany(id: string, input: AdminNotifyCompanyInput) {
    const row = await billingService.notifyCompanyAsAdmin(id, input);
    return { body: ok(row), status: 200 as const };
  },
};