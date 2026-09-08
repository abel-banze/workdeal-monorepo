import { billingRepository, type PlanRow } from "../repositories/billing.repository.js";
import { AppError } from "../lib/errors.js";
import type { CancelSubscriptionInput, ChangeSubscriptionPlanInput, AdminUpdateSubscriptionStatusInput, PlanCreateInput, PlanFeatureUpsertInput, PlanUpdateInput } from "@workdeal/shared";

class BillingService {
  // ── Planos ──────────────────────────────────────────────────────────────

  async listPlans(query: Parameters<typeof billingRepository.listPlans>[0]) {
    const result = await billingRepository.listPlans(query);
    return { items: result.items, total: result.total, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  async getPlanById(id: string) {
    const plan = await billingRepository.findPlanById(id);
    if (!plan) throw new AppError(404, "NOT_FOUND", "Plano não encontrado");
    const features = await billingRepository.listFeatures(id);
    const inheritedFeatures = await this.resolveOwnAndInheritedFeatureKeys(id);
    return { ...plan, features, inheritedFeatures };
  }

  async createPlan(input: PlanCreateInput) {
    if (await billingRepository.findPlanBySlug(input.slug)) {
      throw new AppError(409, "SLUG_TAKEN", "Já existe um plano com este slug");
    }
    if (input.inheritFromPlanId) {
      const parent = await billingRepository.findPlanById(input.inheritFromPlanId);
      if (!parent) throw new AppError(400, "INVALID_PARENT", "Plano pai não encontrado");
    }

    const data: Omit<PlanRow, "id" | "createdAt" | "updatedAt"> = {
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      inheritFromPlanId: input.inheritFromPlanId ?? null,
      priceMzn: input.priceMzn,
      interval: input.interval,
      trialDays: input.trialDays,
      maxProfiles: input.maxProfiles ?? null,
      maxTeamMembers: input.maxTeamMembers ?? null,
      maxListings: input.maxListings ?? null,
      maxBranches: input.maxBranches ?? null,
      apiAccess: input.apiAccess,
      maxApiCallsPerMonth: input.maxApiCallsPerMonth ?? null,
      isPublic: input.isPublic,
      isActive: true,
      metadata: input.metadata ?? null,
      sortOrder: input.sortOrder,
    };
    return billingRepository.createPlan(data);
  }

  async updatePlan(id: string, input: PlanUpdateInput) {
    const existing = await billingRepository.findPlanById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Plano não encontrado");

    if (input.inheritFromPlanId) {
      if (input.inheritFromPlanId === id) throw new AppError(400, "CIRCULAR_PARENT", "Um plano não pode herdar de si mesmo");
      const parent = await billingRepository.findPlanById(input.inheritFromPlanId);
      if (!parent) throw new AppError(400, "INVALID_PARENT", "Plano pai não encontrado");
    }

    const data: Partial<Omit<PlanRow, "id" | "createdAt" | "updatedAt">> = {
      name: input.name,
      description: input.description === undefined ? undefined : input.description ?? null,
      inheritFromPlanId: input.inheritFromPlanId === undefined ? undefined : input.inheritFromPlanId ?? null,
      priceMzn: input.priceMzn,
      interval: input.interval,
      trialDays: input.trialDays,
      maxProfiles: input.maxProfiles === undefined ? undefined : input.maxProfiles ?? null,
      maxTeamMembers: input.maxTeamMembers === undefined ? undefined : input.maxTeamMembers ?? null,
      maxListings: input.maxListings === undefined ? undefined : input.maxListings ?? null,
      maxBranches: input.maxBranches === undefined ? undefined : input.maxBranches ?? null,
      apiAccess: input.apiAccess,
      maxApiCallsPerMonth: input.maxApiCallsPerMonth === undefined ? undefined : input.maxApiCallsPerMonth ?? null,
      isPublic: input.isPublic,
      isActive: input.isActive,
      metadata: input.metadata === undefined ? undefined : input.metadata ?? null,
      sortOrder: input.sortOrder,
    };
    return billingRepository.updatePlan(id, data);
  }

  async removePlan(id: string) {
    const existing = await billingRepository.findPlanById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Plano não encontrado");

    const subscriptions = await billingRepository.countSubscriptionsForPlan(id);
    if (subscriptions > 0) {
      throw new AppError(409, "PLAN_IN_USE", "Não é possível eliminar um plano com subscrições activas. Desactive-o primeiro.");
    }
    const children = await billingRepository.countPlansInheritingFrom(id);
    if (children > 0) {
      throw new AppError(409, "PLAN_HAS_INHERITORS", "Existem planos a herdar deste. Reatribua a herança antes de eliminar.");
    }

    return billingRepository.deletePlan(id);
  }

  async togglePlanActive(id: string) {
    const existing = await billingRepository.findPlanById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Plano não encontrado");
    return billingRepository.updatePlan(id, { isActive: !existing.isActive });
  }

  async upsertFeatures(planId: string, input: PlanFeatureUpsertInput) {
    const existing = await billingRepository.findPlanById(planId);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Plano não encontrado");
    const features = input.features.map((f) => ({
      featureKey: f.featureKey,
      featureValue: f.featureValue ?? null,
      label: f.label ?? null,
    }));
    await billingRepository.replaceFeatures(planId, features);
    return billingRepository.listFeatures(planId);
  }

  // Resolve as features do próprio plano + cadeia de herança (Enterprise → Premium → Trust → Free).
  // As features do próprio plano têm prioridade sobre as herdadas.
  async resolveOwnAndInheritedFeatureKeys(planId: string): Promise<{ featureKey: string; featureValue: string | null; label: string | null }[]> {
    let current = await billingRepository.findPlanById(planId);
    const merged = new Map<string, { featureKey: string; featureValue: string | null; label: string | null }>();
    const visited = new Set<string>();

    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      const own = await billingRepository.listFeatures(current.id);
      for (const f of own) {
        merged.set(f.featureKey, { featureKey: f.featureKey, featureValue: f.featureValue, label: f.label });
      }
      current = current.inheritFromPlanId ? await billingRepository.findPlanById(current.inheritFromPlanId) : null;
    }

    return [...merged.values()];
  }

  // ── Subscrições ─────────────────────────────────────────────────────────

  async listSubscriptions(query: Parameters<typeof billingRepository.listSubscriptions>[0]) {
    const result = await billingRepository.listSubscriptions(query);
    return { items: result.items, total: result.total, page: query.page ?? 1, limit: query.limit ?? 20 };
  }

  async getSubscriptionById(id: string) {
    const sub = await billingRepository.findSubscriptionById(id);
    if (!sub) throw new AppError(404, "NOT_FOUND", "Subscrição não encontrada");

    const invoices = await billingRepository.listInvoicesForSubscription(id);
    const lineItems = await billingRepository.listLineItemsForInvoices(invoices.map((i) => i.id));
    const payments = await billingRepository.listPaymentsForSubscription(id);

    return {
      ...sub,
      invoices: invoices.map((inv) => ({ ...inv, lineItems: lineItems.get(inv.id) ?? [] })),
      payments,
    };
  }

  async setSubscriptionStatus(id: string, input: AdminUpdateSubscriptionStatusInput) {
    const existing = await billingRepository.findSubscriptionById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Subscrição não encontrada");

    const adminNotes = [...(((existing.metadata as { adminNotes?: unknown[] } | null)?.adminNotes ?? []) as unknown[])];
    adminNotes.push({
      status: input.status,
      note: input.note ?? null,
      at: new Date().toISOString(),
    });

    return billingRepository.updateSubscription(id, {
      status: input.status as never,
      metadata: { ...(existing.metadata ?? {}), adminNotes },
    });
  }

  async changeSubscriptionPlan(id: string, input: ChangeSubscriptionPlanInput) {
    const existing = await billingRepository.findSubscriptionById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Subscrição não encontrada");
    const plan = await billingRepository.findPlanById(input.planId);
    if (!plan) throw new AppError(404, "NOT_FOUND", "Plano não encontrado");

    return billingRepository.updateSubscription(id, { planId: input.planId });
  }

  async cancelSubscription(id: string, input: CancelSubscriptionInput) {
    const existing = await billingRepository.findSubscriptionById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Subscrição não encontrada");
    if (["cancelled", "expired"].includes(existing.status)) {
      throw new AppError(409, "ALREADY_CANCELLED", "A subscrição já está cancelada ou expirada");
    }

    const now = new Date();
    return billingRepository.updateSubscription(id, {
      status: input.atPeriodEnd ? (existing.status as never) : ("cancelled" as never),
      cancelledAt: now,
      cancelAt: input.atPeriodEnd ? existing.currentPeriodEnd : now,
      cancelReason: input.reason ?? null,
    });
  }

  async pauseSubscription(id: string, resumeAt: Date | null) {
    const existing = await billingRepository.findSubscriptionById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Subscrição não encontrada");
    if (["paused", "cancelled", "expired"].includes(existing.status)) {
      throw new AppError(409, "INVALID_STATUS", "Subscrição não pode ser pausada no estado actual");
    }

    return billingRepository.updateSubscription(id, {
      status: "paused" as never,
      pausedAt: new Date(),
      resumeAt,
    });
  }

  async resumeSubscription(id: string) {
    const existing = await billingRepository.findSubscriptionById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Subscrição não encontrada");
    if (existing.status !== "paused") {
      throw new AppError(409, "NOT_PAUSED", "A subscrição não está pausada");
    }

    return billingRepository.updateSubscription(id, {
      status: "active" as never,
      pausedAt: null,
      resumeAt: null,
    });
  }
}

export const billingService = new BillingService();