"use server";

import { apiFetch, apiFetchWithAuth } from "@/lib/api";
import { requireSystemRole } from "@/lib/auth";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";

async function getAuthToken(): Promise<string> {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");
  return token;
}

export type BroadcastCampaignItem = {
  id: string;
  title: string;
  channel: "whatsapp" | "email" | "sms";
  templateKey: string | null;
  subject: string | null;
  bodyHtml: string | null;
  status: "draft" | "ready" | "sending" | "sent";
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  remaining?: number;
};

export async function listBroadcastCampaigns() {
  await requireSystemRole("moderator", "admin");
  return apiFetch<BroadcastCampaignItem[]>("/api/v1/admin/broadcast/campaigns?limit=50");
}

export async function getBroadcastCampaign(id: string) {
  await requireSystemRole("moderator", "admin");
  return apiFetch<BroadcastCampaignItem>(`/api/v1/admin/broadcast/campaigns/${encodeURIComponent(id)}`);
}

export async function createBroadcastCampaign(input: { title: string; channel: string; templateKey?: string | null; subject?: string | null; bodyHtml?: string | null }) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth("/api/v1/admin/broadcast/campaigns", token, { method: "POST", body: JSON.stringify(input) });
}

export async function prepareBroadcastCampaign(id: string) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth<BroadcastCampaignItem>(`/api/v1/admin/broadcast/campaigns/${encodeURIComponent(id)}/prepare`, token, { method: "POST" });
}

export async function sendBroadcastBatch(id: string, limit = 25) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth<{ sent: number; failed: number; remaining: number; total: number }>(
    `/api/v1/admin/broadcast/campaigns/${encodeURIComponent(id)}/send-batch?limit=${limit}`,
    token,
    { method: "POST" },
  );
}

export async function sendIndividualMessage(input: {
  organizationId?: string | null;
  channel: string;
  to?: string | null;
  templateKey?: string | null;
  subject?: string | null;
  body?: string | null;
}) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth("/api/v1/admin/broadcast/send", token, { method: "POST", body: JSON.stringify(input) });
}

export async function searchBroadcastOrganizations(q: string) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams({ search: q, limit: "10" });
  const res = await apiFetch<{ id: string; name: string }[]>(`/api/v1/admin/organizations?${params.toString()}`);
  return (res.data ?? []) as { id: string; name: string }[];
}
