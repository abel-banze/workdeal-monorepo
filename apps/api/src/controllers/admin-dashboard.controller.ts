import { ok } from "../lib/api-response.js";
import { AppError } from "../lib/errors.js";
import { getDashboardStats, getMetricsSnapshot } from "../services/admin-dashboard.service.js";

class AdminDashboardController {
  async getStats() {
    try {
      const data = await getDashboardStats();
      return { body: ok(data), status: 200 as const };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(500, "DASHBOARD_FAILED", "Não foi possível carregar o resumo do painel", err instanceof Error ? err.message : undefined);
    }
  }

  async getMetrics() {
    try {
      const data = await getMetricsSnapshot();
      return { body: ok(data), status: 200 as const };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(500, "METRICS_FAILED", "Não foi possível carregar as métricas", err instanceof Error ? err.message : undefined);
    }
  }
}

export const adminDashboardController = new AdminDashboardController();