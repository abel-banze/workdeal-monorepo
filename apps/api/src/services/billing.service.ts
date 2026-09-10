import { billingRepository, type PlanRow } from "../repositories/billing.repository.js";
import { affiliateService } from "./affiliate.service.js";
import { AppError } from "../lib/errors.js";
import { getOrgRole } from "@workdeal/auth";
import type { CancelSubscriptionInput, ChangeSubscriptionPlanInput, ChangeMySubscriptionPlanInput, SubscribeMySubscriptionInput, AdminUpdateSubscriptionStatusInput, AdminValidatePaymentInput, AdminNotifyCompanyInput, PlanCreateInput, PlanFeatureUpsertInput, PlanUpdateInput, PlanInterval } from "@workdeal/shared";
import { CODEBAZ_BILLING_ISSUER, PLAN_INTERVAL_LABELS_PT, VERIFICATION_TRUST_PAYMENT } from "@workdeal/shared";
import { sendSubscriptionInvoiceEmail, sendSubscriptionReceiptEmail, sendSubscriptionNoticeEmail } from "./email.service.js";

/** Fim do período inicial a partir do intervalo do plano. */
function addPlanPeriod(from: Date, interval: PlanInterval): Date {
  const end = new Date(from);
  if (interval === "yearly") end.setFullYear(end.getFullYear() + 1);
  else if (interval === "quarterly") end.setMonth(end.getMonth() + 3);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

function formatMzn(value: number): string {
  return `${value.toLocaleString("pt-MZ")} MZN`;
}

function formatDatePt(value: Date): string {
  return value.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" });
}

/** Número de documento (factura/recibo) único, com retry em colisão. */
async function uniqueDocumentNumber(
  prefix: string,
  exists: (n: string) => Promise<unknown>,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "X");
    const number = `${prefix}-${new Date().getFullYear()}-${rand}`;
    if (!(await exists(number))) return number;
  }
  throw new AppError(500, "DOCUMENT_NUMBER_FAILED", "Não foi possível gerar número de documento único");
}

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

  /**
   * Modo manual: admin confirma que um pagamento foi recebido (status
   * 'succeeded'). Dispara a creditação de comissão de afiliado se a empresa
   * da factura tiver sido indicada por um parceiro.
   */
  async confirmPaymentAsAdmin(paymentId: string) {
    const result = await billingRepository.confirmManualPayment(paymentId);
    if (!result) throw new AppError(404, "NOT_FOUND", "Pagamento não encontrado");

    const affiliateCredit = await affiliateService.creditOnInvoicePaid({
      invoiceId: result.invoiceId,
      organizationId: result.organizationId,
      totalMzn: result.totalMzn,
    });

    return { ...result, affiliateCredit };
  }

  // ── Portais tenant (dashboard web/mobile) ──────────────────────────────
  // O ownership é verificado sempre: só membros (org) ou o próprio utilizador
  // (pessoal) podem ler/alterar a subscrição.

  // Catálogo público de planos — activos e isPublic, com features resolvidas
  // (próprias + herança). Sem auth; usado pela página de planos e checkout.
  async listPublicPlans() {
    const plans = await billingRepository.listPublicPlans();
    return Promise.all(
      plans.map(async (p) => ({
        ...p,
        features: await this.resolveOwnAndInheritedFeatureKeys(p.id),
      })),
    );
  }

  /**
   * Subscrição actual de um utilizador num âmbito (org ou pessoal), com o
   * plano e as features resolvidas. Lança 403 se o utilizador não for membro
   * da organização; 404 se não existir subscrição.
   */
  async getMySubscription(userId: string, organizationId: string | null) {
    const sub = await this.requireOwnedSubscription(userId, organizationId);
    const plan = await billingRepository.findPlanById(sub.planId);
    // Pagamento de activação ainda por validar (comprovativo para a empresa rever).
    const payments = await billingRepository.listPaymentsForSubscription(sub.id);
    const pending = payments.find((p) => p.status === "pending" && (p.metadata as Record<string, unknown> | null)?.kind === "subscription_activation") ?? null;
    const pendingPayment = pending
      ? {
          id: pending.id,
          amountMzn: pending.amountMzn,
          method: pending.method,
          status: pending.status,
          invoiceNumber: pending.invoiceNumber,
          createdAt: pending.createdAt,
          proof: ((pending.metadata as Record<string, unknown> | null)?.proof as { fileId?: string; url?: string; name?: string; reference?: string } | undefined) ?? null,
        }
      : null;
    return {
      subscription: sub,
      plan: plan ?? null,
      features: plan ? await this.resolveOwnAndInheritedFeatureKeys(plan.id) : [],
      pendingPayment,
    };
  }

  /**
   * Primeira activação self-service: cria a subscrição do âmbito no plano
   * escolhido, ou reactiva uma subscrição cancelada/expirada. Lança 403 sem
   * membership, 404 se o plano não estiver disponível, 409 se já existir
   * subscrição activa (nesse caso usa-se a mudança de plano).
   *
   * Pagamento: mesmos dados da verificação de identidade (Millennium BIM +
   * comprovativo). Planos pagos exigem o comprovativo (400 PROOF_REQUIRED sem
   * ele): a subscrição nasce em `paused` (aguarda validação), com factura
   * gerada e enviada por email (Codebaz SU, Lda) e pagamento `pending`.
   * O admin valida no painel (activa + recibo). Planos gratuitos activam
   * de imediato, sem pagamento nem factura.
   */
  async subscribeMySubscriptionPlan(userId: string, organizationId: string | null, input: SubscribeMySubscriptionInput) {
    if (organizationId) {
      const role = await getOrgRole(userId, organizationId);
      if (!role) {
        throw new AppError(403, "FORBIDDEN", "Sem acesso à subscrição desta organização");
      }
    }
    const plan = await billingRepository.findPlanById(input.planId);
    if (!plan || !plan.isActive || !plan.isPublic) {
      throw new AppError(404, "NOT_FOUND", "Plano não disponível");
    }
    const existing = await billingRepository.findSubscriptionForScope(userId, organizationId);
    if (existing && ["active", "trialing", "past_due", "paused"].includes(existing.status)) {
      throw new AppError(409, "ALREADY_SUBSCRIBED", "Já existe uma subscrição activa — usa Mudar de plano");
    }
    const proof = input.payment && input.payment.fileId && input.payment.url ? input.payment : null;
    if (plan.priceMzn > 0 && !proof) {
      throw new AppError(400, "PROOF_REQUIRED", "Este plano é pago — anexa o comprovativo de pagamento");
    }
    const now = new Date();
    const currentPeriodEnd = addPlanPeriod(now, plan.interval);
    const paid = plan.priceMzn > 0;
    const subscription = existing
      ? // Reactivação: pausa a aguardar pagamento (ou activa se gratuito),
        // limpa cancelamento/pausa anterior e abre um período novo.
        await billingRepository.updateSubscription(existing.id, {
          planId: plan.id,
          status: paid ? "paused" : "active",
          currentPeriodStart: now,
          currentPeriodEnd,
          cancelAt: null,
          cancelledAt: null,
          cancelReason: null,
          pausedAt: paid ? now : null,
          resumeAt: null,
          metadata: {
            ...((existing.metadata as Record<string, unknown> | null) ?? {}),
            awaitingPayment: paid,
          },
        })
      : await billingRepository.createSubscription({
          userId,
          organizationId,
          planId: plan.id,
          status: paid ? "paused" : "active",
          currentPeriodStart: now,
          currentPeriodEnd,
          ...(paid
            ? {
                pausedAt: now,
                metadata: { awaitingPayment: true },
              }
            : {}),
        });
    if (!proof) return { subscription, payment: null, invoice: null, invoiceEmail: null };

    const subscriptionId = (subscription as { id?: string } | null)?.id ?? null;
    const recorded = await this.recordPlanPayment({
      userId,
      organizationId,
      subscriptionId,
      plan,
      proof,
      periodStart: now,
      periodEnd: currentPeriodEnd,
    });
    return { subscription, ...recorded };
  }

  /**
   * Regista o pagamento de um plano pago com comprovativo: factura + linha,
   * pagamento `pending` ligado à factura e envio da factura por email
   * (best-effort). Partilhado pela activação e pelo upgrade.
   */
  private async recordPlanPayment(args: {
    userId: string;
    organizationId: string | null;
    subscriptionId: string | null;
    plan: Pick<PlanRow, "id" | "name" | "priceMzn" | "interval">;
    proof: { method?: string; fileId: string; url: string; name?: string | null; reference?: string | null };
    periodStart: Date;
    periodEnd: Date;
  }) {
    const { userId, organizationId, subscriptionId, plan, proof, periodStart, periodEnd } = args;
    const now = new Date();
    const invoiceNumber = await uniqueDocumentNumber("FT", (n) => billingRepository.findInvoiceByNumber(n));
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);
    const invoice = await billingRepository.createInvoice({
      subscriptionId,
      userId,
      organizationId,
      invoiceNumber,
      subtotalMzn: plan.priceMzn,
      discountMzn: 0,
      taxMzn: 0,
      totalMzn: plan.priceMzn,
      periodStart,
      periodEnd,
      dueDate,
      metadata: { kind: "subscription_activation", planId: plan.id },
    });
    await billingRepository.createInvoiceLineItem({
      invoiceId: (invoice as { id: string }).id,
      description: `Subscrição ${plan.name} — ${PLAN_INTERVAL_LABELS_PT[plan.interval] ?? plan.interval}`,
      quantity: 1,
      unitPriceMzn: plan.priceMzn,
      totalMzn: plan.priceMzn,
    });
    const payment = await billingRepository.createManualPayment({
      userId,
      amountMzn: plan.priceMzn,
      method: proof.method ?? "bank_transfer",
      metadata: {
        kind: "subscription_activation",
        subscriptionId,
        invoiceId: (invoice as { id: string }).id,
        organizationId,
        planId: plan.id,
        proof: { fileId: proof.fileId, url: proof.url, name: proof.name ?? "", reference: proof.reference ?? "" },
      },
    });
    // Liga o pagamento à factura (exigido pelo confirmManualPayment).
    await billingRepository.setPaymentInvoice(
      (payment as { id: string }).id,
      (invoice as { id: string }).id,
    );

    // Factura por email (best-effort: falha no envio não anula o pedido).
    const contact = await billingRepository.findBillingContact(userId, organizationId);
    const recipient = contact.organization?.contactEmail ?? contact.userEmail;
    const customerName = contact.organization?.name ?? contact.userName ?? contact.userEmail ?? "Cliente";
    let invoiceEmail: { ok: boolean; error?: string } = { ok: false, error: "Sem email de contacto" };
    if (recipient) {
      const sent = await sendSubscriptionInvoiceEmail({
        to: recipient,
        customerName,
        invoiceNumber,
        planName: plan.name,
        intervalLabel: PLAN_INTERVAL_LABELS_PT[plan.interval] ?? plan.interval,
        amount: formatMzn(plan.priceMzn),
        dueDate: formatDatePt(dueDate),
        issuerName: CODEBAZ_BILLING_ISSUER.name,
        issuerNuit: CODEBAZ_BILLING_ISSUER.nuit,
        bankName: VERIFICATION_TRUST_PAYMENT.bankName,
        nib: VERIFICATION_TRUST_PAYMENT.nib,
        accountNumber: VERIFICATION_TRUST_PAYMENT.accountNumber,
      });
      invoiceEmail = sent.ok ? { ok: true } : { ok: false, error: sent.error };
    }
    return { payment, invoice, invoiceEmail };
  }

  /**
   * Mudança de plano self-service. Subir para um plano mais caro exige
   * comprovativo (400 PROOF_REQUIRED sem ele) e gera factura + pagamento
   * `pending` com envio da factura por email; a mudança aplica-se na hora
   * e mantém o estado actual. Descer de plano não exige pagamento.
   */
  async changeMySubscriptionPlan(userId: string, organizationId: string | null, input: ChangeMySubscriptionPlanInput) {
    const sub = await this.requireOwnedSubscription(userId, organizationId);
    if (["cancelled", "expired"].includes(sub.status)) {
      throw new AppError(409, "ALREADY_CANCELLED", "Subscrição cancelada ou expirada — renove para mudar de plano");
    }
    if (sub.planId === input.planId) return { subscription: sub, payment: null, invoice: null, invoiceEmail: null };

    const plan = await billingRepository.findPlanById(input.planId);
    if (!plan || !plan.isActive || !plan.isPublic) {
      throw new AppError(404, "NOT_FOUND", "Plano não disponível");
    }
    const currentPlan = await billingRepository.findPlanById(sub.planId);
    const currentPrice = currentPlan?.priceMzn ?? 0;
    const isUpgrade = plan.priceMzn > currentPrice;
    const proof = input.payment && input.payment.fileId && input.payment.url ? input.payment : null;
    if (isUpgrade && !proof) {
      throw new AppError(400, "PROOF_REQUIRED", "Subir de plano exige comprovativo de pagamento");
    }
    const subscription = await billingRepository.updateSubscription(sub.id, { planId: input.planId });
    if (!isUpgrade || !proof) return { subscription, payment: null, invoice: null, invoiceEmail: null };
    const recorded = await this.recordPlanPayment({
      userId,
      organizationId,
      subscriptionId: sub.id,
      plan,
      proof,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
    });
    return { subscription, ...recorded };
  }

  async cancelMySubscription(userId: string, organizationId: string | null, input: CancelSubscriptionInput) {
    const sub = await this.requireOwnedSubscription(userId, organizationId);
    return this.cancelSubscription(sub.id, { atPeriodEnd: input.atPeriodEnd, reason: input.reason });
  }

  async pauseMySubscription(userId: string, organizationId: string | null, input: { resumeAt?: Date | null }) {
    const sub = await this.requireOwnedSubscription(userId, organizationId);
    return this.pauseSubscription(sub.id, input.resumeAt ?? null);
  }

  async resumeMySubscription(userId: string, organizationId: string | null) {
    const sub = await this.requireOwnedSubscription(userId, organizationId);
    const meta = (sub.metadata as Record<string, unknown> | null) ?? {};
    if (meta.awaitingPayment) {
      throw new AppError(409, "PAYMENT_PENDING", "Subscrição aguarda confirmação do pagamento — será activada após validação.");
    }
    return this.resumeSubscription(sub.id);
  }

  /** Regista nota interna sem alterar mais nada (reusa o formato de setSubscriptionStatus). */
  private async appendAdminNote(subscriptionId: string, status: string, note: string | null) {
    const sub = await billingRepository.findSubscriptionById(subscriptionId);
    if (!sub) return;
    const meta = ((sub.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
    const adminNotes = [...((meta.adminNotes ?? []) as unknown[])];
    adminNotes.push({ status, note, at: new Date().toISOString() });
    await billingRepository.updateSubscription(subscriptionId, { metadata: { ...meta, adminNotes } });
  }

  private resolveRecipient(contact: {
    userEmail: string | null;
    userName: string | null;
    organization: { name: string; contactEmail: string | null } | null;
  }) {
    return {
      recipient: contact.organization?.contactEmail ?? contact.userEmail,
      customerName: contact.organization?.name ?? contact.userName ?? contact.userEmail ?? "Cliente",
    };
  }

  /**
   * Validação administrativa de pagamento de activação: confirma o pagamento
   * (factura paga), emite o recibo (idempotente), activa a subscrição em
   * pausa e envia o recibo à empresa por email. Nota opcional vai para as
   * notas internas.
   */
  async validateSubscriptionPaymentAsAdmin(paymentId: string, input: AdminValidatePaymentInput) {
    const pay = await billingRepository.findPaymentById(paymentId);
    if (!pay) throw new AppError(404, "NOT_FOUND", "Pagamento não encontrado");
    const payMeta = (pay.metadata as Record<string, unknown> | null) ?? {};
    const subscriptionId = typeof payMeta.subscriptionId === "string" ? payMeta.subscriptionId : null;
    if (payMeta.kind !== "subscription_activation" || !subscriptionId) {
      throw new AppError(400, "NOT_ACTIVATION_PAYMENT", "Este pagamento não é de activação de subscrição");
    }
    const sub = await billingRepository.findSubscriptionById(subscriptionId);
    if (!sub) throw new AppError(404, "NOT_FOUND", "Subscrição não encontrada");

    const confirmed = await billingRepository.confirmManualPayment(paymentId);
    if (!confirmed) throw new AppError(404, "NOT_FOUND", "Factura do pagamento não encontrada");

    let receipt: { id: string; receiptNumber: string } | null = await billingRepository.findReceiptByPaymentId(paymentId);
    if (!receipt) {
      const receiptNumber = await uniqueDocumentNumber("RC", (n) => billingRepository.findReceiptByNumber(n));
      receipt = await billingRepository.createReceipt({
        paymentId,
        receiptNumber,
        userId: pay.userId,
        amountMzn: pay.amountMzn,
        metadata: { kind: "subscription_activation", subscriptionId, invoiceId: pay.invoiceId },
      });
    }
    const receiptNumber = receipt?.receiptNumber ?? "";

    const subMeta = ((sub.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
    delete subMeta.awaitingPayment;
    const subscription = await billingRepository.updateSubscription(sub.id, {
      status: "active",
      pausedAt: null,
      resumeAt: null,
      metadata: subMeta,
    });

    await this.appendAdminNote(
      sub.id,
      "active",
      input.note
        ? `Pagamento validado — recibo ${receiptNumber}. ${input.note}`
        : `Pagamento validado — recibo ${receiptNumber}.`,
    );

    const contact = await billingRepository.findBillingContact(sub.userId, sub.organizationId);
    const { recipient, customerName } = this.resolveRecipient(contact);
    let receiptEmail: { ok: boolean; error?: string } = { ok: false, error: "Sem email de contacto" };
    if (recipient) {
      const invoice = pay.invoiceId ? await billingRepository.findInvoiceById(pay.invoiceId) : null;
      const sent = await sendSubscriptionReceiptEmail({
        to: recipient,
        customerName,
        receiptNumber,
        invoiceNumber: invoice?.invoiceNumber ?? "",
        planName: sub.planName ?? "Subscrição",
        amount: formatMzn(pay.amountMzn),
        paidAt: formatDatePt(new Date()),
        issuerName: CODEBAZ_BILLING_ISSUER.name,
        issuerNuit: CODEBAZ_BILLING_ISSUER.nuit,
      });
      receiptEmail = sent.ok ? { ok: true } : { ok: false, error: sent.error };
    }
    return { payment: confirmed, receipt, subscription, receiptEmail };
  }

  /**
   * Notifica a empresa por email (ex: pagamento por confirmar) e regista a
   * mensagem nas notas internas. Para cancelar em seguida, usar o cancelamento
   * administrativo existente.
   */
  async notifyCompanyAsAdmin(subscriptionId: string, input: AdminNotifyCompanyInput) {
    const sub = await billingRepository.findSubscriptionById(subscriptionId);
    if (!sub) throw new AppError(404, "NOT_FOUND", "Subscrição não encontrada");
    const contact = await billingRepository.findBillingContact(sub.userId, sub.organizationId);
    const { recipient, customerName } = this.resolveRecipient(contact);
    if (!recipient) throw new AppError(400, "NO_CONTACT_EMAIL", "Empresa sem email de contacto");
    const planName = sub.planName ?? "Subscrição";
    const sent = await sendSubscriptionNoticeEmail({
      to: recipient,
      subject: `Subscrição ${planName} — mensagem da equipa Workdeal`,
      customerName,
      planName,
      amount: formatMzn(sub.planPriceMzn ?? 0),
      message: input.message,
    });
    if (!sent.ok) throw new AppError(502, "EMAIL_FAILED", `Falha ao enviar email: ${sent.error ?? "erro desconhecido"}`);
    await this.appendAdminNote(sub.id, sub.status, `Email à empresa: ${input.message}`);
    return { emailed: recipient };
  }

  /** Busca a subscrição do âmbito e confirma que o utilizador a pode gerir. */
  private async requireOwnedSubscription(userId: string, organizationId: string | null) {
    if (organizationId) {
      const role = await getOrgRole(userId, organizationId);
      if (!role) {
        throw new AppError(403, "FORBIDDEN", "Sem acesso à subscrição desta organização");
      }
    }
    const sub = await billingRepository.findSubscriptionForScope(userId, organizationId);
    if (!sub) {
      throw new AppError(404, "NOT_FOUND", "Subscrição não encontrada para este âmbito");
    }
    return sub;
  }
}

export const billingService = new BillingService();