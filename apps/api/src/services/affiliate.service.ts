import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, organization as organizationTable, user as userTable } from "@workdeal/db";
import { getOrgRole, listUserOrganizations } from "@workdeal/auth";
import type {
  AffiliateAdminView,
  AffiliateAttributionInput,
  AffiliateCreateInput,
  AffiliateDashboard,
  AffiliateListQuery,
  AffiliateUpdateInput,
} from "@workdeal/shared";
import { normalizeAffiliateCode } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { affiliateRepository } from "../repositories/affiliate.repository.js";
import { webOrigin } from "./pre-register-notifications.service.js";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `WD-${suffix}`;
}

function commissionFor(affiliate: { commissionType: "percent" | "fixed"; commissionValue: number }, invoiceTotalMzn: number): number {
  if (affiliate.commissionType === "percent") {
    return Math.round((invoiceTotalMzn * affiliate.commissionValue) / 100);
  }
  return affiliate.commissionValue;
}

class AffiliateService {
  /** Valida um código (cupom/link) e devolve informação pública do afiliado. */
  async validateCode(code: string) {
    const normalized = normalizeAffiliateCode(code);
    const affiliate = await affiliateRepository.findByCode(normalized);
    if (!affiliate) throw new AppError(404, "AFFILIATE_NOT_FOUND", "Código de indicação inválido");
    if (affiliate.status !== "active") {
      throw new AppError(403, "AFFILIATE_SUSPENDED", "Este código de indicação está suspendido");
    }
    return {
      code: affiliate.code,
      actorType: affiliate.actorType,
      actorName: affiliate.actorName,
      commissionType: affiliate.commissionType,
    };
  }

  /** Atribui a empresa convidada ao afiliado (onboarding). */
  async attach(input: AffiliateAttributionInput, requesterUserId: string) {
    const code = normalizeAffiliateCode(input.code);
    const source = input.source ?? "coupon";
    const affiliate = await affiliateRepository.findByCode(code);
    if (!affiliate) throw new AppError(404, "AFFILIATE_NOT_FOUND", "Código de indicação inválido");
    if (affiliate.status !== "active") {
      throw new AppError(403, "AFFILIATE_SUSPENDED", "Este código de indicação está suspendido");
    }

    // Apenas membros da empresa podem atribuir a sua organização
    const role = await getOrgRole(requesterUserId, input.organizationId);
    if (!role) throw new AppError(403, "FORBIDDEN", "Sem permissão para atribuir esta organização");

    // Anti self-referral
    if (affiliate.actorType === "organization" && affiliate.organizationId === input.organizationId) {
      throw new AppError(409, "SELF_REFERRAL", "Não podes indicar a tua própria empresa");
    }
    if (affiliate.actorType === "user") {
      if (affiliate.userId === requesterUserId) {
        throw new AppError(409, "SELF_REFERRAL", "Não podes usar o teu próprio código de indicação");
      }
      const affiliateBelongsToOrg = await affiliateRepository.isUserMemberOfOrganization(affiliate.userId!, input.organizationId);
      if (affiliateBelongsToOrg) {
        throw new AppError(409, "SELF_REFERRAL", "O indicador não pode pertencer à empresa indicada");
      }
    }

    const existing = await affiliateRepository.findReferralByOrganization(input.organizationId);
    if (existing) {
      if (existing.affiliateId === affiliate.id) return existing;
      throw new AppError(409, "ALREADY_ATTRIBUTED", "Esta empresa já foi atribuída a outro parceiro de indicação");
    }

    return affiliateRepository.createReferral({
      affiliateId: affiliate.id,
      code: affiliate.code,
      source,
      referredOrganizationId: input.organizationId,
    });
  }

  /** Painel do afiliado: código, link, referrals, earnings. */
  async dashboardForUser(userId: string): Promise<AffiliateDashboard> {
    const empty: AffiliateDashboard = {
      affiliate: null,
      inviteLink: "",
      referrals: [],
      earnings: [],
      totals: { companiesInvited: 0, conversions: 0, pendingMzn: 0, paidMzn: 0 },
    };

    let affiliate = await affiliateRepository.findByActor("user", userId);
    if (!affiliate) {
      const orgs = await listUserOrganizations(userId);
      for (const org of orgs) {
        const orgAffiliate = await affiliateRepository.findByActor("organization", org.id);
        if (orgAffiliate) {
          affiliate = orgAffiliate;
          break;
        }
      }
    }
    if (!affiliate) return empty;

    const [referrals, earnings] = await Promise.all([
      affiliateRepository.referralsByAffiliate(affiliate.id),
      affiliateRepository.earningsByAffiliate(affiliate.id),
    ]);

    const totals = {
      companiesInvited: referrals.length,
      conversions: referrals.filter((r) => r.status === "converted").length,
      pendingMzn: earnings.filter((e) => e.status === "pending").reduce((a, e) => a + e.amountMzn, 0),
      paidMzn: earnings.filter((e) => e.status === "paid").reduce((a, e) => a + e.amountMzn, 0),
    };

    return {
      affiliate: {
        id: affiliate.id,
        actorType: affiliate.actorType,
        actorName: affiliate.actorName ?? "Parceiro Workdeal",
        actorId: affiliate.actorType === "user" ? affiliate.userId! : affiliate.organizationId!,
        code: affiliate.code,
        commissionType: affiliate.commissionType,
        commissionValue: affiliate.commissionValue,
        status: affiliate.status,
        createdAt: affiliate.createdAt,
      },
      inviteLink: `${webOrigin().replace(/\/+$/, "")}/signup?ref=${affiliate.code}`,
      referrals,
      earnings,
      totals,
    };
  }

  /**
   * Disparado quando uma factura da empresa convidada é paga (status 'succeeded').
   * Só converte a primeira factura paga; idempotente em facturas seguintes.
   */
  async creditOnInvoicePaid(input: { invoiceId: string; organizationId: string | null; totalMzn: number }) {
    if (!input.organizationId) return null;

    const referral = await affiliateRepository.findReferralByOrganization(input.organizationId);
    if (!referral || referral.status !== "attributed") return null;

    const affiliate = await affiliateRepository.findById(referral.affiliateId);
    if (!affiliate || affiliate.status !== "active") return null;

    const amount = commissionFor(affiliate, input.totalMzn);
    if (amount <= 0) return null;

    return affiliateRepository.convertReferral({
      referralId: referral.id,
      affiliateId: affiliate.id,
      invoiceId: input.invoiceId,
      amountMzn: amount,
    });
  }

  // ── Admin ────────────────────────────────────────────────────

  async listAffiliates(query: AffiliateListQuery) {
    const result = await affiliateRepository.list({ ...query, page: query.page ?? 1, limit: query.limit ?? 20 });

    const { referrals, conversions, pendingMzn, paidMzn } = result.aggregates;
    const items: AffiliateAdminView[] = result.items.map((a) => ({
      id: a.id,
      actorType: a.actorType,
      actorName: a.actorName ?? "—",
      actorId: a.actorType === "user" ? a.userId! : a.organizationId!,
      code: a.code,
      commissionType: a.commissionType,
      commissionValue: a.commissionValue,
      status: a.status,
      referralsCount: referrals.get(a.id) ?? 0,
      conversions: conversions.get(a.id) ?? 0,
      pendingMzn: pendingMzn.get(a.id) ?? 0,
      paidMzn: paidMzn.get(a.id) ?? 0,
      createdAt: a.createdAt,
    }));

    return { items, total: result.total, page: result.page, limit: result.limit };
  }

  async createAffiliate(input: AffiliateCreateInput) {
    if (input.commissionType === "percent" && input.commissionValue > 100) {
      throw new AppError(400, "INVALID_COMMISSION", "Percentagem de comissão não pode ultrapassar 100");
    }

    const existing = await affiliateRepository.findByActor(input.actorType, input.actorId);
    if (existing) throw new AppError(409, "ALREADY_AFFILIATE", "Esta conta já é um afiliado");

    // Verificar que o actor existe
    if (input.actorType === "user") {
      const [row] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.id, input.actorId)).limit(1);
      if (!row) throw new AppError(404, "ACTOR_NOT_FOUND", "Utilizador não encontrado");
    } else {
      const [row] = await db.select({ id: organizationTable.id }).from(organizationTable).where(eq(organizationTable.id, input.actorId)).limit(1);
      if (!row) throw new AppError(404, "ACTOR_NOT_FOUND", "Organização não encontrada");
    }

    let code = generateCode();
    while (await affiliateRepository.findByCode(code)) {
      code = generateCode();
    }

    const created = await affiliateRepository.create({
      actorType: input.actorType,
      userId: input.actorType === "user" ? input.actorId : null,
      organizationId: input.actorType === "organization" ? input.actorId : null,
      code,
      commissionType: input.commissionType,
      commissionValue: input.commissionValue,
    });

    return {
      id: created.id,
      actorType: created.actorType,
      actorName: created.actorName,
      actorId: created.actorType === "user" ? created.userId! : created.organizationId!,
      code: created.code,
      commissionType: created.commissionType,
      commissionValue: created.commissionValue,
      status: created.status,
      createdAt: created.createdAt,
    };
  }

  async updateAffiliate(id: string, input: AffiliateUpdateInput) {
    const existing = await affiliateRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Afiliado não encontrado");

    if (input.commissionType === "percent" && (input.commissionValue ?? 0) > 100) {
      throw new AppError(400, "INVALID_COMMISSION", "Percentagem de comissão não pode ultrapassar 100");
    }

    const updated = await affiliateRepository.update(id, input);
    return updated;
  }
}

export const affiliateService = new AffiliateService();