import type { AiCredentialUpsertInput, AiSettingsUpdateInput, AiUsageQueryInput } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { aiSettingsService } from "../services/ai-settings.service.js";
import { AppError } from "../lib/errors.js";

type RealProvider = "google" | "anthropic" | "openai";

export const aiSettingsController = {
  async getOverview() {
    const data = await aiSettingsService.getAdminOverview();
    return { body: ok(data), status: 200 as const };
  },

  async updateSettings(input: AiSettingsUpdateInput) {
    const data = await aiSettingsService.updateSettings(input);
    return { body: ok(data), status: 200 as const };
  },

  async upsertCredential(input: AiCredentialUpsertInput) {
    const data = await aiSettingsService.upsertCredential(input.provider as RealProvider, input.apiKey);
    return { body: ok(data), status: 200 as const };
  },

  async deleteCredential(providerRaw: string) {
    const provider = parseProvider(providerRaw);
    if (!provider) throw new AppError(400, "BAD_REQUEST", "Provider inválido");
    const data = await aiSettingsService.deleteCredential(provider);
    return { body: ok({ deleted: data }), status: 200 as const };
  },

  async testConnection() {
    const data = await aiSettingsService.testConnection();
    return { body: ok(data), status: 200 as const };
  },

  async getUsage(q: AiUsageQueryInput) {
    const data = await aiSettingsService.getUsage(q);
    return { body: ok(data), status: 200 as const };
  },
};

function parseProvider(value: string): RealProvider | null {
  if (value === "google" || value === "anthropic" || value === "openai") return value;
  return null;
}