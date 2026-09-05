"use server";

import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import type { AdminUserListQuery, AdminOrgListQuery, PreRegisterCompanyInput, PreRegisterUpdateInput, CategoryListQuery, CategoryCreateInput, CategoryUpdateInput } from "@workdeal/shared";
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
