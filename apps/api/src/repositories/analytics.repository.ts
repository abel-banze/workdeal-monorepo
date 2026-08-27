import { db, analyticsEvent, profile } from "@workdeal/db";
import { eq, and, sql, gte, count, countDistinct, desc } from "drizzle-orm";

type DayPoint = { date: string; label: string; visitas: number; unicos: number };
type OriginPoint = { origin: string; value: number; fill: string };
type ProvincePoint = { province: string; value: number };

class AnalyticsRepository {
  async trackEvent(data: {
    profileId: string;
    eventType: string;
    visitorId?: string | null;
    province?: string | null;
    district?: string | null;
    referrer?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const [row] = await db
      .insert(analyticsEvent)
      .values({
        id: crypto.randomUUID(),
        profileId: data.profileId,
        eventType: data.eventType as never,
        visitorId: data.visitorId ?? null,
        province: data.province ?? null,
        district: data.district ?? null,
        referrer: data.referrer ?? null,
        metadata: data.metadata ?? null,
      })
      .returning({ id: analyticsEvent.id });
    return row;
  }

  async getDailyVisits(profileId: string, days: number = 90): Promise<DayPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await db
      .select({
        date: sql<string>`TO_CHAR(${analyticsEvent.createdAt}::date, 'YYYY-MM-DD')`,
        visitas: count(analyticsEvent.id),
        unicos: countDistinct(analyticsEvent.visitorId),
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.profileId, profileId),
          eq(analyticsEvent.eventType, "page_view"),
          gte(analyticsEvent.createdAt, since),
        ),
      )
      .groupBy(sql`${analyticsEvent.createdAt}::date`)
      .orderBy(sql`${analyticsEvent.createdAt}::date`);

    // Fill in missing days with zeros
    const map = new Map(rows.map((r) => [r.date, { visitas: r.visitas, unicos: r.unicos }]));
    const result: DayPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      const data = map.get(dateStr);
      result.push({
        date: dateStr,
        label,
        visitas: data?.visitas ?? 0,
        unicos: data?.unicos ?? 0,
      });
    }
    return result;
  }

  async getOrigins(profileId: string, days: number = 30): Promise<OriginPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await db
      .select({
        origin: sql<string>`
          CASE
            WHEN ${analyticsEvent.referrer} LIKE '%google%' OR ${analyticsEvent.referrer} LIKE '%bing%' THEN 'Pesquisa'
            WHEN ${analyticsEvent.eventType} = 'search_impression' THEN 'Pesquisa'
            WHEN ${analyticsEvent.referrer} IS NULL OR ${analyticsEvent.referrer} = '' THEN 'Directo'
            WHEN ${analyticsEvent.referrer} LIKE '%whatsapp%' OR ${analyticsEvent.referrer} LIKE '%facebook%' OR ${analyticsEvent.referrer} LIKE '%instagram%' THEN 'Partilha'
            ELSE 'Directo'
          END
        `,
        value: count(analyticsEvent.id),
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.profileId, profileId),
          gte(analyticsEvent.createdAt, since),
        ),
      )
      .groupBy(sql`
        CASE
          WHEN ${analyticsEvent.referrer} LIKE '%google%' OR ${analyticsEvent.referrer} LIKE '%bing%' THEN 'Pesquisa'
          WHEN ${analyticsEvent.eventType} = 'search_impression' THEN 'Pesquisa'
          WHEN ${analyticsEvent.referrer} IS NULL OR ${analyticsEvent.referrer} = '' THEN 'Directo'
          WHEN ${analyticsEvent.referrer} LIKE '%whatsapp%' OR ${analyticsEvent.referrer} LIKE '%facebook%' OR ${analyticsEvent.referrer} LIKE '%instagram%' THEN 'Partilha'
          ELSE 'Directo'
        END
      `)
      .orderBy(desc(count(analyticsEvent.id)));

    const total = rows.reduce((a, b) => a + b.value, 0);
    const ink = "#0F1A2E";
    const forest = "#0B5E56";
    const signal = "#FF3B1F";
    const gray = "#7A8A9E";
    const fillMap: Record<string, string> = { Pesquisa: forest, Directo: ink, Partilha: signal, "Perto de mim": gray };

    return rows.map((r) => ({
      origin: r.origin,
      value: total > 0 ? Math.round((r.value / total) * 100) : 0,
      fill: fillMap[r.origin] ?? gray,
    }));
  }

  async getProvinceDistribution(profileId: string, days: number = 30): Promise<ProvincePoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await db
      .select({
        province: analyticsEvent.province,
        value: count(analyticsEvent.id),
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.profileId, profileId),
          gte(analyticsEvent.createdAt, since),
          sql`${analyticsEvent.province} IS NOT NULL`,
        ),
      )
      .groupBy(analyticsEvent.province)
      .orderBy(desc(count(analyticsEvent.id)))
      .limit(7);

    return rows.map((r) => ({
      province: r.province ?? "Desconhecida",
      value: r.value,
    }));
  }

  async getVisitorActions(profileId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await db
      .select({
        eventType: analyticsEvent.eventType,
        count: count(analyticsEvent.id),
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.profileId, profileId),
          gte(analyticsEvent.createdAt, since),
        ),
      )
      .groupBy(analyticsEvent.eventType);

    const actionMap: Record<string, number> = {};
    for (const r of rows) {
      actionMap[r.eventType] = r.count;
    }
    return actionMap;
  }

  async getRecentVisitors(profileId: string, limit: number = 20) {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const rows = await db
      .select({
        id: analyticsEvent.id,
        eventType: analyticsEvent.eventType,
        province: analyticsEvent.province,
        referrer: analyticsEvent.referrer,
        metadata: analyticsEvent.metadata,
        createdAt: analyticsEvent.createdAt,
        visitorId: analyticsEvent.visitorId,
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.profileId, profileId),
          gte(analyticsEvent.createdAt, since),
        ),
      )
      .orderBy(desc(analyticsEvent.createdAt))
      .limit(limit);

    return rows;
  }

  async getTotalStats(profileId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [stats] = await db
      .select({
        totalVisits: count(analyticsEvent.id),
        uniqueVisitors: countDistinct(analyticsEvent.visitorId),
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.profileId, profileId),
          eq(analyticsEvent.eventType, "page_view"),
          gte(analyticsEvent.createdAt, since),
        ),
      );

    const prevSince = new Date();
    prevSince.setDate(prevSince.getDate() - days * 2);
    const prevUntil = new Date();
    prevUntil.setDate(prevUntil.getDate() - days);

    const [prevStats] = await db
      .select({
        totalVisits: count(analyticsEvent.id),
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.profileId, profileId),
          eq(analyticsEvent.eventType, "page_view"),
          gte(analyticsEvent.createdAt, prevSince),
          sql`${analyticsEvent.createdAt} < ${prevUntil}`,
        ),
      );

    const current = stats?.totalVisits ?? 0;
    const previous = prevStats?.totalVisits ?? 0;
    const growth = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;

    return {
      total30: current,
      unicos30: stats?.uniqueVisitors ?? 0,
      growth,
    };
  }

  async getQuotesCount(profileId: string, days: number = 30): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [stats] = await db
      .select({ count: count(analyticsEvent.id) })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.profileId, profileId),
          eq(analyticsEvent.eventType, "quote_request"),
          gte(analyticsEvent.createdAt, since),
        ),
      );

    return stats?.count ?? 0;
  }

  async getContactClicks(profileId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await db
      .select({
        eventType: analyticsEvent.eventType,
        count: count(analyticsEvent.id),
      })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.profileId, profileId),
          sql`${analyticsEvent.eventType} IN ('whatsapp_click', 'phone_click', 'email_click', 'website_click')`,
          gte(analyticsEvent.createdAt, since),
        ),
      )
      .groupBy(analyticsEvent.eventType);

    const result: Record<string, number> = { whatsapp: 0, phone: 0, email: 0, website: 0 };
    for (const r of rows) {
      const key = r.eventType.replace("_click", "");
      result[key] = r.count;
    }
    return result;
  }
}

export const analyticsRepository = new AnalyticsRepository();
