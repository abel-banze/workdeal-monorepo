import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, badge, profileBadge, user, institution } from "@workdeal/db";
import type { AdminBadgesListQuery, AssignedBadgeView, Badge, BadgeCreateInput, BadgeUpdateInput, BadgesListQuery } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";

const badgeColumns = {
  id: badge.id,
  slug: badge.slug,
  name: badge.name,
  description: badge.description,
  type: badge.type,
  origin: badge.origin,
  criteria: badge.criteria,
  isActive: badge.isActive,
  createdAt: badge.createdAt,
  updatedAt: badge.updatedAt,
} as const;

class BadgesRepository {
  // ── Catálogo ─────────────────────────────────────────────────────────────

  async findById(id: string): Promise<Badge | null> {
    const [row] = await db.select(badgeColumns).from(badge).where(eq(badge.id, id)).limit(1);
    return (row as Badge | undefined) ?? null;
  }

  async findBySlug(slug: string): Promise<Badge | null> {
    const [row] = await db.select(badgeColumns).from(badge).where(eq(badge.slug, slug)).limit(1);
    return (row as Badge | undefined) ?? null;
  }

  async listPublic(query: BadgesListQuery): Promise<{ items: Badge[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(badge.isActive, true)];
    if (query.type) conditions.push(eq(badge.type, query.type));
    const where = and(...conditions);

    const [rows, countRows] = await Promise.all([
      db.select(badgeColumns).from(badge).where(where).orderBy(asc(badge.name)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(badge).where(where).then((r) => r[0]?.count ?? 0),
    ]);
    return { items: rows as Badge[], total: countRows };
  }

  async listAdmin(query: AdminBadgesListQuery): Promise<{ items: Badge[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions: (ReturnType<typeof eq> | ReturnType<typeof ilike> | ReturnType<typeof or>)[] = [];
    if (query.q) {
      const q = `%${query.q}%`;
      const search = or(ilike(badge.name, q), ilike(badge.slug, q), ilike(badge.description ?? badge.name, q));
      if (search) conditions.push(search);
    }
    if (query.type) conditions.push(eq(badge.type, query.type));
    if (query.origin) conditions.push(eq(badge.origin, query.origin));
    if (query.isActive !== undefined) conditions.push(eq(badge.isActive, query.isActive));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      db.select(badgeColumns).from(badge).where(where).orderBy(desc(badge.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(badge).where(where).then((r) => r[0]?.count ?? 0),
    ]);
    return { items: rows as Badge[], total: countRows };
  }

  async create(data: BadgeCreateInput & { id: string }): Promise<Badge> {
    const [row] = await db
      .insert(badge)
      .values({
        id: data.id,
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        origin: data.origin,
        criteria: data.criteria ?? null,
      })
      .returning(badgeColumns);
    return row as Badge;
  }

  async update(id: string, patch: BadgeUpdateInput): Promise<Badge | null> {
    const [row] = await db
      .update(badge)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(badge.id, id))
      .returning(badgeColumns);
    return (row as Badge | undefined) ?? null;
  }

  async remove(id: string): Promise<boolean> {
    const [row] = await db.delete(badge).where(eq(badge.id, id)).returning({ id: badge.id });
    return !!row;
  }

  async countAssignments(badgeId: string): Promise<number> {
    const [r] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(profileBadge)
      .where(eq(profileBadge.badgeId, badgeId));
    return r?.count ?? 0;
  }

  // ── Atribuição (profile_badge) ───────────────────────────────────────────

  async findAssigned(profileId: string, badgeId: string): Promise<{ status: string } | null> {
    const [row] = await db
      .select({ status: profileBadge.status })
      .from(profileBadge)
      .where(and(eq(profileBadge.profileId, profileId), eq(profileBadge.badgeId, badgeId)))
      .limit(1);
    return row ?? null;
  }

  async assignBadge(profileId: string, badgeId: string, actorId: string): Promise<AssignedBadgeView> {
    const existing = await this.findAssigned(profileId, badgeId);
    if (existing) {
      if (existing.status === "active") {
        return this.fetchAssignedView(profileId, badgeId);
      }
      await db
        .update(profileBadge)
        .set({ status: "active", revokedAt: null, awardedAt: new Date(), awardedByUserId: actorId })
        .where(and(eq(profileBadge.profileId, profileId), eq(profileBadge.badgeId, badgeId)));
      return this.fetchAssignedView(profileId, badgeId);
    }
    await db.insert(profileBadge).values({
      profileId,
      badgeId,
      origin: "manual",
      status: "active",
      awardedByUserId: actorId,
    });
    return this.fetchAssignedView(profileId, badgeId);
  }

  async revokeBadge(profileId: string, badgeId: string): Promise<AssignedBadgeView | null> {
    const existing = await this.findAssigned(profileId, badgeId);
    if (!existing) return null;
    if (existing.status !== "revoked") {
      await db
        .update(profileBadge)
        .set({ status: "revoked", revokedAt: new Date() })
        .where(and(eq(profileBadge.profileId, profileId), eq(profileBadge.badgeId, badgeId)));
    }
    return this.fetchAssignedView(profileId, badgeId);
  }

  // Atribui pelo slug (ex: "verified" no fluxo de verificação de instituições).
  async assignBySlug(profileId: string, slug: string, actorId: string): Promise<AssignedBadgeView> {
    const badgeRow = await this.findBySlug(slug);
    if (!badgeRow) throw new AppError(500, "BADGE_NOT_SEEDED", `Selo '${slug}' não existe no catálogo`);
    return this.assignBadge(profileId, badgeRow.id, actorId);
  }

  async listInstitutionBadges(institutionId: string): Promise<AssignedBadgeView[]> {
    const profileId = await this.findInstitutionProfileId(institutionId);
    if (!profileId) return [];
    return this.fetchAssignedViews(profileId);
  }

  async findInstitutionProfileId(institutionId: string): Promise<string | null> {
    const [row] = await db.select({ profileId: institution.profileId }).from(institution).where(eq(institution.id, institutionId)).limit(1);
    return row?.profileId ?? null;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async fetchAssignedView(profileId: string, badgeId: string): Promise<AssignedBadgeView> {
    const rows = await this.fetchAssignedViews(profileId);
    const found = rows.find((r) => r.badgeId === badgeId);
    if (!found) throw new AppError(500, "ASSIGNED_BADGE_MISSING", "Selo atribuído não encontrado");
    return found;
  }

  private async fetchAssignedViews(profileId: string): Promise<AssignedBadgeView[]> {
    const rows = await db
      .select({
        badgeId: profileBadge.badgeId,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        type: badge.type,
        origin: profileBadge.origin,
        criteria: badge.criteria,
        isActive: badge.isActive,
        status: profileBadge.status,
        awardedAt: profileBadge.awardedAt,
        revokedAt: profileBadge.revokedAt,
        awardedById: user.id,
        awardedByName: user.name,
      })
      .from(profileBadge)
      .innerJoin(badge, eq(profileBadge.badgeId, badge.id))
      .leftJoin(user, eq(profileBadge.awardedByUserId, user.id))
      .where(eq(profileBadge.profileId, profileId))
      .orderBy(desc(profileBadge.awardedAt));

    return rows.map((r) => ({
      badgeId: r.badgeId,
      slug: r.slug,
      name: r.name,
      description: r.description,
      type: r.type,
      origin: r.origin,
      criteria: r.criteria,
      isActive: r.isActive,
      status: r.status,
      awardedAt: r.awardedAt,
      revokedAt: r.revokedAt,
      awardedBy: r.awardedById ? { id: r.awardedById, name: r.awardedByName ?? "" } : null,
    }));
  }
}

export const badgesRepository = new BadgesRepository();