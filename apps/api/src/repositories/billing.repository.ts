import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { coupon, db, invoice, invoiceLineItem, organization, payment, plan, planFeature, receipt, subscription, user } from "@workdeal/db";
import type { PlanInterval, PlanListQuery, SubscriptionListQuery, SubscriptionStatus } from "@workdeal/shared";

// ── Tipos de linha (admin) ────────────────────────────────────────────────

export interface PlanRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  inheritFromPlanId: string | null;
  priceMzn: number;
  interval: PlanInterval;
  trialDays: number;
  maxProfiles: number | null;
  maxTeamMembers: number | null;
  maxListings: number | null;
  maxBranches: number | null;
  apiAccess: boolean;
  maxApiCallsPerMonth: number | null;
  isPublic: boolean;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeatureRow {
  planId: string;
  featureKey: string;
  featureValue: string | null;
  label: string | null;
  createdAt: Date;
}

export interface SubscriptionAdminRow {
  id: string;
  userId: string;
  organizationId: string | null;
  planId: string;
  status: string;
  trialStartsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  pausedAt: Date | null;
  resumeAt: Date | null;
  couponId: string | null;
  discountMzn: number;
  provider: string | null;
  providerSubscriptionId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  planName: string;
  planSlug: string;
  planPriceMzn: number;
  planInterval: string;
  couponCode: string | null;
  organizationName: string | null;
  contactEmail: string | null;
  userEmail: string;
  userName: string | null;
}

export interface InvoiceAdminRow {
  id: string;
  subscriptionId: string | null;
  userId: string;
  organizationId: string | null;
  invoiceNumber: string;
  status: string;
  subtotalMzn: number;
  discountMzn: number;
  taxMzn: number;
  totalMzn: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  provider: string | null;
  providerInvoiceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentAdminRow {
  id: string;
  invoiceId: string | null;
  userId: string;
  amountMzn: number;
  currency: string;
  status: string;
  method: string | null;
  provider: string | null;
  providerPaymentId: string | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  refundAmountMzn: number | null;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  invoiceNumber: string | null;
}

// ── Planos ────────────────────────────────────────────────────────────────

const planColumns = {
  id: plan.id,
  slug: plan.slug,
  name: plan.name,
  description: plan.description,
  inheritFromPlanId: plan.inheritFromPlanId,
  priceMzn: plan.priceMzn,
  interval: plan.interval,
  trialDays: plan.trialDays,
  maxProfiles: plan.maxProfiles,
  maxTeamMembers: plan.maxTeamMembers,
  maxListings: plan.maxListings,
  maxBranches: plan.maxBranches,
  apiAccess: plan.apiAccess,
  maxApiCallsPerMonth: plan.maxApiCallsPerMonth,
  isPublic: plan.isPublic,
  isActive: plan.isActive,
  metadata: plan.metadata,
  sortOrder: plan.sortOrder,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
};

export const billingRepository = {
  // ── Planos ──────────────────────────────────────────────────────────────
  async listPlans(query: PlanListQuery): Promise<{ items: PlanRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (!query.includeInactive) {
      conditions.push(eq(plan.isActive, true));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select(planColumns)
        .from(plan)
        .where(where)
        .orderBy(asc(plan.sortOrder), asc(plan.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(plan).where(where).then((r) => r[0]?.count ?? 0),
    ]);

    return { items: rows as PlanRow[], total: totalRows };
  },

  async findPlanById(id: string): Promise<PlanRow | null> {
    const [row] = await db.select(planColumns).from(plan).where(eq(plan.id, id)).limit(1);
    return (row as PlanRow) ?? null;
  },

  async findPlanBySlug(slug: string): Promise<PlanRow | null> {
    const [row] = await db.select(planColumns).from(plan).where(eq(plan.slug, slug)).limit(1);
    return (row as PlanRow) ?? null;
  },

  // Catálogo público (sem auth) — só planos activos e visíveis no site/dashboard.
  async listPublicPlans(): Promise<PlanRow[]> {
    const rows = await db
      .select(planColumns)
      .from(plan)
      .where(and(eq(plan.isActive, true), eq(plan.isPublic, true)))
      .orderBy(asc(plan.sortOrder), asc(plan.createdAt));
    return rows as PlanRow[];
  },

  async createPlan(data: Omit<PlanRow, "id" | "createdAt" | "updatedAt">): Promise<PlanRow> {
    const [row] = await db.insert(plan).values({ ...data, id: crypto.randomUUID() }).returning();
    return row as PlanRow;
  },

  async updatePlan(id: string, data: Partial<Omit<PlanRow, "id" | "createdAt" | "updatedAt">>): Promise<PlanRow | null> {
    const [row] = await db
      .update(plan)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(plan.id, id))
      .returning();
    return (row as PlanRow) ?? null;
  },

  async deletePlan(id: string): Promise<boolean> {
    const [row] = await db.delete(plan).where(eq(plan.id, id)).returning({ id: plan.id });
    return !!row;
  },

  async countSubscriptionsForPlan(planId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscription)
      .where(eq(subscription.planId, planId));
    return row?.count ?? 0;
  },

  async countPlansInheritingFrom(planId: string): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(plan).where(eq(plan.inheritFromPlanId, planId));
    return row?.count ?? 0;
  },

  // ── Features ────────────────────────────────────────────────────────────
  async listFeatures(planId: string): Promise<PlanFeatureRow[]> {
    return db
      .select()
      .from(planFeature)
      .where(eq(planFeature.planId, planId))
      .orderBy(asc(planFeature.featureKey)) as Promise<PlanFeatureRow[]>;
  },

  async replaceFeatures(planId: string, features: { featureKey: string; featureValue: string | null; label: string | null }[]) {
    await db.delete(planFeature).where(eq(planFeature.planId, planId));
    if (features.length === 0) return;
    await db
      .insert(planFeature)
      .values(features.map((f) => ({ planId, featureKey: f.featureKey, featureValue: f.featureValue, label: f.label })));
  },

  // ── Subscrições ─────────────────────────────────────────────────────────
  async listSubscriptions(query: SubscriptionListQuery): Promise<{ items: SubscriptionAdminRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.status) conditions.push(eq(subscription.status, query.status as never));
    if (query.planId) conditions.push(eq(subscription.planId, query.planId));
    if (query.scope === "personal") conditions.push(sql`${subscription.organizationId} is null`);
    if (query.scope === "organization") conditions.push(sql`${subscription.organizationId} is not null`);
    if (query.search) {
      const q = `%${query.search}%`;
      conditions.push(or(ilike(user.email, q), ilike(user.name, q), ilike(organization.name, q)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      this._selectSubscriptionRows().where(where).orderBy(desc(subscription.createdAt)).limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscription)
        .leftJoin(user, eq(subscription.userId, user.id))
        .leftJoin(organization, eq(subscription.organizationId, organization.id))
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return { items: rows as SubscriptionAdminRow[], total: totalRows };
  },

  async findSubscriptionById(id: string): Promise<SubscriptionAdminRow | null> {
    const [row] = await this._selectSubscriptionRows().where(eq(subscription.id, id)).limit(1);
    return (row as SubscriptionAdminRow | undefined) ?? null;
  },

  // Subscrição "actual" de um utilizador: da organização (se scope org) ou a
  // pessoal (userId + organizationId nulo). Uma organização só tem uma subscrição.
  async findSubscriptionForScope(userId: string, organizationId: string | null): Promise<SubscriptionAdminRow | null> {
    const where = organizationId
      ? eq(subscription.organizationId, organizationId)
      : and(sql`${subscription.organizationId} is null`, eq(subscription.userId, userId));
    const [row] = await this._selectSubscriptionRows().where(where).orderBy(desc(subscription.createdAt)).limit(1);
    return (row as SubscriptionAdminRow | undefined) ?? null;
  },

  _selectSubscriptionRows() {
    return db
      .select({
        id: subscription.id,
        userId: subscription.userId,
        organizationId: subscription.organizationId,
        planId: subscription.planId,
        status: subscription.status,
        trialStartsAt: subscription.trialStartsAt,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAt: subscription.cancelAt,
        cancelledAt: subscription.cancelledAt,
        cancelReason: subscription.cancelReason,
        pausedAt: subscription.pausedAt,
        resumeAt: subscription.resumeAt,
        couponId: subscription.couponId,
        discountMzn: subscription.discountMzn,
        provider: subscription.provider,
        providerSubscriptionId: subscription.providerSubscriptionId,
        metadata: subscription.metadata,
        contactEmail: organization.contactEmail,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
        planName: plan.name,
        planSlug: plan.slug,
        planPriceMzn: plan.priceMzn,
        planInterval: plan.interval,
        couponCode: coupon.code,
        organizationName: organization.name,
        userEmail: user.email,
        userName: user.name,
      })
      .from(subscription)
      .innerJoin(plan, eq(subscription.planId, plan.id))
      .innerJoin(user, eq(subscription.userId, user.id))
      .leftJoin(organization, eq(subscription.organizationId, organization.id))
      .leftJoin(coupon, eq(subscription.couponId, coupon.id));
  },

  // Criação self-service (primeira activação): só os campos obrigatórios —
  // `id`, `status`, `discountMzn` e timestamps têm defaults na tabela.
  async createSubscription(data: {
    userId: string;
    organizationId: string | null;
    planId: string;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    pausedAt?: Date | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const [row] = await db.insert(subscription).values(data).returning({ id: subscription.id });
    return row ?? null;
  },

  // Pagamento manual self-service (activação com comprovativo): fica
  // `pending` com a prova em metadata, para o admin confirmar no fluxo
  // existente (confirmManualPayment). Sem factura associada nesta fase.
  async createManualPayment(data: {
    userId: string;
    amountMzn: number;
    method: string | null;
    metadata: Record<string, unknown> | null;
  }) {
    const [row] = await db
      .insert(payment)
      .values({ ...data, status: "pending" })
      .returning({ id: payment.id });
    return row ?? null;
  },

  async updateSubscription(id: string, data: Partial<Record<string, unknown>>) {
    const [row] = await db
      .update(subscription)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscription.id, id))
      .returning();
    return row ?? null;
  },

  // ── Subscrição por defeito (plano free) ────────────────────────────────
  // Dá a uma empresa o plano free na primeira vez que é activada (onboarding).
  // Idempotente: não cria nada se já existir uma subscrição para a organização.
  async ensureDefaultSubscription(params: {
    userId: string;
    organizationId: string;
    planSlug?: string;
  }): Promise<{ created: boolean; subscriptionId: string | null }> {
    const freePlan = await this.findPlanBySlug(params.planSlug ?? "free");
    if (!freePlan) return { created: false, subscriptionId: null };

    const [existing] = await db
      .select({ id: subscription.id })
      .from(subscription)
      .where(eq(subscription.organizationId, params.organizationId))
      .limit(1);
    if (existing) return { created: false, subscriptionId: existing.id };

    const now = new Date();
    const currentPeriodEnd = new Date(now);
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 100);

    const [row] = await db
      .insert(subscription)
      .values({
        id: crypto.randomUUID(),
        userId: params.userId,
        organizationId: params.organizationId,
        planId: freePlan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd,
        updatedAt: now,
      })
      .returning({ id: subscription.id });
    return { created: true, subscriptionId: row?.id ?? null };
  },

  // ── Facturas / pagamentos de uma subscrição ─────────────────────────────
  async listInvoicesForSubscription(subscriptionId: string): Promise<InvoiceAdminRow[]> {
    return db
      .select()
      .from(invoice)
      .where(eq(invoice.subscriptionId, subscriptionId))
      .orderBy(desc(invoice.periodEnd)) as Promise<InvoiceAdminRow[]>;
  },

  async listLineItemsForInvoices(invoiceIds: string[]) {
    if (invoiceIds.length === 0) return new Map<string, typeof invoiceLineItem.$inferSelect[]>();
    const rows = await db
      .select()
      .from(invoiceLineItem)
      .where(sql`${invoiceLineItem.invoiceId} = any(${invoiceIds})`)
      .orderBy(asc(invoiceLineItem.createdAt));
    const map = new Map<string, typeof invoiceLineItem.$inferSelect[]>();
    for (const r of rows) {
      const arr = map.get(r.invoiceId) ?? [];
      arr.push(r);
      map.set(r.invoiceId, arr);
    }
    return map;
  },

  async listPaymentsForSubscription(subscriptionId: string): Promise<PaymentAdminRow[]> {
    return db
      .select({
        id: payment.id,
        invoiceId: payment.invoiceId,
        userId: payment.userId,
        amountMzn: payment.amountMzn,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        paidAt: payment.paidAt,
        refundedAt: payment.refundedAt,
        refundAmountMzn: payment.refundAmountMzn,
        failureReason: payment.failureReason,
        metadata: payment.metadata,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        invoiceNumber: invoice.invoiceNumber,
      })
      .from(payment)
      .leftJoin(invoice, eq(payment.invoiceId, invoice.id))
      .where(sql`${invoice.subscriptionId} = ${subscriptionId}`)
      .orderBy(desc(payment.createdAt)) as Promise<PaymentAdminRow[]>;
  },

  // ── Facturas / recibos / pagamentos manuais ────────────────────────────

  // Contacto de facturação: nome + email da organização (se houver) e do utilizador.
  async findBillingContact(userId: string, organizationId: string | null) {
    const [u] = await db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    let org: { name: string; contactEmail: string | null } | null = null;
    if (organizationId) {
      const [o] = await db
        .select({ name: organization.name, contactEmail: organization.contactEmail })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);
      org = o ?? null;
    }
    return { userEmail: u?.email ?? null as string | null, userName: u?.name ?? null, organization: org };
  },

  async createInvoice(data: {
    subscriptionId: string | null;
    userId: string;
    organizationId: string | null;
    invoiceNumber: string;
    subtotalMzn: number;
    discountMzn: number;
    taxMzn: number;
    totalMzn: number;
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date | null;
    metadata: Record<string, unknown> | null;
  }) {
    const [row] = await db.insert(invoice).values(data).returning({ id: invoice.id });
    return row ?? null;
  },

  async createInvoiceLineItem(data: {
    invoiceId: string;
    description: string;
    quantity: number;
    unitPriceMzn: number;
    totalMzn: number;
  }) {
    const [row] = await db.insert(invoiceLineItem).values(data).returning({ id: invoiceLineItem.id });
    return row ?? null;
  },

  async findInvoiceById(id: string) {
    const [row] = await db.select().from(invoice).where(eq(invoice.id, id)).limit(1);
    return row ?? null;
  },

  async findInvoiceByNumber(invoiceNumber: string) {
    const [row] = await db.select({ id: invoice.id }).from(invoice).where(eq(invoice.invoiceNumber, invoiceNumber)).limit(1);
    return row ?? null;
  },

  async findReceiptByNumber(receiptNumber: string) {
    const [row] = await db.select({ id: receipt.id }).from(receipt).where(eq(receipt.receiptNumber, receiptNumber)).limit(1);
    return row ?? null;
  },

  async findPaymentById(id: string) {
    const [row] = await db.select().from(payment).where(eq(payment.id, id)).limit(1);
    return row ?? null;
  },

  async setPaymentInvoice(paymentId: string, invoiceId: string) {
    const [row] = await db
      .update(payment)
      .set({ invoiceId, updatedAt: new Date() })
      .where(eq(payment.id, paymentId))
      .returning({ id: payment.id });
    return row ?? null;
  },

  async createReceipt(data: {
    paymentId: string;
    receiptNumber: string;
    userId: string;
    amountMzn: number;
    metadata: Record<string, unknown> | null;
  }) {
    const [row] = await db.insert(receipt).values(data).returning({ id: receipt.id, receiptNumber: receipt.receiptNumber });
    return row ?? null;
  },

  async findReceiptByPaymentId(paymentId: string) {
    const [row] = await db.select().from(receipt).where(eq(receipt.paymentId, paymentId)).limit(1);
    return row ?? null;
  },

  /**
   * Modo manual: marca um pagamento e a factura correspondente como pagos
   * (status 'succeeded'). Idempotente — re-confirmar já não faz nada.
   * Devolve os dados necessários ao afiliado para creditar a 1ª conversão.
   */
  async confirmManualPayment(paymentId: string) {
    return db.transaction(async (tx) => {
      const [pay] = await tx.select().from(payment).where(eq(payment.id, paymentId)).limit(1);
      if (!pay) return null;
      if (pay.invoiceId == null) throw new Error("Pagamento sem factura associada");

      const [inv] = await tx
        .select()
        .from(invoice)
        .where(eq(invoice.id, pay.invoiceId))
        .limit(1);
      if (!inv) return null;

      const now = new Date();
      if (pay.status !== "succeeded") {
        await tx.update(payment).set({ status: "succeeded", paidAt: now, updatedAt: now }).where(eq(payment.id, pay.id));
      }
      if (inv.status !== "succeeded") {
        await tx.update(invoice).set({ status: "succeeded", paidAt: now, updatedAt: now }).where(eq(invoice.id, inv.id));
      }

      return {
        paymentId: pay.id,
        invoiceId: inv.id,
        organizationId: inv.organizationId,
        totalMzn: inv.totalMzn,
        alreadyPaid: pay.status === "succeeded",
      };
    });
  },
};