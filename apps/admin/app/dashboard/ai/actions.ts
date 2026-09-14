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

export async function saveAiSettings(input: AiSettingsUpdateInput) {
  return saveAiSettingsAction(input);
}

export async function upsertAiCredential(input: AiCredentialUpsertInput) {
  return upsertAiCredentialAction(input);
}

export async function deleteAiCredential(provider: string) {
  return deleteAiCredentialAction(provider);
}

export async function testAiConnection(): Promise<ApiEnvelope<unknown>> {
  return testAiConnectionAction();
}