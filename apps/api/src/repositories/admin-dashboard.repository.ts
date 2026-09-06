import {
  db,
  user,
  organization,
  profile,
  task,
  event,
  verificationRequest,
  report,
  quoteRequest,
} from "@workdeal/db";
import { and, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

export interface Counts {
  users: number;
  usersWeek: number;
  profilesActive: number;
  profilesCompany: number;
  profilesIndividual: number;
  profilesDraft: number;
  tasksOpen: number;
  tasksWeek: number;
}

export interface Queues {
  verificationsPending: number;
  reportsPending: number;
  tasksInReview: number;
  preRegistrations: number;
  eventsDraft: number;
}

export interface NorthStar {
  conexoesSemana: number;
  conexoesSemanaAnterior: number;
}

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  label: string; // DD/MM
  usuarios: number;
  preRegistros: number;
  conversoes: number;
  perfis: number;
  tarefas: number;
  contactos: number;
}

export interface RecentItem {
  id: string;
  kind: "perfil" | "tarefa" | "contacto";
  title: string | null;
  href: string | null;
  at: Date;
}

class AdminDashboardRepository {
  private async weekAgo(days = 7): Promise<Date> {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  async getCounts(): Promise<Counts> {
    const weekAgo = await this.weekAgo();
    const [
      users,
      usersWeek,
      profilesActive,
      profilesCompany,
      profilesIndividual,
      profilesDraft,
      tasksOpen,
      tasksWeek,
    ] = await Promise.all([
      db.select({ value: count(user.id) }).from(user).where(isNull(user.deletedAt)),
      db.select({ value: count(user.id) }).from(user).where(and(isNull(user.deletedAt), gte(user.createdAt, weekAgo))),
      db.select({ value: count(profile.id) }).from(profile).where(and(eq(profile.status, "active"), isNull(profile.deletedAt))),
      db.select({ value: count(profile.id) }).from(profile).where(and(eq(profile.status, "active"), eq(profile.type, "company"), isNull(profile.deletedAt))),
      db.select({ value: count(profile.id) }).from(profile).where(and(eq(profile.status, "active"), eq(profile.type, "individual"), isNull(profile.deletedAt))),
      db.select({ value: count(profile.id) }).from(profile).where(and(eq(profile.status, "draft"), isNull(profile.deletedAt))),
      db.select({ value: count(task.id) }).from(task).where(eq(task.status, "open")),
      db.select({ value: count(task.id) }).from(task).where(gte(task.createdAt, weekAgo)),
    ]);

    return {
      users: users[0]?.value ?? 0,
      usersWeek: usersWeek[0]?.value ?? 0,
      profilesActive: profilesActive[0]?.value ?? 0,
      profilesCompany: profilesCompany[0]?.value ?? 0,
      profilesIndividual: profilesIndividual[0]?.value ?? 0,
      profilesDraft: profilesDraft[0]?.value ?? 0,
      tasksOpen: tasksOpen[0]?.value ?? 0,
      tasksWeek: tasksWeek[0]?.value ?? 0,
    };
  }

  async getQueues(): Promise<Queues> {
    const [verificationsPending, reportsPending, tasksInReview, preRegistrations, eventsDraft] = await Promise.all([
      db.select({ value: count(verificationRequest.id) }).from(verificationRequest).where(eq(verificationRequest.status, "pending")),
      db.select({ value: count(report.id) }).from(report).where(eq(report.status, "pending")),
      db.select({ value: count(task.id) }).from(task).where(eq(task.status, "in_review")),
      db.select({ value: count(organization.id) }).from(organization).where(eq(organization.verificationStatus, "pre_registered")),
      db.select({ value: count(event.id) }).from(event).where(eq(event.status, "draft")),
    ]);

    return {
      verificationsPending: verificationsPending[0]?.value ?? 0,
      reportsPending: reportsPending[0]?.value ?? 0,
      tasksInReview: tasksInReview[0]?.value ?? 0,
      preRegistrations: preRegistrations[0]?.value ?? 0,
      eventsDraft: eventsDraft[0]?.value ?? 0,
    };
  }

  async getNorthStar(): Promise<NorthStar> {
    const seven = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteen = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [conexoesSemana, conexoesSemanaAnterior] = await Promise.all([
      db.select({ value: count(quoteRequest.id) }).from(quoteRequest).where(gte(quoteRequest.createdAt, seven)),
      db
        .select({ value: count(quoteRequest.id) })
        .from(quoteRequest)
        .where(and(gte(quoteRequest.createdAt, fourteen), lt(quoteRequest.createdAt, seven))),
    ]);

    return {
      conexoesSemana: conexoesSemana[0]?.value ?? 0,
      conexoesSemanaAnterior: conexoesSemanaAnterior[0]?.value ?? 0,
    };
  }

  async getSeries(days = 30): Promise<SeriesPoint[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const dayExpr = sql<string>`TO_CHAR(${quoteRequest.createdAt}::date, 'YYYY-MM-DD')`;

    const [usuarios, preRegistros, conversoes, perfis, tarefas, contactos] = await Promise.all([
      db
        .select({ date: sql<string>`TO_CHAR(${user.createdAt}::date, 'YYYY-MM-DD')`, value: count(user.id) })
        .from(user)
        .where(and(isNull(user.deletedAt), gte(user.createdAt, since)))
        .groupBy(sql`${user.createdAt}::date`),
      db
        .select({ date: sql<string>`TO_CHAR(${organization.preRegisteredAt}::date, 'YYYY-MM-DD')`, value: count(organization.id) })
        .from(organization)
        .where(and(eq(organization.verificationStatus, "pre_registered"), gte(organization.preRegisteredAt, since)))
        .groupBy(sql`${organization.preRegisteredAt}::date`),
      db
        .select({ date: sql<string>`TO_CHAR(${organization.updatedAt}::date, 'YYYY-MM-DD')`, value: count(organization.id) })
        .from(organization)
        .where(
          and(
            sql`${organization.preRegisteredAt} IS NOT NULL`,
            sql`${organization.verificationStatus} <> 'pre_registered'`,
            gte(organization.updatedAt, since),
          ),
        )
        .groupBy(sql`${organization.updatedAt}::date`),
      db
        .select({ date: sql<string>`TO_CHAR(${profile.createdAt}::date, 'YYYY-MM-DD')`, value: count(profile.id) })
        .from(profile)
        .where(and(isNull(profile.deletedAt), gte(profile.createdAt, since)))
        .groupBy(sql`${profile.createdAt}::date`),
      db
        .select({ date: sql<string>`TO_CHAR(${task.createdAt}::date, 'YYYY-MM-DD')`, value: count(task.id) })
        .from(task)
        .where(gte(task.createdAt, since))
        .groupBy(sql`${task.createdAt}::date`),
      db
        .select({ date: dayExpr, value: count(quoteRequest.id) })
        .from(quoteRequest)
        .where(gte(quoteRequest.createdAt, since))
        .groupBy(sql`${quoteRequest.createdAt}::date`),
    ]);

    const usuariosMap = new Map(usuarios.map((r) => [r.date, r.value]));
    const preRegistrosMap = new Map(preRegistros.map((r) => [r.date, r.value]));
    const conversoesMap = new Map(conversoes.map((r) => [r.date, r.value]));
    const perfisMap = new Map(perfis.map((r) => [r.date, r.value]));
    const tarefasMap = new Map(tarefas.map((r) => [r.date, r.value]));
    const contactosMap = new Map(contactos.map((r) => [r.date, r.value]));

    const result: SeriesPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      result.push({
        date: dateStr,
        label,
        usuarios: usuariosMap.get(dateStr) ?? 0,
        preRegistros: preRegistrosMap.get(dateStr) ?? 0,
        conversoes: conversoesMap.get(dateStr) ?? 0,
        perfis: perfisMap.get(dateStr) ?? 0,
        tarefas: tarefasMap.get(dateStr) ?? 0,
        contactos: contactosMap.get(dateStr) ?? 0,
      });
    }
    return result;
  }

  async getRecent(limit = 6): Promise<RecentItem[]> {
    const [perfis, tarefas, contactos] = await Promise.all([
      db
        .select({ id: profile.id, title: profile.name, at: profile.createdAt })
        .from(profile)
        .where(isNull(profile.deletedAt))
        .orderBy(desc(profile.createdAt))
        .limit(limit),
      db.select({ id: task.id, title: task.title, at: task.createdAt }).from(task).orderBy(desc(task.createdAt)).limit(limit),
      db.select({ id: quoteRequest.id, title: quoteRequest.contactName, at: quoteRequest.createdAt }).from(quoteRequest).orderBy(desc(quoteRequest.createdAt)).limit(limit),
    ]);

    const items: RecentItem[] = [
      ...perfis.map((p) => ({ id: p.id, kind: "perfil" as const, title: p.title, href: "/dashboard/profiles", at: p.at })),
      ...tarefas.map((t) => ({ id: t.id, kind: "tarefa" as const, title: t.title, href: "/dashboard/tasks", at: t.at })),
      ...contactos.map((q) => ({ id: q.id, kind: "contacto" as const, title: q.title, href: null, at: q.at })),
    ];

    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
  }

  async getAvgVerificationHours(): Promise<number | null> {
    const [row] = await db.select({
      avgHours: sql<number>`avg(EXTRACT(EPOCH FROM (${verificationRequest.reviewedAt} - ${verificationRequest.createdAt}))/3600)::float`,
    }).from(verificationRequest).where(sql`${verificationRequest.reviewedAt} IS NOT NULL`);
    return row?.avgHours ?? null;
  }
}

export const adminDashboardRepository = new AdminDashboardRepository();