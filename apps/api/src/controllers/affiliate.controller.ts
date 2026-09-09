import { ok } from "../lib/api-response.js";
import type { AffiliateAttributionInput, AffiliateValidateInput } from "@workdeal/shared";
import { affiliateService } from "../services/affiliate.service.js";

export const affiliateController = {
  async validate(input: AffiliateValidateInput) {
    const data = await affiliateService.validateCode(input.code);
    return { body: ok(data), status: 200 as const };
  },

  async me(userId: string) {
    const data = await affiliateService.dashboardForUser(userId);
    return { body: ok(data), status: 200 as const };
  },

  async attach(userId: string, input: AffiliateAttributionInput) {
    const data = await affiliateService.attach(input, userId);
    return { body: ok(data), status: 201 as const };
  },
};