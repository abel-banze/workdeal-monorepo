import { db, member, onboardingEvent, organization, user } from "@workdeal/db";
import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";

export const onboardingAnalyticsRepository = {
  async track(data: { userId: string | null; visitorId: string | null; step: number | null; action: string; metadata: Record<string, unknown> | null }) {
    const [row] = await db
      .insert(onboardingEvent)
      .values({ userId: data.userId, visitorId: data.visitorId, step: data.step, action: data.action, metadata: data.metadata })
      .returning({ id: onboardingEvent.id });
    return row ?? null;
  },

  // Lista de eventos recentes com identidade: utilizador (nome/email) e
  // empresas de que é membro — para investigar "quem, de onde, com o quê".
  async listEvents(params: { action?: string; step?: number; days: number; page: number; limit: number }) {
    const since = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);
    const conds = [gte(onboardingEvent.createdAt, since)];
    if (params.action) conds.push(eq(onboardingEvent.action, params.action));
    if (params.step !== undefined) conds.push(eq(onboardingEvent.step, params.step));
    const where = and(...conds);

    const [cntRow] = await db.select({ cnt: count() }).from(onboardingEvent).where(where);
    const items = await db
      .select({
        id: onboardingEvent.id,
        userId: onboardingEvent.userId,
        visitorId: onboardingEvent.visitorId,
        step: onboardingEvent.step,
        action: onboardingEvent.action,
        metadata: onboardingEvent.metadata,
        createdAt: onboardingEvent.createdAt,
      })
      .from(onboardingEvent)
      .where(where)
      .orderBy(desc(onboardingEvent.createdAt))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);

    const userIds = [...new Set(items.map((i) => i.userId).filter((v): v is string => Boolean(v)))];
    const userMap = new Map<string, { name: string; email: string }>();
    const companiesMap = new Map<string, string[]>();
    if (userIds.length > 0) {
      const urows = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(inArray(user.id, userIds));
      for (const u of urows) userMap.set(u.id, { name: u.name, email: u.email });
      const mrows = await db
        .select({ userId: member.userId, orgName: organization.name })
        .from(member)
        .innerJoin(organization, eq(organization.id, member.organizationId))
        .where(inArray(member.userId, userIds));
      for (const m of mrows) {
        const list = companiesMap.get(m.userId) ?? [];
        if (!list.includes(m.orgName)) list.push(m.orgName);
        companiesMap.set(m.userId, list);
      }
    }

    return {
      items: items.map((i) => ({
        ...i,
        userName: i.userId ? (userMap.get(i.userId)?.name ?? null) : null,
        userEmail: i.userId ? (userMap.get(i.userId)?.email ?? null) : null,
        companies: i.userId ? (companiesMap.get(i.userId) ?? []) : [],
      })),
      total: cntRow?.cnt ?? 0,
    };
  },

  async funnel(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const inWindow = and(gte(onboardingEvent.createdAt, since), isNotNull(onboardingEvent.userId));

    // Alcance por passo (utilizadores distintos que viram ou navegaram para o passo)
    const reachRows = await db
      .select({ step: onboardingEvent.step, users: countDistinct(onboardingEvent.userId) })
      .from(onboardingEvent)
      .where(and(inWindow, inArray(onboardingEvent.action, ["step_view", "step_next", "step_back"])))
      .groupBy(onboardingEvent.step);

    // Conclusões (utilizadores distintos com company_created)
    const [completedRow] = await db
      .select({ users: countDistinct(onboardingEvent.userId) })
      .from(onboardingEvent)
      .where(and(inWindow, eq(onboardingEvent.action, "company_created")));

    // Último passo visto por utilizador (para abandono por passo)
    const lastStepRows = (
      await db.execute<{ step: number | null; users: string }>(sql`
      SELECT t.step AS step, COUNT(*)::text AS users FROM (
        SELECT DISTINCT ON (${onboardingEvent.userId}) ${onboardingEvent.userId}, ${onboardingEvent.step} AS step
        FROM ${onboardingEvent}
        WHERE ${onboardingEvent.createdAt} >= ${since} AND ${onboardingEvent.userId} IS NOT NULL
          AND ${onboardingEvent.action} IN ('step_view', 'step_next')
        ORDER BY ${onboardingEvent.userId}, ${onboardingEvent.createdAt} DESC
      ) t GROUP BY t.step ORDER BY t.step
    `)
    ).rows;

    // Erros de validação por campo (metadata.fields = string[])
    const fieldRows = (
      await db.execute<{ field: string; count: string }>(sql`
      SELECT f AS field, COUNT(*)::text AS count
      FROM ${onboardingEvent}, LATERAL jsonb_array_elements_text(${onboardingEvent.metadata} -> 'fields') AS f
      WHERE ${onboardingEvent.createdAt} >= ${since} AND ${onboardingEvent.action} = 'validation_failed'
      GROUP BY f ORDER BY COUNT(*) DESC LIMIT 20
    `)
    ).rows;

    // OTP por canal e resultado
    const otpRows = (
      await db.execute<{ channel: string | null; action: string; count: string }>(sql`
      SELECT ${onboardingEvent.metadata} ->> 'channel' AS channel, ${onboardingEvent.action} AS action, COUNT(*)::text AS count
      FROM ${onboardingEvent}
      WHERE ${onboardingEvent.createdAt} >= ${since} AND ${onboardingEvent.action} IN ('otp_requested', 'otp_verified', 'otp_failed')
      GROUP BY channel, action
    `)
    ).rows;

    // Falhas de criação por motivo (metadata.error)
    const failureRows = (
      await db.execute<{ error: string | null; count: string }>(sql`
      SELECT LEFT(${onboardingEvent.metadata} ->> 'error', 160) AS error, COUNT(*)::text AS count
      FROM ${onboardingEvent}
      WHERE ${onboardingEvent.createdAt} >= ${since} AND ${onboardingEvent.action} = 'company_create_failed'
      GROUP BY error ORDER BY COUNT(*) DESC LIMIT 10
    `)
    ).rows;

    // Tempo até concluir por utilizador (primeiro step_view 0 → company_created)
    const durationRows = (
      await db.execute<{ seconds: string }>(sql`
      WITH first_seen AS (
        SELECT ${onboardingEvent.userId} AS uid, MIN(${onboardingEvent.createdAt}) AS t0
        FROM ${onboardingEvent}
        WHERE ${onboardingEvent.createdAt} >= ${since} AND ${onboardingEvent.action} = 'step_view' AND ${onboardingEvent.step} = 0
        GROUP BY ${onboardingEvent.userId}
      ), done AS (
        SELECT ${onboardingEvent.userId} AS uid, MIN(${onboardingEvent.createdAt}) AS t1
        FROM ${onboardingEvent}
        WHERE ${onboardingEvent.createdAt} >= ${since} AND ${onboardingEvent.action} = 'company_created'
        GROUP BY ${onboardingEvent.userId}
      )
      SELECT EXTRACT(EPOCH FROM (done.t1 - first_seen.t0))::text AS seconds
      FROM first_seen JOIN done ON done.uid = first_seen.uid
    `)
    ).rows;

    const reach: Record<number, number> = {};
    for (const r of reachRows) {
      if (r.step != null) reach[r.step] = Number(r.users);
    }
    const completed = Number(completedRow?.users ?? 0);
    const started = reach[0] ?? 0;

    const durations = durationRows.map((r) => Number(r.seconds)).filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
    const medianSecondsToComplete = durations.length > 0 ? durations[Math.floor(durations.length / 2)]! : null;

    return {
      started,
      reachedStep: { 0: reach[0] ?? 0, 1: reach[1] ?? 0, 2: reach[2] ?? 0 },
      completed,
      abandoned: Math.max(0, started - completed),
      abandonByLastStep: lastStepRows.map((r) => ({ step: r.step, users: Number(r.users) })),
      validationErrors: fieldRows.map((r) => ({ field: r.field, count: Number(r.count) })),
      otp: otpRows.map((r) => ({ channel: r.channel, action: r.action, count: Number(r.count) })),
      createFailures: failureRows.map((r) => ({ error: r.error, count: Number(r.count) })),
      medianSecondsToComplete,
    };
  },
};
