"use server";

import { cookies, headers } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import type {
  AdminUserListQuery,
  AdminOrgListQuery,
  PreRegisterCompanyInput,
  PreRegisterUpdateInput,
  CategoryListQuery,
  CategoryCreateInput,
  CategoryUpdateInput,
  AdminInviteListQuery,
  AdminInviteCreateInput,
  BadgeCreateInput,
  BadgeUpdateInput,
  BadgeAssignInput,
  PlanCreateInput,
  PlanUpdateInput,
  PlanListQuery,
  PlanFeatureUpsertInput,
  SubscriptionListQuery,
  AdminUpdateSubscriptionStatusInput,
  ChangeSubscriptionPlanInput,
  CancelSubscriptionInput,
  PauseSubscriptionInput,
} from "@workdeal/shared";
import { apiFetch, apiFetchWithAuth, apiUpload } from "@/lib/api";
import { requireSystemRole } from "@/lib/auth";

async function getAuthToken(): Promise<string> {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");
  return token;
}

export async function listAdminUsers(query: AdminUserListQuery) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.role) params.set("role", query.role);
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  const res = await apiFetch<unknown>(`/api/v1/admin/users${qs ? `?${qs}` : ""}`);
  return res;
}

export async function listAdminOrganizations(query: AdminOrgListQuery) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.verificationStatus) params.set("verificationStatus", query.verificationStatus);
  if (query.hasMembers) params.set("hasMembers", query.hasMembers);
  if (query.hasProfiles) params.set("hasProfiles", query.hasProfiles);
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  const res = await apiFetch<unknown>(`/api/v1/admin/organizations${qs ? `?${qs}` : ""}`);
  return res;
}

export async function updateUserRole(userId: string, systemRole: "user" | "moderator" | "admin") {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem alterar papéis de sistema");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/users/${userId}/role`, token, {
    method: "PATCH",
    body: JSON.stringify({ systemRole }),
  });
  return res;
}

export async function updateOrgVerificationStatus(id: string, verificationStatus: "pending" | "in_review" | "verified" | "suspended") {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem alterar o estado de verificação");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/organizations/${id}/verification`, token, {
    method: "PATCH",
    body: JSON.stringify({ verificationStatus }),
  });
  return res;
}

export async function preRegisterCompany(input: PreRegisterCompanyInput) {
  const session = await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/organizations/pre-register`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res;
}

export async function listPreRegisteredCompanies(query: AdminOrgListQuery) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  const res = await apiFetch<unknown>(`/api/v1/admin/organizations/pre-registered${qs ? `?${qs}` : ""}`);
  return res;
}

export async function regeneratePreRegisterToken(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem gerar novos links");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/organizations/${id}/pre-register/regenerate-token`, token, {
    method: "POST",
  });
  return res;
}

export async function resendPreRegisterNotification(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem reenviar notificações");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/organizations/${id}/pre-register/resend-notification`, token, {
    method: "POST",
  });
  return res;
}

export async function updatePreRegister(id: string, input: PreRegisterUpdateInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem editar pré-registos");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/organizations/pre-register/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res;
}

export async function deletePreRegister(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem eliminar pré-registos");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/organizations/pre-register/${id}`, token, {
    method: "DELETE",
  });
  return res;
}

export async function getPreRegisterById(id: string) {
  await requireSystemRole("moderator", "admin");
  return apiFetch<unknown>(`/api/v1/admin/organizations/pre-register/${id}`);
}

// --- Convites para a equipa do painel ---

interface AdminInviteRecord {
  id: string;
  email: string;
  role: "user" | "moderator" | "admin";
  status: "pending" | "accepted" | "revoked" | "expired";
  token: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  invitedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listAdminInvites(query: AdminInviteListQuery) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch<AdminInviteRecord[]>(`/api/v1/admin/invites${qs ? `?${qs}` : ""}`);
}

async function buildInviteLink(token: string): Promise<string> {
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost:3001";
  const proto = store.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/invite/${token}`;
}

export async function createAdminInvite(input: AdminInviteCreateInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem criar convites");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth<AdminInviteRecord>(`/api/v1/admin/invites`, token, {
    method: "POST",
    body: JSON.stringify({ ...input, email: input.email.toLowerCase() }),
  });
  if (res.success) {
    const record = res.data;
    return { success: true as const, data: { ...record, link: await buildInviteLink(record.token) } };
  }
  return res as { success: false; error?: { code: string; message: string; details?: unknown } };
}

export async function revokeAdminInvite(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem revogar convites");
  const token = await getAuthToken();
  return apiFetchWithAuth<AdminInviteRecord>(`/api/v1/admin/invites/${id}/revoke`, token, {
    method: "POST",
  });
}

export async function regenerateAdminInvite(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem gerar novos links");
  const token = await getAuthToken();
  return apiFetchWithAuth<AdminInviteRecord>(`/api/v1/admin/invites/${id}/regenerate`, token, {
    method: "POST",
  });
}

export async function acceptAdminInvite(token: string) {
  return apiFetchWithAuth<AdminInviteRecord>(`/api/v1/admin/invites/accept`, null, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function listCategories() {
  const res = await apiFetch<Array<{ id: string; slug: string; name: string }>>(`/api/v1/categories`);
  return res;
}

export async function listAdminCategories(query: CategoryListQuery) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.isActive !== undefined) params.set("isActive", String(query.isActive));
  if (query.parentId) params.set("parentId", query.parentId);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  const res = await apiFetch<unknown>(`/api/v1/admin/categories${qs ? `?${qs}` : ""}`);
  return res;
}

export async function getCategoryById(id: string) {
  await requireSystemRole("moderator", "admin");
  return apiFetch<unknown>(`/api/v1/admin/categories/${id}`);
}

export async function createCategory(input: CategoryCreateInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem criar categorias");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/categories`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res;
}

export async function updateCategory(id: string, input: CategoryUpdateInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem editar categorias");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/categories/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res;
}

export async function deleteCategory(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem eliminar categorias");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/categories/${id}`, token, {
    method: "DELETE",
  });
  return res;
}

export async function toggleCategoryActive(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem activar/desactivar categorias");
  const token = await getAuthToken();
  const res = await apiFetchWithAuth(`/api/v1/admin/categories/${id}/toggle`, token, {
    method: "POST",
  });
  return res;
}

interface UploadedFile {
  id: string;
  url: string;
  publicId: string;
  originalFilename: string;
  bytes: number;
}

export async function uploadPreRegisterLogo(file: File) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem carregar logos");
  if (!file) throw new Error("Selecciona um ficheiro de imagem");
  const token = await getAuthToken();
  const formData = new FormData();
  formData.set("file", file);
  formData.set("purpose", "logo");
  const res = await apiUpload<UploadedFile>(`/api/v1/files/upload`, token, formData);
  return res;
}

export async function uploadInstitutionImage(file: File, purpose: "logo" | "generic") {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem carregar imagens");
  if (!file) throw new Error("Selecciona um ficheiro de imagem");
  const token = await getAuthToken();
  const formData = new FormData();
  formData.set("file", file);
  formData.set("purpose", purpose);
  const res = await apiUpload<UploadedFile>(`/api/v1/files/upload`, token, formData);
  return res;
}

// --- Instituições / Organizações ---

export async function listAdminInstitutions(query: {
  search?: string;
  organizationType?: string;
  status?: string;
  verificationStatus?: string;
  page?: number;
  limit?: number;
}) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.organizationType) params.set("organizationType", query.organizationType);
  if (query.status) params.set("status", query.status);
  if (query.verificationStatus) params.set("verificationStatus", query.verificationStatus);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch<unknown>(`/api/v1/admin/institutions${qs ? `?${qs}` : ""}`);
}

export async function getAdminInstitution(id: string) {
  await requireSystemRole("moderator", "admin");
  return apiFetch<unknown>(`/api/v1/admin/institutions/${id}`);
}

export async function createAdminInstitution(input: Record<string, unknown>) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem criar instituições");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/institutions`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAdminInstitution(id: string, input: Record<string, unknown>) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem editar instituições");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/institutions/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function verifyAdminInstitution(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem verificar instituições");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/institutions/${id}/verify`, token, { method: "POST" });
}

export async function unverifyAdminInstitution(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem anular a verificação");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/institutions/${id}/unverify`, token, { method: "POST" });
}

export async function listInstitutionMemberships(institutionId: string, query: { status?: string; page?: number; limit?: number } = {}) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch<unknown>(`/api/v1/admin/institutions/${institutionId}/memberships${qs ? `?${qs}` : ""}`);
}

export async function approveMembership(membershipId: string) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/institutions/memberships/${membershipId}/approve`, token, { method: "POST" });
}

export async function rejectMembership(membershipId: string) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/institutions/memberships/${membershipId}/reject`, token, { method: "POST" });
}

export async function verifyMembership(membershipId: string) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/institutions/memberships/${membershipId}/verify`, token, { method: "POST" });
}

export async function revokeMembership(membershipId: string) {
  await requireSystemRole("moderator", "admin");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/institutions/memberships/${membershipId}/revoke`, token, { method: "POST" });
}

// --- Selos (badges) ---

export async function listAdminBadges(
  query: { q?: string; type?: string; origin?: string; isActive?: string; page?: number; limit?: number } = {},
) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.type) params.set("type", query.type);
  if (query.origin) params.set("origin", query.origin);
  if (query.isActive !== undefined) params.set("isActive", query.isActive);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch<unknown>(`/api/v1/admin/badges${qs ? `?${qs}` : ""}`);
}

export async function getAdminBadge(id: string) {
  await requireSystemRole("moderator", "admin");
  return apiFetch<unknown>(`/api/v1/admin/badges/${id}`);
}

export async function createBadge(input: BadgeCreateInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem criar selos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/badges`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBadge(id: string, input: BadgeUpdateInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem editar selos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/badges/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteBadge(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem eliminar selos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/badges/${id}`, token, { method: "DELETE" });
}

export async function toggleBadgeActive(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem activar/desactivar selos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/badges/${id}/toggle`, token, { method: "POST" });
}

export async function listInstitutionBadges(institutionId: string) {
  await requireSystemRole("moderator", "admin");
  return apiFetch<unknown>(`/api/v1/admin/badges/institutions/${institutionId}`);
}

export async function assignInstitutionBadge(institutionId: string, input: BadgeAssignInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem atribuir selos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/badges/institutions/${institutionId}`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function revokeInstitutionBadge(institutionId: string, badgeId: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem revogar selos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/badges/institutions/${institutionId}/${badgeId}`, token, { method: "DELETE" });
}

// --- Planos ---

export async function listAdminPlans(query: PlanListQuery = {}) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.includeInactive !== undefined) params.set("includeInactive", String(query.includeInactive));
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch<unknown>(`/api/v1/admin/plans${qs ? `?${qs}` : ""}`);
}

export async function getAdminPlan(id: string) {
  await requireSystemRole("moderator", "admin");
  return apiFetch<unknown>(`/api/v1/admin/plans/${id}`);
}

export async function createPlan(input: PlanCreateInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem criar planos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/plans`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePlan(id: string, input: PlanUpdateInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem editar planos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/plans/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deletePlan(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem eliminar planos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/plans/${id}`, token, { method: "DELETE" });
}

export async function togglePlanActive(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem activar/desactivar planos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/plans/${id}/toggle`, token, { method: "POST" });
}

export async function upsertPlanFeatures(id: string, input: PlanFeatureUpsertInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem gerir features de planos");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/plans/${id}/features`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// --- Subscrições ---

export async function listAdminSubscriptions(query: Partial<SubscriptionListQuery> = {}) {
  await requireSystemRole("moderator", "admin");
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.planId) params.set("planId", query.planId);
  if (query.scope && query.scope !== "all") params.set("scope", query.scope);
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch<unknown>(`/api/v1/admin/subscriptions${qs ? `?${qs}` : ""}`);
}

export async function getAdminSubscription(id: string) {
  await requireSystemRole("moderator", "admin");
  return apiFetch<unknown>(`/api/v1/admin/subscriptions/${id}`);
}

export async function setSubscriptionStatus(id: string, input: AdminUpdateSubscriptionStatusInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem alterar o estado de subscrições");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/subscriptions/${id}/status`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function changeSubscriptionPlan(id: string, input: ChangeSubscriptionPlanInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem mudar o plano de subscrições");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/subscriptions/${id}/change-plan`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function cancelSubscription(id: string, input: CancelSubscriptionInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem cancelar subscrições");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/subscriptions/${id}/cancel`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function pauseSubscription(id: string, input: PauseSubscriptionInput) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem pausar subscrições");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/subscriptions/${id}/pause`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function resumeSubscription(id: string) {
  const session = await requireSystemRole("moderator", "admin");
  if (session.user.systemRole !== "admin") throw new Error("Só administradores podem retomar subscrições");
  const token = await getAuthToken();
  return apiFetchWithAuth(`/api/v1/admin/subscriptions/${id}/resume`, token, { method: "POST" });
}
