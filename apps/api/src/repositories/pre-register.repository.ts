import { and, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db, member, organization, user } from "@workdeal/db";
import type { AdminOrgListQuery } from "@workdeal/shared";
import { randomUUID } from "node:crypto";

export interface PreRegisterRow {
  id: string;
  name: string;
  slug: string;
  verificationStatus: string;
  createdAt: Date;
  preRegisteredAt: Date | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  completionToken: string | null;
  completionTokenExpiresAt: Date | null;
  metadata: string | null;
  promoterEmail: string | null;
}

export const preRegisterRepository = {
  async list(query: AdminOrgListQuery): Promise<{ items: PreRegisterRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: SQL<unknown>[] = [eq(organization.verificationStatus, "pre_registered" as never)];
    if (query.search) {
      const q = `%${query.search}%`;
      const searchCond = or(
        ilike(organization.name, q),
        ilike(organization.slug, q),
        ilike(organization.contactName, q),
        ilike(organization.contactPhone, q),
        ilike(organization.contactEmail, q),
      );
      if (searchCond) conditions.push(searchCond);
    }
    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          verificationStatus: organization.verificationStatus,
          createdAt: organization.createdAt,
          preRegisteredAt: organization.preRegisteredAt,
          contactName: organization.contactName,
          contactPhone: organization.contactPhone,
          contactEmail: organization.contactEmail,
          completionToken: organization.completionToken,
          completionTokenExpiresAt: organization.completionTokenExpiresAt,
          metadata: organization.metadata,
          promoterEmail: user.email,
        })
        .from(organization)
        .leftJoin(user, eq(organization.preRegisteredBy, user.id))
        .where(where)
        .orderBy(desc(organization.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(organization).where(where).then((r) => r[0]?.count ?? 0),
    ]);

    return { items: rows, total: totalRows };
  },

  async create(input: {
    id: string;
    name: string;
    slug: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string | null;
    metadata: string | null;
    preRegisteredBy: string;
    completionToken: string;
    completionTokenExpiresAt: Date;
  }) {
    const [row] = await db
      .insert(organization)
      .values({
        id: input.id,
        name: input.name,
        slug: input.slug,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        metadata: input.metadata,
        preRegisteredBy: input.preRegisteredBy,
        preRegisteredAt: new Date(),
        verificationStatus: "pre_registered" as never,
        completionToken: input.completionToken,
        completionTokenExpiresAt: input.completionTokenExpiresAt,
      })
      .returning();
    if (!row) throw new Error("Falha ao criar empresa pré-registada");
    return row;
  },

  async findByToken(token: string) {
    const [row] = await db
      .select()
      .from(organization)
      .where(and(eq(organization.completionToken, token), eq(organization.verificationStatus, "pre_registered" as never)))
      .limit(1);
    return row ?? null;
  },

  async findByIdOrg(id: string) {
    const [row] = await db.select().from(organization).where(eq(organization.id, id)).limit(1);
    return row ?? null;
  },

  async findBySlug(slug: string) {
    const [row] = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1);
    return row ?? null;
  },

  async claim(token: string, userId: string): Promise<{ ok: boolean; organizationId: string | null }> {
    const org = await this.findByToken(token);
    if (!org) return { ok: false, organizationId: null };

    // Membros novos tornam-se donos da organização pre-registada
    await db
      .insert(member)
      .values({
        id: randomUUID(),
        organizationId: org.id,
        userId,
        role: "owner",
      })
      .onConflictDoNothing({ target: [member.organizationId, member.userId] });

    // Migra pre_registered -> pending e invalida o token
    await db
      .update(organization)
      .set({
        verificationStatus: "pending" as never,
        completionToken: null,
        completionTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, org.id));

    return { ok: true, organizationId: org.id };
  },

  async updateToken(id: string, token: string, expiresAt: Date) {
    await db
      .update(organization)
      .set({ completionToken: token, completionTokenExpiresAt: expiresAt, updatedAt: new Date() })
      .where(and(eq(organization.id, id), eq(organization.verificationStatus, "pre_registered" as never)));
  },

  async getValidByToken(token: string) {
    const [row] = await db
      .select()
      .from(organization)
      .where(
        and(
          eq(organization.completionToken, token),
          eq(organization.verificationStatus, "pre_registered" as never),
          gt(organization.completionTokenExpiresAt, new Date()),
        ),
      )
      .limit(1);
    return row ?? null;
  },
};
