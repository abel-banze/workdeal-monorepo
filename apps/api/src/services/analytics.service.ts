import { getOrgRole } from "@workdeal/auth";
import type { AuthUser } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { analyticsRepository } from "../repositories/analytics.repository.js";
import { db, profile } from "@workdeal/db";
import { eq } from "drizzle-orm";
import { featuresService } from "./features.service.js";

const ACTION_LABELS: Record<string, string> = {
  page_view: "viu perfil",
  whatsapp_click: "clicou WhatsApp",
  phone_click: "clicou telefone",
  email_click: "clicou email",
  website_click: "clicou website",
  save: "guardou",
  quote_request: "pediu contacto",
  search_impression: "apareceu na pesquisa",
};

async function assertDashboardAccess(user: AuthUser, profileId: string) {
  const [row] = await db.select({ userId: profile.userId, organizationId: profile.organizationId }).from(profile).where(eq(profile.id, profileId)).limit(1);
  if (!row) throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
  if (row.userId && row.userId === user.id) return row;
  if (row.organizationId) {
    const role = await getOrgRole(user.id, row.organizationId);
    if (role) return row;
  }
  if (user.systemRole === "admin" || user.systemRole === "moderator") return row;
  throw new AppError(403, "FORBIDDEN", "Sem permissão para ver analytics deste perfil");
}

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}

export const analyticsService = {
  async getDashboard(user: AuthUser, profileId: string) {
    const row = await assertDashboardAccess(user, profileId);
    if (row.organizationId) {
      await featuresService.requireFeature({ userId: user.id, organizationId: row.organizationId }, "analytics_visits_contacts");
    }

    const [days, stats, origins, provinces, actions, contacts, quotesCount, recentVisitors] = await Promise.all([
      analyticsRepository.getDailyVisits(profileId, 90),
      analyticsRepository.getTotalStats(profileId, 30),
      analyticsRepository.getOrigins(profileId, 30),
      analyticsRepository.getProvinceDistribution(profileId, 30),
      analyticsRepository.getVisitorActions(profileId, 30),
      analyticsRepository.getContactClicks(profileId, 30),
      analyticsRepository.getQuotesCount(profileId, 30),
      analyticsRepository.getRecentVisitors(profileId, 20),
    ]);

    const sizes = [
      { size: "Micro", value: 0, fill: "#0F1A2E" },
      { size: "Pequena", value: 0, fill: "#0B5E56" },
      { size: "Média", value: 0, fill: "#4A6B7C" },
      { size: "Grande", value: 0, fill: "#FF3B1F" },
    ];

    const visitors = recentVisitors.map((v) => ({
      id: v.id,
      name: (v.metadata as { contactName?: string })?.contactName ?? "Anónimo",
      company: ACTION_LABELS[v.eventType] ?? v.eventType,
      size: "—",
      origin: v.referrer ?? "Directo",
      province: v.province ?? "—",
      action: ACTION_LABELS[v.eventType] ?? v.eventType,
      time: formatTimeAgo(v.createdAt),
      avatar: "A",
    }));

    return {
      days,
      origins,
      sizes,
      provinces,
      visitors,
      total30: stats.total30,
      unicos30: stats.unicos30,
      growth: stats.growth,
      actions,
      contacts,
      quotesCount,
      realQuotesCount: quotesCount,
    };
  },
};