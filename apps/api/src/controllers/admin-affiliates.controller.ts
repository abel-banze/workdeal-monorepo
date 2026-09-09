import { ok } from "../lib/api-response.js";
import type { AffiliateCreateInput, AffiliateListQuery, AffiliateReferralListQuery, AffiliateUpdateInput } from "@workdeal/shared";
import { affiliateService } from "../services/affiliate.service.js";
import { affiliateRepository } from "../repositories/affiliate.repository.js";

export const adminAffiliatesController = {
  async list(query: AffiliateListQuery) {
    const result = await affiliateService.listAffiliates(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },

  async create(input: AffiliateCreateInput) {
    const row = await affiliateService.createAffiliate(input);
    return { body: ok(row), status: 201 as const };
  },

  async update(id: string, input: AffiliateUpdateInput) {
    const row = await affiliateService.updateAffiliate(id, input);
    return { body: ok(row), status: 200 as const };
  },

  async referrals(affiliateId: string, query: AffiliateReferralListQuery) {
    const [referrals, earnings] = await Promise.all([
      affiliateRepository.referralsByAffiliate(affiliateId, query.limit ?? 50),
      affiliateRepository.earningsByAffiliate(affiliateId, query.limit ?? 50),
    ]);
    return { body: ok({ referrals, earnings }), status: 200 as const };
  },
};