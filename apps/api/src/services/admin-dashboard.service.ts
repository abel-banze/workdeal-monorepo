import type { DashboardStats } from "@workdeal/shared";
import { adminDashboardRepository } from "../repositories/admin-dashboard.repository.js";

// Regras de negócio puras para o resumo do painel admin.
// Não toca na BD directamente — delega no repository e deriva valores (crescimento).

export async function getDashboardStats(): Promise<DashboardStats> {
  const [counts, queues, northStar, series, recent] = await Promise.all([
    adminDashboardRepository.getCounts(),
    adminDashboardRepository.getQueues(),
    adminDashboardRepository.getNorthStar(),
    adminDashboardRepository.getSeries(30),
    adminDashboardRepository.getRecent(6),
  ]);

  const crescimento =
    northStar.conexoesSemanaAnterior > 0
      ? Math.round(((northStar.conexoesSemana - northStar.conexoesSemanaAnterior) / northStar.conexoesSemanaAnterior) * 100)
      : null;

  return {
    generatedAt: new Date().toISOString(),
    counts,
    queues,
    northStar: { conexoesSemana: northStar.conexoesSemana, crescimento },
    series: series.map((s) => ({ label: s.label, perfis: s.perfis, tarefas: s.tarefas, contactos: s.contactos })),
    recent: recent.map((r) => ({ id: r.id, kind: r.kind, title: r.title, href: r.href, at: r.at.toISOString() })),
  };
}

export async function getMetricsSnapshot() {
  const [queues, avgVerificationHours] = await Promise.all([
    adminDashboardRepository.getQueues(),
    adminDashboardRepository.getAvgVerificationHours(),
  ]);
  return {
    pendingVerifications: queues.verificationsPending,
    pendingReports: queues.reportsPending,
    avgVerificationHours,
  };
}