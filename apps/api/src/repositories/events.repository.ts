import { db, event, eventRegistration, profile, user } from "@workdeal/db";
import { and, asc, count, desc, eq, gt, inArray, isNull, ne, sql, type SQL } from "drizzle-orm";

type EventStatus = (typeof event.status.enumValues)[number];
type EventRegistrationStatus = (typeof eventRegistration.status.enumValues)[number];

type OrganizerEnrichment = {
  organizerName: string | null;
  organizerSlug: string | null;
  organizerLogo: string | null;
};

const asEventStatus = (s: string): EventStatus => s as EventStatus;
const asRegistrationStatus = (s: string): EventRegistrationStatus => s as EventRegistrationStatus;

async function fetchOrganizerMap(profileIds: string[]): Promise<Map<string, { name: string; slug: string; logoUrl: string | null }>> {
  if (profileIds.length === 0) return new Map();
  const rows = await db
    .select({ id: profile.id, name: profile.name, slug: profile.slug, logoUrl: profile.logoUrl })
    .from(profile)
    .where(and(inArray(profile.id, profileIds), isNull(profile.deletedAt)));
  return new Map(rows.map((r) => [r.id, r]));
}

/** Quem organiza o evento — nome/slug/logo do perfil (para o frontend público e dashboard). */
async function enrichOrganizer<T extends { id: string; organizerProfileId: string }>(rows: T[]): Promise<(T & OrganizerEnrichment)[]> {
  if (rows.length === 0) return [];
  const map = await fetchOrganizerMap(rows.map((r) => r.organizerProfileId));
  return rows.map((r) => {
    const o = map.get(r.organizerProfileId);
    return {
      ...r,
      organizerName: o?.name ?? null,
      organizerSlug: o?.slug ?? null,
      organizerLogo: o?.logoUrl ?? null,
    };
  });
}

/** Mapas de enriquecimento para listas do dashboard (nomes em vez de só IDs). */
type EventMini = { title: string; slug: string; status: EventStatus; startAt: Date };

async function fetchEventMap(eventIds: string[]): Promise<Map<string, EventMini>> {
  if (eventIds.length === 0) return new Map();
  const rows = await db
    .select({ id: event.id, title: event.title, slug: event.slug, status: event.status, startAt: event.startAt })
    .from(event)
    .where(inArray(event.id, eventIds));
  return new Map(rows.map((r) => [r.id, r]));
}

async function fetchEventUserMap(userIds: string[]): Promise<Map<string, { name: string; email: string; image: string | null }>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(inArray(user.id, userIds));
  return new Map(rows.map((r) => [r.id, r]));
}

/** Colunas seguras para SELECT — exclui geom (geography) que o Drizzle não serializa. */
export const eventColumns = {
  id: event.id,
  organizerProfileId: event.organizerProfileId,
  categoryId: event.categoryId,
  title: event.title,
  slug: event.slug,
  description: event.description,
  startAt: event.startAt,
  endAt: event.endAt,
  isOnline: event.isOnline,
  onlineUrl: event.onlineUrl,
  venueName: event.venueName,
  province: event.province,
  district: event.district,
  address: event.address,
  latitude: event.latitude,
  longitude: event.longitude,
  coverImage: event.coverImage,
  capacity: event.capacity,
  status: event.status,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
} as const;

export type EventRow = Omit<typeof event.$inferSelect, "geom">;

function setGeomTxn(tx: { execute: (q: SQL) => Promise<unknown> }, table: typeof event, id: string, latitude: number, longitude: number) {
  return tx.execute(sql`UPDATE ${table} SET geom = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography WHERE ${table.id} = ${id}`);
}

export const eventsRepository = {
  // ── Eventos ──────────────────────────────────────────────────────
  async create(data: typeof event.$inferInsert): Promise<EventRow> {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(event).values(data).returning(eventColumns);
      if (!row) throw new Error("Falha ao criar evento");
      if (row.latitude != null && row.longitude != null) {
        await setGeomTxn(tx, event, row.id, row.latitude, row.longitude);
      }
      return row;
    });
  },

  async findById(id: string): Promise<(EventRow & OrganizerEnrichment) | null> {
    const [row] = await db.select(eventColumns).from(event).where(eq(event.id, id)).limit(1);
    if (!row) return null;
    const [enriched] = await enrichOrganizer([row]);
    return enriched ?? null;
  },

  async findBySlug(slug: string): Promise<(EventRow & OrganizerEnrichment) | null> {
    const [row] = await db.select(eventColumns).from(event).where(eq(event.slug, slug)).limit(1);
    if (!row) return null;
    const [enriched] = await enrichOrganizer([row]);
    return enriched ?? null;
  },

  async slugExists(slug: string): Promise<boolean> {
    const rows = await db.select({ id: event.id }).from(event).where(eq(event.slug, slug)).limit(1);
    return rows.length > 0;
  },

  async list(params: { status?: string; categoryId?: string; province?: string; upcoming?: boolean; organizerSlug?: string; page: number; limit: number }) {
    const conds: SQL[] = [];
    if (params.status) conds.push(eq(event.status, asEventStatus(params.status)));
    if (params.categoryId) conds.push(eq(event.categoryId, params.categoryId));
    if (params.province) conds.push(eq(event.province, params.province));
    if (params.upcoming) conds.push(gt(event.startAt, new Date()));
    let where: SQL | undefined = and(...conds);

    // Filtro por slug do organizador obriga a join com profile
    if (params.organizerSlug) {
      const organizer = await db.select({ id: profile.id }).from(profile).where(eq(profile.slug, params.organizerSlug)).limit(1).then((r) => r[0]);
      if (!organizer) return { items: [], total: 0 };
      const withOrg = and(where as SQL, eq(event.organizerProfileId, organizer.id));
      where = withOrg;
    }

    const [cntRow] = await db.select({ cnt: count() }).from(event).where(where);
    const items = await db.select(eventColumns).from(event).where(where).orderBy(asc(event.startAt)).limit(params.limit).offset((params.page - 1) * params.limit);
    const enriched = await enrichOrganizer(items);
    return { items: enriched, total: cntRow?.cnt ?? 0 };
  },

  async listByOrganizer(organizerProfileIds: string[], status: string | undefined, page: number, limit: number) {
    const where = status
      ? and(inArray(event.organizerProfileId, organizerProfileIds), eq(event.status, asEventStatus(status)))
      : inArray(event.organizerProfileId, organizerProfileIds);
    const [cntRow] = await db.select({ cnt: count() }).from(event).where(where);
    const items = await db.select(eventColumns).from(event).where(where).orderBy(desc(event.startAt)).limit(limit).offset((page - 1) * limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async update(id: string, data: Partial<typeof event.$inferInsert>): Promise<EventRow | null> {
    return db.transaction(async (tx) => {
      const [row] = await tx.update(event).set({ ...data, updatedAt: new Date() }).where(eq(event.id, id)).returning(eventColumns);
      if (row?.latitude != null && row.longitude != null) {
        await setGeomTxn(tx, event, row.id, row.latitude, row.longitude);
      }
      return row ?? null;
    });
  },

  // ── Inscrições ───────────────────────────────────────────────────
  async countRegistrationsForEvents(eventIds: string[]): Promise<Map<string, number>> {
    if (eventIds.length === 0) return new Map();
    const rows = await db
      .select({ eventId: eventRegistration.eventId, cnt: count() })
      .from(eventRegistration)
      .where(and(inArray(eventRegistration.eventId, eventIds), ne(eventRegistration.status, asRegistrationStatus("cancelled"))))
      .groupBy(eventRegistration.eventId);
    return new Map(rows.map((r) => [r.eventId, r.cnt]));
  },

  async countActiveRegistrations(eventId: string): Promise<number> {
    const [row] = await db
      .select({ cnt: count() })
      .from(eventRegistration)
      .where(and(eq(eventRegistration.eventId, eventId), ne(eventRegistration.status, asRegistrationStatus("cancelled"))));
    return row?.cnt ?? 0;
  },

  async findRegistrationById(id: string) {
    const [row] = await db.select().from(eventRegistration).where(eq(eventRegistration.id, id)).limit(1);
    return row ?? null;
  },

  async findRegistrationByEventAndUser(eventId: string, userId: string) {
    const [row] = await db.select().from(eventRegistration).where(and(eq(eventRegistration.eventId, eventId), eq(eventRegistration.userId, userId))).limit(1);
    return row ?? null;
  },

  async findRegistrationsByUserForEvents(eventIds: string[], userId: string): Promise<Set<string>> {
    if (eventIds.length === 0) return new Set();
    const rows = await db.select({ eventId: eventRegistration.eventId }).from(eventRegistration).where(and(inArray(eventRegistration.eventId, eventIds), eq(eventRegistration.userId, userId)));
    return new Set(rows.map((r) => r.eventId));
  },

  async createRegistration(eventId: string, userId: string) {
    const [row] = await db.insert(eventRegistration).values({ eventId, userId, status: "registered" as never }).returning();
    return row ?? null;
  },

  async updateRegistration(id: string, status: string) {
    const [row] = await db.update(eventRegistration).set({ status: asRegistrationStatus(status), updatedAt: new Date() }).where(eq(eventRegistration.id, id)).returning();
    return row ?? null;
  },

  async deleteRegistration(id: string) {
    await db.delete(eventRegistration).where(eq(eventRegistration.id, id));
  },

  async listRegistrations(eventId: string, status: string | undefined, page: number, limit: number) {
    const where = status ? and(eq(eventRegistration.eventId, eventId), eq(eventRegistration.status, asRegistrationStatus(status))) : eq(eventRegistration.eventId, eventId);
    const [cntRow] = await db.select({ cnt: count() }).from(eventRegistration).where(where);
    const items = await db.select().from(eventRegistration).where(where).orderBy(desc(eventRegistration.createdAt)).limit(limit).offset((page - 1) * limit);
    const userMap = await fetchEventUserMap(items.map((i) => i.userId));
    const enriched = items.map((r) => ({
      ...r,
      userName: userMap.get(r.userId)?.name ?? null,
      userEmail: userMap.get(r.userId)?.email ?? null,
      userImage: userMap.get(r.userId)?.image ?? null,
    }));
    return { items: enriched, total: cntRow?.cnt ?? 0 };
  },

  async listRegistrationsByUser(userId: string, status: string | undefined, page: number, limit: number) {
    const where = status ? and(eq(eventRegistration.userId, userId), eq(eventRegistration.status, asRegistrationStatus(status))) : eq(eventRegistration.userId, userId);
    const [cntRow] = await db.select({ cnt: count() }).from(eventRegistration).where(where);
    const items = await db.select().from(eventRegistration).where(where).orderBy(desc(eventRegistration.createdAt)).limit(limit).offset((page - 1) * limit);
    const eventMap = await fetchEventMap(items.map((i) => i.eventId));
    const enriched = items.map((r) => {
      const ev = eventMap.get(r.eventId);
      return {
        ...r,
        eventTitle: ev?.title ?? null,
        eventSlug: ev?.slug ?? null,
        eventStatus: ev?.status ?? null,
        startAt: ev?.startAt ?? null,
      };
    });
    return { items: enriched, total: cntRow?.cnt ?? 0 };
  },
};