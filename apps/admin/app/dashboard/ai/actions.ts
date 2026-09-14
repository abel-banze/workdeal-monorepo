"use server";

import type { AiSettingsUpdateInput, AiCredentialUpsertInput } from "@workdeal/shared";
import type { ApiEnvelope } from "@/lib/api";
import {
  saveAiSettings as saveAiSettingsAction,
  upsertAiCredential as upsertAiCredentialAction,
  deleteAiCredential as deleteAiCredentialAction,
  testAiConnection as testAiConnectionAction,
} from "@/app/actions/admin";

export type SaveResult = { ok: boolean; provider?: string; model?: string; message?: string; latencyMs?: number };
export type CredentialResult = { ok: boolean; message: string };

export function saveAiSettings(input: AiSettingsUpdateInput) {
  return saveAiSettingsAction(input);
}

export function upsertAiCredential(input: AiCredentialUpsertInput) {
  return upsertAiCredentialAction(input);
}

export function deleteAiCredential(provider: string) {
  return deleteAiCredentialAction(provider);
}

export function testAiConnection(): Promise<ApiEnvelope<unknown>> {
  return testAiConnectionAction();
}