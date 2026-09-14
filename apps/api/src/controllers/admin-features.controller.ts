import { ok } from "../lib/api-response.js";
import { featuresService } from "../services/features.service.js";
import type { FeatureFlagCreateInput, FeatureFlagListQuery, FeatureFlagOverrideUpsertInput, FeatureFlagUpdateInput } from "@workdeal/shared";

export const adminFeaturesController = {
  async listFlags(query: FeatureFlagListQuery) {
    const items = await featuresService.listFlags(query.group ?? null);
    return { body: ok(items), status: 200 as const };
  },

  async getFlag(key: string) {
    const row = await featuresService.getFlag(key);
    return { body: ok(row), status: 200 as const };
  },

  async getFlagOverrides(key: string) {
    const rows = await featuresService.getFlagOverrides(key);
    return { body: ok(rows), status: 200 as const };
  },

  async createFlag(input: FeatureFlagCreateInput) {
    const row = await featuresService.createFlag(input);
    return { body: ok(row), status: 201 as const };
  },

  async updateFlag(key: string, input: FeatureFlagUpdateInput) {
    const row = await featuresService.updateFlag(key, input);
    return { body: ok(row), status: 200 as const };
  },

  async removeFlag(key: string) {
    await featuresService.deleteFlag(key);
    return { body: ok({ removed: true }), status: 200 as const };
  },

  async toggleFlag(key: string) {
    const row = await featuresService.toggleFlagDefault(key);
    return { body: ok(row), status: 200 as const };
  },

  async toggleEmergency(key: string) {
    const row = await featuresService.toggleFlagEmergency(key);
    return { body: ok(row), status: 200 as const };
  },

  async setOverride(key: string, organizationId: string, input: FeatureFlagOverrideUpsertInput, actorUserId: string) {
    const row = await featuresService.setFlagOverride({
      flagKey: key,
      organizationId,
      enabled: input.enabled,
      note: input.note ?? null,
      createdByUserId: actorUserId,
      expiresAt: input.expiresAt ?? null,
    });
    return { body: ok(row), status: 200 as const };
  },

  async removeOverride(key: string, organizationId: string) {
    await featuresService.removeFlagOverride(key, organizationId);
    return { body: ok({ removed: true }), status: 200 as const };
  },

  /** Auditoria de integridade — flags que bloqueiam subscrições com plano activo. */
  async assertIntegrity() {
    const result = await featuresService.assertEntitlementIntegrity();
    return { body: ok(result), status: 200 as const };
  },
};