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

export type AdminTicketItem = {
  id: string;
  userId: string;
  organizationId: string | null;
  subject: string;
  category: string;
  status: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string | null;
  orgName: string | null;
};

export type AdminTicketMessage = {
  id: string;
  senderUserId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  senderName: string | null;
};

export async function listSupportTickets(query: { status?: string; category?: string; q?: string; page?: number } = {}) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.category) params.set("category", query.category);
  if (query.q) params.set("q", query.q);
  if (query.page) params.set("page", String(query.page));
  params.set("limit", "25");
  const qs = params.toString();
  return apiFetch<AdminTicketItem[]>(`/api/v1/support/admin${qs ? `?${qs}` : ""}`);
}

export async function getSupportTicket(id: string) {
  await requireSystemRole("moderator", "admin");
  return apiFetch<{ messages: AdminTicketMessage[] } & Omit<AdminTicketItem, "messageCount">>(`/api/v1/support/admin/${encodeURIComponent(id)}`);
}

export async function replySupportTicket(id: string, message: string, internal = false) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/support/admin/${encodeURIComponent(id)}/replies`, token, {
    method: "POST",
    body: JSON.stringify({ message, internal }),
  });
}

export async function setSupportTicketStatus(id: string, status: string) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/support/admin/${encodeURIComponent(id)}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export type AdminFeedbackItem = {
  id: string;
  userId: string;
  organizationId: string | null;
  kind: string;
  message: string;
  page: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string | null;
  orgName: string | null;
};

export async function listFeedback(query: { status?: string; kind?: string; page?: number } = {}) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.kind) params.set("kind", query.kind);
  if (query.page) params.set("page", String(query.page));
  params.set("limit", "25");
  const qs = params.toString();
  return apiFetch<AdminFeedbackItem[]>(`/api/v1/feedback/admin${qs ? `?${qs}` : ""}`);
}

export async function updateFeedback(id: string, input: { status: string; adminNote?: string | null }) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/feedback/admin/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
