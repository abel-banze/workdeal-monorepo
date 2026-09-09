import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db, affiliate, affiliateEarning, affiliateReferral, member, organization, user } from "@workdeal/db";
import type { AffiliateListQuery } from "@workdeal/shared";

export interface AffiliateRow {
  id: string;
  actorType: "user" | "organization";
  userId: string | null;
  organizationId: string | null;
  actorName: string | null;
  code: string;
  commissionType: "percent" | "fixed";
  commissionValue: number;
  status: "active" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}

const affiliateSelect = {
  id: affiliate.id,
  actorType: affiliate.actorType,
  userId: affiliate.userId,
  organizationId: affiliate.organizationId,
  actorName: sql<string | null>`coalesce(${user.name}, ${organization.name})`,
  code: affiliate.code,
  commissionType: affiliate.commissionType,
  commissionValue: affiliate.commissionValue,
  status: affiliate.status,
  createdAt: affiliate.createdAt,
  updatedAt: affiliate.updatedAt,
};

function toRow(row: (typeof affiliateSelect) extends undefined ? never : any): AffiliateRow {
  return row as AffiliateRow;
}

export const affiliateRepository = {
  async findByCode(code: string): Promise<AffiliateRow | null> {
    const [row] = await db
      .select(affiliateSelect)
      .from(affiliate)
      .leftJoin(user, and(eq(affiliate.actorType, "user"), eq(affiliate.userId, user.id)))
      .leftJoin(organization, and(eq(affiliate.actorType, "organization"), eq(affiliate.organizationId, organization.id)))
      .where(eq(affiliate.code, code))
      .limit(1);
    return row ? toRow(row) : null;
  },

  async findByActor(actorType: "user" | "organization", actorId: string): Promise<AffiliateRow | null> {
    const [row] = await db
      .select(affiliateSelect)
      .from(affiliate)
      .leftJoin(user, and(eq(affiliate.actorType, "user"), eq(affiliate.userId, user.id)))
      .leftJoin(organization, and(eq(affiliate.actorType, "organization"), eq(affiliate.organizationId, organization.id)))
      .where(
        actorType === "user" ? eq(affiliate.userId, actorId) : eq(affiliate.organizationId, actorId),
      )
      .limit(1);
    return row ? toRow(row) : null;
  },

  async findById(id: string): Promise<AffiliateRow | null> {
    const [row] = await db
      .select(affiliateSelect)
      .from(affiliate)
      .leftJoin(user, and(eq(affiliate.actorType, "user"), eq(affiliate.userId, user.id)))
      .leftJoin(organization, and(eq(affiliate.actorType, "organization"), eq(affiliate.organizationId, organization.id)))
      .where(eq(affiliate.id, id))
      .limit(1);
    return row ? toRow(row) : null;
  },

  async create(input: {
    actorType: "user" | "organization";
    userId: string | null;
    organizationId: string | null;
    code: string;
    commissionType: "percent" | "fixed";
    commissionValue: number;
  }): Promise<AffiliateRow> {
    const [row] = await db.insert(affiliate).values(input).returning();
    return toRow(row);
  },

  async update(id: string, input: {
    commissionType?: "percent" | "fixed";
    commissionValue?: number;
    status?: "active" | "suspended";
  }): Promise<AffiliateRow | null> {
    const [row] = await db
      .update(affiliate)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(affiliate.id, id))
      .returning();
    return row ? toRow(row) : null;
  },

  async isUserMemberOfOrganization(userId: string, organizationId: string): Promise<boolean> {
    const [row] = await db
      .select({ one: sql`1` })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1);
    return Boolean(row);
  },

  async list(query: AffiliateListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: SQL<unknown>[] = [];
    if (query.status) conditions.push(eq(affiliate.status, query.status));
    if (query.search) {
      const q = `%${query.search}%`;
      const searchCond = or(ilike(affiliate.code, q), ilike(affiliate.id, q));
      if (searchCond) conditions.push(searchCond);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select(affiliateSelect)
        .from(affiliate)
        .leftJoin(user, and(eq(affiliate.actorType, "user"), eq(affiliate.userId, user.id)))
        .leftJoin(organization, and(eq(affiliate.actorType, "organization"), eq(affiliate.organizationId, organization.id)))
        .where(where)
        .orderBy(desc(affiliate.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(affiliate)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    const items = rows.map((r) => toRow(r));
    const aggregates = await this.aggregate(items.map((i) => i.id));
    return { items, total: totalRows, page, limit, aggregates };
  },

  async aggregate(ids: string[]) {
    if (ids.length === 0) return { referrals: new Map<string, number>(), conversions: new Map<string, number>(), pendingMzn: new Map<string, number>(), paidMzn: new Map<string, number>() };

    const [refAgg, earnAgg] = await Promise.all([
      db
        .select({
          affiliateId: affiliateReferral.affiliateId,
          referrals: count(affiliateReferral.id).mapWith(Number),
          conversions: sql<number>`coalesce(sum(case when ${affiliateReferral.status} = 'converted' then 1 else 0 end), 0)::int`,
        })
        .from(affiliateReferral)
        .where(inArray(affiliateReferral.affiliateId, ids))
        .groupBy(affiliateReferral.affiliateId),
      db
        .select({
          affiliateId: affiliateEarning.affiliateId,
          pendingMzn: sql<number>`coalesce(sum(case when ${affiliateEarning.status} = 'pending' then ${affiliateEarning.amountMzn} else 0 end), 0)::int`,
          paidMzn: sql<number>`coalesce(sum(case when ${affiliateEarning.status} = 'paid' then ${affiliateEarning.amountMzn} else 0 end), 0)::int`,
        })
        .from(affiliateEarning)
        .where(inArray(affiliateEarning.affiliateId, ids))
        .groupBy(affiliateEarning.affiliateId),
    ]);

    return {
      referrals: new Map(refAgg.map((r) => [r.affiliateId, r.referrals])),
      conversions: new Map(refAgg.map((r) => [r.affiliateId, r.conversions])),
      pendingMzn: new Map(earnAgg.map((r) => [r.affiliateId, r.pendingMzn])),
      paidMzn: new Map(earnAgg.map((r) => [r.affiliateId, r.paidMzn])),
    };
  },

  async findReferralByOrganization(organizationId: string) {
    const [row] = await db
      .select({
        id: affiliateReferral.id,
        affiliateId: affiliateReferral.affiliateId,
        code: affiliateReferral.code,
        source: affiliateReferral.source,
        referredOrganizationId: affiliateReferral.referredOrganizationId,
        status: affiliateReferral.status,
        convertedInvoiceId: affiliateReferral.convertedInvoiceId,
        commissionAmountMzn: affiliateReferral.commissionAmountMzn,
        createdAt: affiliateReferral.createdAt,
        convertedAt: affiliateReferral.convertedAt,
      })
      .from(affiliateReferral)
      .where(eq(affiliateReferral.referredOrganizationId, organizationId))
      .limit(1);
    return row ?? null;
  },

  async createReferral(input: {
    affiliateId: string;
    code: string;
    source: "coupon" | "link";
    referredOrganizationId: string;
  }) {
    const [row] = await db.insert(affiliateReferral).values(input).returning();
    return row;
  },

  async referralsByAffiliate(affiliateId: string, limit = 50) {
    return db
      .select({
        id: affiliateReferral.id,
        code: affiliateReferral.code,
        source: affiliateReferral.source,
        status: affiliateReferral.status,
        referredCompanyName: organization.name,
        commissionAmountMzn: affiliateReferral.commissionAmountMzn,
        createdAt: affiliateReferral.createdAt,
        convertedAt: affiliateReferral.convertedAt,
      })
      .from(affiliateReferral)
      .leftJoin(organization, eq(affiliateReferral.referredOrganizationId, organization.id))
      .where(eq(affiliateReferral.affiliateId, affiliateId))
      .orderBy(desc(affiliateReferral.createdAt))
      .limit(limit);
  },

  async earningsByAffiliate(affiliateId: string, limit = 50) {
    return db
      .select({
        id: affiliateEarning.id,
        amountMzn: affiliateEarning.amountMzn,
        status: affiliateEarning.status,
        referredCompanyName: organization.name,
        createdAt: affiliateEarning.createdAt,
        paidAt: affiliateEarning.paidAt,
      })
      .from(affiliateEarning)
      .leftJoin(affiliateReferral, eq(affiliateEarning.referralId, affiliateReferral.id))
      .leftJoin(organization, eq(affiliateReferral.referredOrganizationId, organization.id))
      .where(eq(affiliateEarning.affiliateId, affiliateId))
      .orderBy(desc(affiliateEarning.createdAt))
      .limit(limit);
  },

  // Transação idempotente: atribui a conversão à referral (só uma vez) e cria a earning.
  async convertReferral(input: {
    referralId: string;
    affiliateId: string;
    invoiceId: string;
    amountMzn: number;
  }): Promise<{ converted: boolean; existed: boolean }> {
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: affiliateReferral.status })
        .from(affiliateReferral)
        .where(eq(affiliateReferral.id, input.referralId))
        .limit(1);
      if (!current) return { converted: false, existed: false };
      if (current.status === "converted") return { converted: false, existed: true };

      await tx
        .update(affiliateReferral)
        .set({
          status: "converted",
          convertedInvoiceId: input.invoiceId,
          commissionAmountMzn: input.amountMzn,
          convertedAt: new Date(),
        })
        .where(eq(affiliateReferral.id, input.referralId));

      await tx.insert(affiliateEarning).values({
        affiliateId: input.affiliateId,
        referralId: input.referralId,
        invoiceId: input.invoiceId,
        amountMzn: input.amountMzn,
      });

      return { converted: true, existed: false };
    });
  },
};