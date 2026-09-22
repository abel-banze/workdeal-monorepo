import { auth, getOrgRole, JWT_COOKIE_NAME, parseCookies, verifyJwt } from "@workdeal/auth";
import { listUserOrganizations } from "@workdeal/auth/repository";
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

type ResolvedVisitor = { id: string; name: string; companies: string[] };

/** Resolve identidade do visitante a partir de JWT ou sessão — null se anónimo. */
async function resolveVisitor(opts: { authorization?: string; cookie?: string }): Promise<ResolvedVisitor | null> {
  let id: string | null = null;
  let name: string | null = null;
  const token = opts.authorization?.startsWith("Bearer ") ? opts.authorization.slice("Bearer ".length).trim() : parseCookies(opts.cookie)[JWT_COOKIE_NAME];
  if (token) {
    try {
      const session = await verifyJwt(token);
      const u = session?.user as unknown as { id?: string; name?: string } | undefined;
      if (u?.id) {
        id = u.id;
        name = u.name ?? null;
      }
    } catch {}
  }
  if (!id) {
    try {
      const session = await auth.api.getSession({ headers: new Headers({ Cookie: opts.cookie ?? "" }) });
      const u = session?.user as unknown as { id?: string; name?: string } | undefined;
      if (u?.id) {
        id = u.id;
        name = u.name ?? null;
      }
    } catch {}
  }
  if (!id) return null;
  let companies: string[] = [];
  try {
    companies = (await listUserOrganizations(id)).map((o) => o.name).slice(0, 3);
  } catch {}
  return { id, name: name ?? "Utilizador", companies };
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
  /**
   * Regista um evento de analytics. Quando o visitante está autenticado
   * (JWT ou sessão better-auth nos cookies/headers), a identidade é
   * resolvida no SERVIDOR e carimbada no metadata — o cliente nunca
   * declara quem é. Visitantes anónimos ficam só com o visitorId.
   */
  async track(
    input: { profileId: string; eventType: string; visitorId?: string | null; province?: string | null; district?: string | null; referrer?: string | null; metadata?: Record<string, unknown> | null },
    opts: { authorization?: string; cookie?: string },
  ) {
    const meta: Record<string, unknown> = { ...(input.metadata ?? {}) };
    try {
      const visitor = await resolveVisitor(opts);
      if (visitor) {
        meta.visitorUserId = visitor.id;
        meta.visitorName = visitor.name;
        if (visitor.companies.length > 0) meta.visitorCompanies = visitor.companies;
      }
    } catch {
      // Identidade é best-effort — nunca bloqueia o tracking
    }
    await analyticsRepository.trackEvent({ ...input, metadata: meta });
  },
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

    const visitors = recentVisitors.map((v) => {
      const meta = (v.metadata ?? {}) as { contactName?: string; visitorName?: string; visitorCompanies?: string[] };
      // Identidade estilo LinkedIn: nome do utilizador + empresa(s) de que faz
      // parte; contatos de cotação como fallback; "Anónimo" só sem identidade.
      const name = meta.visitorName ?? meta.contactName ?? "Anónimo";
      const companies = Array.isArray(meta.visitorCompanies) ? meta.visitorCompanies.filter((c): c is string => typeof c === "string") : [];
      return {
        id: v.id,
        name,
        company: companies.length > 0 ? companies.join(", ") : (ACTION_LABELS[v.eventType] ?? v.eventType),
        size: "—",
        origin: v.referrer ?? "Directo",
        province: v.province ?? "—",
        action: ACTION_LABELS[v.eventType] ?? v.eventType,
        time: formatTimeAgo(v.createdAt),
        avatar: name === "Anónimo" ? "A" : name.replace(/^@/, "").slice(0, 2).toUpperCase(),
      };
    });

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