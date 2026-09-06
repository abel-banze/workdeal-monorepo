import "server-only";
import { dashboardStatsSchema, type DashboardStats } from "@workdeal/shared";
import { apiFetch } from "@/lib/api";
import { requireSystemRole } from "@/lib/auth";

/**
 * Snapshot do dashboard (SSR-first). Corre no servidor: valida a sessão de
 * team via requireSystemRole e busca o resumo agregado à API Hono.
 * A resposta é validada com o schema partilhado — se a API devolver algo
 * fora do contrato, falhamos cedo com mensagem clara em vez de renderizar zeros.
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  await requireSystemRole("moderator", "admin");
  const res = await apiFetch<unknown>("/api/v1/admin/dashboard");
  const parsed = dashboardStatsSchema.safeParse(res.data);
  if (!parsed.success) {
    console.error("[dashboard] resposta da API inválida:", parsed.error.flatten());
    throw new Error("Resumo do painel indisponível de momento. Tenta novamente em instantes.");
  }
  return parsed.data;
}