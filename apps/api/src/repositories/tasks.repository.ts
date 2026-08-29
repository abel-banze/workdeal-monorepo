import { db, task, taskProposal, taskBid, profile, member, user } from "@workdeal/db";
import { and, count, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { boundingBox } from "@workdeal/shared/lib/geo";

type TaskStatus = (typeof task.status.enumValues)[number];
type ProposalStatus = (typeof taskProposal.status.enumValues)[number];
type BidStatus = (typeof taskBid.status.enumValues)[number];

type RequesterEnrichment = {
  requesterProfileName: string | null;
  requesterProfileSlug: string | null;
  requesterProfileLogo: string | null;
};

const asTaskStatus = (s: string): TaskStatus => s as TaskStatus;
const asProposalStatus = (s: string): ProposalStatus => s as ProposalStatus;
const asBidStatus = (s: string): BidStatus => s as BidStatus;

/** Mapas de enriquecimento para listas do dashboard (nome/título em vez de só IDs). */
async function fetchProfileMap(profileIds: string[]): Promise<Map<string, { name: string; slug: string; logoUrl: string | null }>> {
  if (profileIds.length === 0) return new Map();
  const rows = await db
    .select({ id: profile.id, name: profile.name, slug: profile.slug, logoUrl: profile.logoUrl })
    .from(profile)
    .where(inArray(profile.id, profileIds));
  return new Map(rows.map((r) => [r.id, r]));
}

type TaskMini = { title: string; status: TaskStatus; requesterUserId: string };

async function fetchTaskMap(taskIds: string[]): Promise<Map<string, TaskMini>> {
  if (taskIds.length === 0) return new Map();
  const rows = await db
    .select({ id: task.id, title: task.title, status: task.status, requesterUserId: task.requesterUserId })
    .from(task)
    .where(inArray(task.id, taskIds));
  return new Map(rows.map((r) => [r.id, r]));
}

async function fetchUserMap(userIds: string[]): Promise<Map<string, { name: string; email: string; image: string | null }>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(inArray(user.id, userIds));
  return new Map(rows.map((r) => [r.id, r]));
}

type RequesterRow = { id: string; requesterUserId: string; requesterOrganizationId: string | null };

/** Quem pediu a tarefa: perfil da organização (se existir) → perfil pessoal → nome do utilizador. */
async function enrichRequesterProfiles(rows: RequesterRow[]): Promise<Map<string, RequesterEnrichment>> {
  const empty: RequesterEnrichment = { requesterProfileName: null, requesterProfileSlug: null, requesterProfileLogo: null };
  if (rows.length === 0) return new Map();
  const orgIds = [...new Set(rows.map((r) => r.requesterOrganizationId).filter((v): v is string => Boolean(v)))];
  const userIds = [...new Set(rows.map((r) => r.requesterUserId))];

  const byOrg = new Map<string, { name: string; slug: string; logoUrl: string | null }>();
  const byUser = new Map<string, { name: string; slug: string; logoUrl: string | null }>();
  const profileConds: SQL[] = [];
  if (orgIds.length) profileConds.push(inArray(profile.organizationId, orgIds));
  if (userIds.length) profileConds.push(inArray(profile.userId, userIds));
  if (profileConds.length) {
    const rowsP = await db
      .select({ id: profile.id, userId: profile.userId, organizationId: profile.organizationId, name: profile.name, slug: profile.slug, logoUrl: profile.logoUrl })
      .from(profile)
      .where(and(or(...profileConds), isNull(profile.deletedAt)));
    for (const r of rowsP) {
      if (r.organizationId && !byOrg.has(r.organizationId)) byOrg.set(r.organizationId, r);
      if (r.userId && !byUser.has(r.userId)) byUser.set(r.userId, r);
    }
  }

  const userNames = new Map<string, string>();
  if (userIds.length) {
    const uRows = await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds));
    for (const r of uRows) userNames.set(r.id, r.name);
  }

  const result = new Map<string, RequesterEnrichment>();
  for (const t of rows) {
    const orgProfile = t.requesterOrganizationId ? byOrg.get(t.requesterOrganizationId) : undefined;
    const personal = byUser.get(t.requesterUserId);
    const chosen = orgProfile ?? personal;
    result.set(t.id, {
      requesterProfileName: chosen?.name ?? userNames.get(t.requesterUserId) ?? null,
      requesterProfileSlug: chosen?.slug ?? null,
      requesterProfileLogo: chosen?.logoUrl ?? null,
    });
  }
  return result;
}

/** Colunas seguras para SELECT — exclui geom (geography) que o Drizzle não serializa. */
export const taskColumns = {
  id: task.id,
  requesterUserId: task.requesterUserId,
  requesterOrganizationId: task.requesterOrganizationId,
  categoryId: task.categoryId,
  title: task.title,
  description: task.description,
  priceMinMzn: task.priceMinMzn,
  priceMaxMzn: task.priceMaxMzn,
  province: task.province,
  district: task.district,
  address: task.address,
  latitude: task.latitude,
  longitude: task.longitude,
  dueAt: task.dueAt,
  attachments: task.attachments,
  status: task.status,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
} as const;

export type TaskRow = Omit<typeof task.$inferSelect, "geom">;

function setGeomTxn(tx: { execute: (q: SQL) => Promise<unknown> }, table: typeof task, id: string, latitude: number, longitude: number) {
  return tx.execute(sql`UPDATE ${table} SET geom = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography WHERE ${table.id} = ${id}`);
}

export const tasksRepository = {
  // ── Tarefas ──────────────────────────────────────────────────────
  async create(data: typeof task.$inferInsert): Promise<TaskRow> {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(task).values(data).returning(taskColumns);
      if (!row) throw new Error("Falha ao criar tarefa");
      if (row.latitude != null && row.longitude != null) {
        await setGeomTxn(tx, task, row.id, row.latitude, row.longitude);
      }
      return row;
    });
  },

  async findById(id: string): Promise<(TaskRow & RequesterEnrichment) | null> {
    const [row] = await db.select(taskColumns).from(task).where(eq(task.id, id)).limit(1);
    if (!row) return null;
    const enriched = await enrichRequesterProfiles([row]);
    return { ...row, ...enriched.get(row.id) } as TaskRow & RequesterEnrichment;
  },

  async list(params: { status?: string; categoryId?: string; province?: string; near?: string; radiusKm?: number; page: number; limit: number }) {
    const conds: SQL[] = [];
    if (params.status) conds.push(eq(task.status, asTaskStatus(params.status)));
    if (params.categoryId) conds.push(eq(task.categoryId, params.categoryId));
    if (params.province) conds.push(eq(task.province, params.province));
    let nearCoords: { latitude: number; longitude: number } | null = null;
    if (params.near) {
      const parts = params.near.split(",");
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const coords = { latitude: lat, longitude: lng };
        nearCoords = coords;
        const box = boundingBox(coords, params.radiusKm ?? 25);
        conds.push(sql`${task.latitude} BETWEEN ${box.minLat} AND ${box.maxLat}`);
        conds.push(sql`${task.longitude} BETWEEN ${box.minLng} AND ${box.maxLng}`);
        conds.push(sql`${task.latitude} IS NOT NULL AND ${task.longitude} IS NOT NULL`);
      }
    }
    const where = and(...conds);
    let orderBy: SQL = desc(task.createdAt);
    if (nearCoords) {
      orderBy = sql`ST_Distance(${sql.raw('"task"."geom"')}, ST_SetSRID(ST_MakePoint(${nearCoords.longitude}, ${nearCoords.latitude}), 4326)::geography) ASC`;
    }
    const listColumns = nearCoords
      ? {
          ...taskColumns,
          distanceKm: sql<number>`ST_Distance(${sql.raw('"task"."geom"')}, ST_SetSRID(ST_MakePoint(${nearCoords.longitude}, ${nearCoords.latitude}), 4326)::geography) / 1000.0`.as("distanceKm"),
        }
      : taskColumns;
    const [cntRow] = await db.select({ cnt: count() }).from(task).where(where);
    const items = await db.select(listColumns).from(task).where(where).orderBy(orderBy).limit(params.limit).offset((params.page - 1) * params.limit);
    const enriched = await enrichRequesterProfiles(items);
    return {
      items: items.map((i) => ({
        ...i,
        ...(enriched.get(i.id) ?? { requesterProfileName: null, requesterProfileSlug: null, requesterProfileLogo: null }),
      })) as (TaskRow & { distanceKm?: number | null } & RequesterEnrichment)[],
      total: cntRow?.cnt ?? 0,
    };
  },

  async listByRequester(requesterUserId: string, status: string | undefined, page: number, limit: number) {
    const where = status ? and(eq(task.requesterUserId, requesterUserId), eq(task.status, asTaskStatus(status))) : eq(task.requesterUserId, requesterUserId);
    const [cntRow] = await db.select({ cnt: count() }).from(task).where(where);
    const items = await db.select(taskColumns).from(task).where(where).orderBy(desc(task.createdAt)).limit(limit).offset((page - 1) * limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async update(id: string, data: Partial<typeof task.$inferInsert>): Promise<TaskRow | null> {
    return db.transaction(async (tx) => {
      const [row] = await tx.update(task).set({ ...data, updatedAt: new Date() }).where(eq(task.id, id)).returning(taskColumns);
      if (row?.latitude != null && row.longitude != null) {
        await setGeomTxn(tx, task, row.id, row.latitude, row.longitude);
      }
      return row ?? null;
    });
  },

  async countProposalsForTasks(taskIds: string[]): Promise<Map<string, number>> {
    if (taskIds.length === 0) return new Map();
    const rows = await db.select({ taskId: taskProposal.taskId, cnt: count() }).from(taskProposal).where(and(inArray(taskProposal.taskId, taskIds), eq(taskProposal.status, asProposalStatus("submitted")))).groupBy(taskProposal.taskId);
    return new Map(rows.map((r) => [r.taskId, r.cnt]));
  },

  // ── Propostas ────────────────────────────────────────────────────
  async createProposal(data: typeof taskProposal.$inferInsert) {
    const [row] = await db.insert(taskProposal).values(data).returning();
    if (!row) throw new Error("Falha ao criar proposta");
    return row;
  },

  async findProposalById(id: string) {
    const [row] = await db.select().from(taskProposal).where(eq(taskProposal.id, id)).limit(1);
    return row ?? null;
  },

  async findProposalByTaskAndProvider(taskId: string, providerProfileId: string) {
    const [row] = await db.select().from(taskProposal).where(and(eq(taskProposal.taskId, taskId), eq(taskProposal.providerProfileId, providerProfileId))).limit(1);
    return row ?? null;
  },

  async listProposals(taskId: string, status: string | undefined, page: number, limit: number) {
    const where = status ? and(eq(taskProposal.taskId, taskId), eq(taskProposal.status, asProposalStatus(status))) : eq(taskProposal.taskId, taskId);
    const [cntRow] = await db.select({ cnt: count() }).from(taskProposal).where(where);
    const items = await db.select().from(taskProposal).where(where).orderBy(desc(taskProposal.createdAt)).limit(limit).offset((page - 1) * limit);
    const profileMap = await fetchProfileMap(items.map((i) => i.providerProfileId));
    const enriched = items.map((p) => ({
      ...p,
      providerProfileName: profileMap.get(p.providerProfileId)?.name ?? null,
      providerProfileSlug: profileMap.get(p.providerProfileId)?.slug ?? null,
      providerProfileLogo: profileMap.get(p.providerProfileId)?.logoUrl ?? null,
    }));
    return { items: enriched, total: cntRow?.cnt ?? 0 };
  },

  async listProposalsByProvider(providerProfileId: string, status: string | undefined, page: number, limit: number) {
    const where = status ? and(eq(taskProposal.providerProfileId, providerProfileId), eq(taskProposal.status, asProposalStatus(status))) : eq(taskProposal.providerProfileId, providerProfileId);
    const [cntRow] = await db.select({ cnt: count() }).from(taskProposal).where(where);
    const items = await db.select().from(taskProposal).where(where).orderBy(desc(taskProposal.createdAt)).limit(limit).offset((page - 1) * limit);
    const taskMap = await fetchTaskMap(items.map((i) => i.taskId));
    const requesterIds = [...new Set([...taskMap.values()].map((t) => t.requesterUserId))];
    const userMap = await fetchUserMap(requesterIds);
    const enriched = items.map((p) => {
      const t = taskMap.get(p.taskId);
      return {
        ...p,
        taskTitle: t?.title ?? null,
        taskStatus: t?.status ?? null,
        requesterUserName: t ? (userMap.get(t.requesterUserId)?.name ?? null) : null,
      };
    });
    return { items: enriched, total: cntRow?.cnt ?? 0 };
  },

  async listProposalsByProviders(providerProfileIds: string[], status: string | undefined, page: number, limit: number) {
    if (providerProfileIds.length === 0) return { items: [], total: 0 };
    const where = status
      ? and(inArray(taskProposal.providerProfileId, providerProfileIds), eq(taskProposal.status, asProposalStatus(status)))
      : inArray(taskProposal.providerProfileId, providerProfileIds);
    const [cntRow] = await db.select({ cnt: count() }).from(taskProposal).where(where);
    const items = await db.select().from(taskProposal).where(where).orderBy(desc(taskProposal.createdAt)).limit(limit).offset((page - 1) * limit);
    const taskMap = await fetchTaskMap(items.map((i) => i.taskId));
    const requesterIds = [...new Set([...taskMap.values()].map((t) => t.requesterUserId))];
    const userMap = await fetchUserMap(requesterIds);
    const enriched = items.map((p) => {
      const t = taskMap.get(p.taskId);
      return {
        ...p,
        taskTitle: t?.title ?? null,
        taskStatus: t?.status ?? null,
        requesterUserName: t ? (userMap.get(t.requesterUserId)?.name ?? null) : null,
      };
    });
    return { items: enriched, total: cntRow?.cnt ?? 0 };
  },

  async updateProposalStatus(id: string, status: string) {
    const [row] = await db.update(taskProposal).set({ status: asProposalStatus(status), updatedAt: new Date() }).where(eq(taskProposal.id, id)).returning();
    return row ?? null;
  },

  async listProposalIdsForTaskExcluding(taskId: string, excludeProposalId: string) {
    const rows = await db.select({ id: taskProposal.id }).from(taskProposal).where(and(eq(taskProposal.taskId, taskId), eq(taskProposal.status, asProposalStatus("submitted"))));
    return rows.map((r) => r.id).filter((id) => id !== excludeProposalId);
  },

  // ── Adjudicações (bids) ──────────────────────────────────────────
  async createBid(data: typeof taskBid.$inferInsert) {
    const [row] = await db.insert(taskBid).values(data).returning();
    if (!row) throw new Error("Falha ao criar adjudicação");
    return row;
  },

  async findBidById(id: string) {
    const [row] = await db.select().from(taskBid).where(eq(taskBid.id, id)).limit(1);
    return row ?? null;
  },

  async findBidByTask(taskId: string) {
    const [row] = await db.select().from(taskBid).where(eq(taskBid.taskId, taskId)).limit(1);
    return row ?? null;
  },

  async listBidsByRequester(requesterUserId: string, status: string | undefined, page: number, limit: number) {
    const where = status ? and(eq(taskBid.requesterUserId, requesterUserId), eq(taskBid.status, asBidStatus(status))) : eq(taskBid.requesterUserId, requesterUserId);
    const [cntRow] = await db.select({ cnt: count() }).from(taskBid).where(where);
    const items = await db.select().from(taskBid).where(where).orderBy(desc(taskBid.createdAt)).limit(limit).offset((page - 1) * limit);
    const taskMap = await fetchTaskMap(items.map((i) => i.taskId));
    const profileMap = await fetchProfileMap(items.map((i) => i.providerProfileId));
    const enriched = items.map((b) => ({
      ...b,
      taskTitle: taskMap.get(b.taskId)?.title ?? null,
      taskStatus: taskMap.get(b.taskId)?.status ?? null,
      providerProfileName: profileMap.get(b.providerProfileId)?.name ?? null,
      providerProfileSlug: profileMap.get(b.providerProfileId)?.slug ?? null,
    }));
    return { items: enriched, total: cntRow?.cnt ?? 0 };
  },

  async listBidsByProvider(providerProfileId: string, status: string | undefined, page: number, limit: number) {
    const where = status ? and(eq(taskBid.providerProfileId, providerProfileId), eq(taskBid.status, asBidStatus(status))) : eq(taskBid.providerProfileId, providerProfileId);
    const [cntRow] = await db.select({ cnt: count() }).from(taskBid).where(where);
    const items = await db.select().from(taskBid).where(where).orderBy(desc(taskBid.createdAt)).limit(limit).offset((page - 1) * limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async listBidsByProviders(providerProfileIds: string[], status: string | undefined, page: number, limit: number) {
    if (providerProfileIds.length === 0) return { items: [], total: 0 };
    const where = status
      ? and(inArray(taskBid.providerProfileId, providerProfileIds), eq(taskBid.status, asBidStatus(status)))
      : inArray(taskBid.providerProfileId, providerProfileIds);
    const [cntRow] = await db.select({ cnt: count() }).from(taskBid).where(where);
    const items = await db.select().from(taskBid).where(where).orderBy(desc(taskBid.createdAt)).limit(limit).offset((page - 1) * limit);
    const taskMap = await fetchTaskMap(items.map((i) => i.taskId));
    const requesterIds = [...new Set([...taskMap.values()].map((t) => t.requesterUserId))];
    const userMap = await fetchUserMap(requesterIds);
    const enriched = items.map((b) => {
      const t = taskMap.get(b.taskId);
      return {
        ...b,
        taskTitle: t?.title ?? null,
        taskStatus: t?.status ?? null,
        requesterUserName: t ? (userMap.get(t.requesterUserId)?.name ?? null) : null,
      };
    });
    return { items: enriched, total: cntRow?.cnt ?? 0 };
  },

  async updateBid(id: string, data: Partial<typeof taskBid.$inferInsert>) {
    const [row] = await db.update(taskBid).set({ ...data, updatedAt: new Date() }).where(eq(taskBid.id, id)).returning();
    return row ?? null;
  },

  // ── Perfis utilizáveis pelo utilizador ───────────────────────────
  /** Perfis em nome dos quais o utilizador pode agir (próprios + da org onde é membro). */
  async getUserProfileIds(userId: string): Promise<string[]> {
    const memberships = await db.select({ organizationId: member.organizationId }).from(member).where(eq(member.userId, userId));
    const ids = new Set<string>();
    if (memberships.length) {
      const profs = await db.select({ id: profile.id }).from(profile).where(inArray(profile.organizationId, memberships.map((m) => m.organizationId)));
      profs.forEach((p) => ids.add(p.id));
    }
    const own = await db.select({ id: profile.id }).from(profile).where(eq(profile.userId, userId));
    own.forEach((p) => ids.add(p.id));
    return [...ids];
  },

  async isMemberOf(userId: string, organizationId: string): Promise<boolean> {
    const rows = await db.select({ id: member.id }).from(member).where(and(eq(member.userId, userId), eq(member.organizationId, organizationId))).limit(1);
    return rows.length > 0;
  },
};