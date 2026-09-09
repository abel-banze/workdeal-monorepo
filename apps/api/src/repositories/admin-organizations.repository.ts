import { and, count, desc, eq, exists, ilike, notExists, or, sql } from "drizzle-orm";
import { db, member, organization, profile } from "@workdeal/db";
import type { AdminOrgListQuery } from "@workdeal/shared";

export interface AdminOrganizationRow {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  contactPhone: string | null;
  verificationStatus: string;
  createdAt: Date;
  verifiedAt: Date | null;
  memberCount: number;
  profileCount: number;
}

export const adminOrganizationsRepository = {
  async list(query: AdminOrgListQuery): Promise<{ items: AdminOrganizationRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.verificationStatus) {
      conditions.push(eq(organization.verificationStatus, query.verificationStatus as never));
    }
    if (query.search) {
      const q = `%${query.search}%`;
      conditions.push(or(ilike(organization.name, q), ilike(organization.slug, q)));
    }

    const memberCountSub = db
      .select({ id: member.organizationId, count: count(member.id).as("member_count") })
      .from(member)
      .groupBy(member.organizationId)
      .as("mc");
    const profileCountSub = db
      .select({ id: profile.organizationId, count: count(profile.id).as("profile_count") })
      .from(profile)
      .groupBy(profile.organizationId)
      .as("pc");

    // Presença de membros/perfis: EXISTS/NOT EXISTS não referencia aliases do
    // subselect no WHERE — a mesma condição serve no select de rows e no count.
    if (query.hasMembers === "with") {
      conditions.push(exists(db.select({ one: sql`1` }).from(member).where(eq(member.organizationId, organization.id))));
    } else if (query.hasMembers === "without") {
      conditions.push(notExists(db.select({ one: sql`1` }).from(member).where(eq(member.organizationId, organization.id))));
    }
    if (query.hasProfiles === "with") {
      conditions.push(exists(db.select({ one: sql`1` }).from(profile).where(eq(profile.organizationId, organization.id))));
    } else if (query.hasProfiles === "without") {
      conditions.push(notExists(db.select({ one: sql`1` }).from(profile).where(eq(profile.organizationId, organization.id))));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo,
          contactPhone: organization.contactPhone,
          verificationStatus: organization.verificationStatus,
          createdAt: organization.createdAt,
          verifiedAt: organization.verifiedAt,
          memberCount: sql<number>`coalesce(${memberCountSub.count}, 0)`,
          profileCount: sql<number>`coalesce(${profileCountSub.count}, 0)`,
        })
        .from(organization)
        .leftJoin(memberCountSub, eq(memberCountSub.id, organization.id))
        .leftJoin(profileCountSub, eq(profileCountSub.id, organization.id))
        .where(where)
        .orderBy(desc(organization.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(organization)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      items: rows.map((r) => ({ ...r, memberCount: Number(r.memberCount), profileCount: Number(r.profileCount) })),
      total: totalRows,
    };
  },

  async updateStatus(id: string, verificationStatus: "pending" | "in_review" | "verified" | "suspended" | "expired") {
    const verifiedAt = verificationStatus === "verified" ? new Date() : null;
    const [row] = await db
      .update(organization)
      .set({ verificationStatus: verificationStatus as never, verifiedAt, updatedAt: new Date() })
      .where(eq(organization.id, id))
      .returning();
    return row ?? null;
  },

  async findById(id: string) {
    const [row] = await db.select().from(organization).where(eq(organization.id, id)).limit(1);
    return row ?? null;
  },
};
