import { and, asc, desc, eq, exists, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db, institution, institutionManager, institutionMembership, profile, profileCategory, profileBadge, badge, category, profileLocation, profileTag, tag, user } from "@workdeal/db";
import type {
  AdminInstitutionsListQuery,
  AdminInstitutionMembershipsQuery,
  InstitutionListItem,
  InstitutionPublicView,
  InstitutionMemberView,
  InstitutionAdminRow,
  InstitutionManagerRow,
  InstitutionsListQuery,
  InstitutionMembershipAdminRow,
  MembershipStatus,
  MembershipType,
  InstitutionManagerRole,
  InstitutionsMineQuery,
} from "@workdeal/shared";
import { boundingBox, isValidCoordinates } from "@workdeal/shared/lib/geo";
import type { ProfileBadgeLite } from "@workdeal/shared";

// Geralmente correspondem a 1:1, mas usar o id do perfil ligado evita depender
// de joins extra para pesquisas e categorias (que vivem no profile).
function buildPublicConditions(query: InstitutionsListQuery): (ReturnType<typeof eq> | ReturnType<typeof sql> | undefined)[] {
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql> | undefined)[] = [
    eq(profile.type, "institution"),
    eq(profile.status, "active"),
    eq(institution.status, "active"),
    isNull(profile.deletedAt),
  ];

  if (query.organizationType) conditions.push(eq(institution.organizationType, query.organizationType));
  if (query.operatingScope) conditions.push(eq(institution.operatingScope, query.operatingScope));
  if (query.province) conditions.push(eq(institution.province, query.province));

  if (query.categoryId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(profileCategory)
          .where(and(eq(profileCategory.profileId, profile.id), eq(profileCategory.categoryId, query.categoryId))),
      ),
    );
  }

  if (query.tagSlug) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(profileTag)
          .innerJoin(tag, eq(profileTag.tagId, tag.id))
          .where(and(eq(profileTag.profileId, profile.id), eq(tag.slug, query.tagSlug))),
      ),
    );
  }

  // "Associações": instituições onde a empresa tem membership aprovada/verificada
  if (query.companyProfileId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(institutionMembership)
          .where(
            and(
              eq(institutionMembership.institutionId, institution.id),
              eq(institutionMembership.companyProfileId, query.companyProfileId),
              inArray(institutionMembership.status, ["approved", "verified"]),
            ),
          ),
      ),
    );
  }

  if (query.q) {
    const q = `%${query.q}%`;
    const search = or(
      ilike(profile.name, q),
      ilike(profile.tagline, q),
      ilike(profile.searchCategoryText, q),
      ilike(profile.searchTagText, q),
      ilike(institution.province, q),
      ilike(institution.city, q),
    );
    if (search) conditions.push(search);
  }

  return conditions;
}

const membersCountSql = sql<number>`(
  select count(*)::int from institution_membership im
  where im.institution_id = ${institution.id} and im.status in ('approved', 'verified')
)`;
const verifiedMembersCountSql = sql<number>`(
  select count(*)::int from institution_membership im
  where im.institution_id = ${institution.id} and im.status = 'verified'
)`;

class InstitutionsRepository {
  async listPublic(query: InstitutionsListQuery): Promise<{ items: InstitutionListItem[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const offset = (page - 1) * limit;

    const conditions = buildPublicConditions(query);

    let nearCoords: { latitude: number; longitude: number } | null = null;
    if (query.near) {
      const [latStr, lngStr] = query.near.split(",");
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!isValidCoordinates(lat, lng)) throw new Error("Coordenadas near inválidas");
      nearCoords = { latitude: lat, longitude: lng };
      const radius = query.radiusKm ?? 25;
      const box = boundingBox(nearCoords, radius);
      conditions.push(sql`${profile.latitude} BETWEEN ${box.minLat} AND ${box.maxLat}`);
      conditions.push(sql`${profile.longitude} BETWEEN ${box.minLng} AND ${box.maxLng}`);
      conditions.push(sql`${profile.latitude} IS NOT NULL AND ${profile.longitude} IS NOT NULL`);
    }

    const where = and(...(conditions.filter(Boolean) as Parameters<typeof and>[0][]));

    const orderBy =
      query.sort === "name"
        ? asc(profile.name)
        : query.sort === "members"
          ? sql`(
              select count(*) from institution_membership im
              where im.institution_id = ${institution.id} and im.status in ('approved', 'verified')
            ) DESC, ${profile.name} ASC`
          : query.sort === "distance" && nearCoords
            ? sql`ST_Distance(${sql.raw('"profile"."geom"')}, ST_SetSRID(ST_MakePoint(${nearCoords.longitude}, ${nearCoords.latitude}), 4326)::geography) ASC`
            : desc(institution.createdAt);

    const selectFields = {
      id: institution.id,
      profileId: profile.id,
      slug: profile.slug,
      name: profile.name,
      tagline: profile.tagline,
      logoUrl: profile.logoUrl,
      coverUrl: profile.coverUrl,
      latitude: profile.latitude,
      longitude: profile.longitude,
      organizationType: institution.organizationType,
      verificationStatus: institution.verificationStatus,
      operatingScope: institution.operatingScope,
      acronym: institution.acronym,
      province: institution.province,
      district: institution.district,
      city: institution.city,
      foundedAt: institution.foundedAt,
      createdAt: institution.createdAt,
      membersCount: membersCountSql,
      verifiedMembersCount: verifiedMembersCountSql,
      ...(nearCoords
        ? {
            distanceKm: sql<number>`ST_Distance(${sql.raw('"profile"."geom"')}, ST_SetSRID(ST_MakePoint(${nearCoords.longitude}, ${nearCoords.latitude}), 4326)::geography) / 1000.0`.as("distanceKm"),
          }
        : {}),
    };

    const [rows, countRows] = await Promise.all([
      db.select(selectFields).from(institution).innerJoin(profile, eq(institution.profileId, profile.id)).where(where).orderBy(orderBy).limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(institution)
        .innerJoin(profile, eq(institution.profileId, profile.id))
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return { items: await this.fetchCardExtras(rows as Parameters<typeof this.fetchCardExtras>[0]), total: countRows };
  }

  async getPublicBySlug(slug: string): Promise<InstitutionPublicView | null> {
    const [row] = await db
      .select({
        id: institution.id,
        slug: profile.slug,
        name: profile.name,
        tagline: profile.tagline,
        description: profile.description,
        logoUrl: profile.logoUrl,
        coverUrl: profile.coverUrl,
        latitude: profile.latitude,
        longitude: profile.longitude,
        status: institution.status,
        profileId: profile.id,
        organizationType: institution.organizationType,
        verificationStatus: institution.verificationStatus,
        verifiedAt: institution.verifiedAt,
        foundedAt: institution.foundedAt,
        website: institution.website,
        email: institution.email,
        phone: institution.phone,
        whatsapp: institution.whatsapp,
        province: institution.province,
        district: institution.district,
        city: institution.city,
        address: institution.address,
        operatingScope: institution.operatingScope,
        acronym: institution.acronym,
        mission: institution.mission,
        vision: institution.vision,
        socialLinks: institution.socialLinks,
        membersCount: membersCountSql,
        verifiedMembersCount: verifiedMembersCountSql,
      })
      .from(institution)
      .innerJoin(profile, eq(institution.profileId, profile.id))
      .where(and(or(eq(profile.slug, slug), eq(institution.slug, slug)), isNull(profile.deletedAt)))
      .limit(1);

    if (!row) return null;

    const [categories, badges, members] = await Promise.all([
      this.fetchCategories(row.profileId),
      this.fetchBadges(row.profileId),
      this.fetchMembers(row.id),
    ]);

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      logoUrl: row.logoUrl,
      coverUrl: row.coverUrl,
      organizationType: row.organizationType,
      verificationStatus: row.verificationStatus as InstitutionAdminRow["verificationStatus"],
      verifiedAt: row.verifiedAt,
      foundedAt: row.foundedAt,
      website: row.website,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      province: row.province,
      district: row.district,
      city: row.city,
      address: row.address,
      operatingScope: row.operatingScope,
      acronym: row.acronym,
      mission: row.mission,
      vision: row.vision,
      socialLinks: row.socialLinks as InstitutionPublicView["socialLinks"],
      latitude: row.latitude,
      longitude: row.longitude,
      status: row.status,
      categories,
      badges,
      membersCount: row.membersCount,
      verifiedMembersCount: row.verifiedMembersCount,
      members,
    };
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async listAdmin(query: AdminInstitutionsListQuery): Promise<{ items: InstitutionAdminRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: (ReturnType<typeof eq> | ReturnType<typeof ilike> | undefined)[] = [];
    if (query.organizationType) conditions.push(eq(institution.organizationType, query.organizationType));
    if (query.operatingScope) conditions.push(eq(institution.operatingScope, query.operatingScope));
    if (query.status) conditions.push(eq(institution.status, query.status));
    if (query.verificationStatus) conditions.push(eq(institution.verificationStatus, query.verificationStatus));
    if (query.search) {
      const q = `%${query.search}%`;
      const search = or(ilike(institution.name, q), ilike(institution.slug, q), ilike(profile.name, q));
      if (search) conditions.push(search);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const selectFields = {
      id: institution.id,
      slug: institution.slug,
      name: institution.name,
      profileId: institution.profileId,
      legalName: institution.legalName,
      organizationType: institution.organizationType,
      status: institution.status,
      verificationStatus: institution.verificationStatus,
      verifiedAt: institution.verifiedAt,
      province: institution.province,
      district: institution.district,
      city: institution.city,
      address: institution.address,
      foundedAt: institution.foundedAt,
      acronym: institution.acronym,
      taxId: institution.taxId,
      mission: institution.mission,
      vision: institution.vision,
      operatingScope: institution.operatingScope,
      socialLinks: institution.socialLinks,
      primaryContact: institution.primaryContact,
      verificationDocuments: institution.verificationDocuments,
      createdAt: institution.createdAt,
      logoUrl: profile.logoUrl,
      createdByEmail: user.email,
      membersCount: membersCountSql,
      verifiedMembersCount: verifiedMembersCountSql,
    };

    const [rows, countRows] = await Promise.all([
      db
        .select(selectFields)
        .from(institution)
        .innerJoin(profile, eq(institution.profileId, profile.id))
        .leftJoin(user, eq(institution.createdById, user.id))
        .where(where)
        .orderBy(desc(institution.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(institution)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return { items: rows as InstitutionAdminRow[], total: countRows };
  }

  async findAdminById(id: string): Promise<InstitutionAdminRow | null> {
    const [row] = await db
      .select({
        id: institution.id,
        slug: institution.slug,
        name: institution.name,
        profileId: institution.profileId,
        legalName: institution.legalName,
        organizationType: institution.organizationType,
        status: institution.status,
        verificationStatus: institution.verificationStatus,
      verifiedAt: institution.verifiedAt,
      province: institution.province,
      district: institution.district,
      city: institution.city,
      address: institution.address,
      foundedAt: institution.foundedAt,
      acronym: institution.acronym,
      taxId: institution.taxId,
      mission: institution.mission,
      vision: institution.vision,
      operatingScope: institution.operatingScope,
      socialLinks: institution.socialLinks,
      primaryContact: institution.primaryContact,
      verificationDocuments: institution.verificationDocuments,
      createdAt: institution.createdAt,
        website: institution.website,
        email: institution.email,
        phone: institution.phone,
        whatsapp: institution.whatsapp,
        logoUrl: profile.logoUrl,
        coverUrl: profile.coverUrl,
        tagline: profile.tagline,
        description: profile.description,
        latitude: profile.latitude,
        longitude: profile.longitude,
        createdByEmail: user.email,
        membersCount: membersCountSql,
        verifiedMembersCount: verifiedMembersCountSql,
      })
      .from(institution)
      .innerJoin(profile, eq(institution.profileId, profile.id))
      .leftJoin(user, eq(institution.createdById, user.id))
      .where(eq(institution.id, id))
      .limit(1);
    return (row as InstitutionAdminRow | undefined) ?? null;
  }

  async slugExists(slug: string): Promise<boolean> {
    const [row] = await db.select({ one: sql`1` }).from(institution).where(eq(institution.slug, slug)).limit(1);
    return row !== undefined;
  }

  async create(input: {
    institution: typeof institution.$inferInsert;
    profile: typeof profile.$inferInsert;
    categoryIds: string[];
    managerUserId?: string;
    managerRole?: "owner" | "admin" | "editor" | "member";
  }): Promise<{ institutionId: string; profileId: string }> {
    return db.transaction(async (tx) => {
      const profileId = crypto.randomUUID();
      const institutionId = crypto.randomUUID();
      await tx.insert(profile).values({ id: profileId, ...input.profile });
      if (input.profile.latitude != null && input.profile.longitude != null) {
        await tx.execute(sql`UPDATE ${profile} SET geom = ST_SetSRID(ST_MakePoint(${input.profile.longitude}, ${input.profile.latitude}), 4326)::geography WHERE ${profile.id} = ${profileId}`);
      }
      await tx.insert(institution).values({ ...input.institution, id: institutionId, profileId });
      if (input.categoryIds.length > 0) {
        await tx.insert(profileCategory).values(
          input.categoryIds.map((categoryId, position) => ({
            profileId,
            categoryId,
            isPrimary: position === 0,
            position,
          })),
        );
      }
      if (input.managerUserId) {
        await tx.insert(institutionManager).values({
          institutionId,
          userId: input.managerUserId,
          role: input.managerRole ?? "owner",
        });
      }
      return { institutionId, profileId };
    });
  }

  async update(
    id: string,
    input: {
      institution: Partial<typeof institution.$inferInsert>;
      profile: Partial<typeof profile.$inferInsert>;
      categoryIds?: string[];
    },
  ): Promise<void> {
    await db.transaction(async (tx) => {
      const [inst] = await tx.select({ profileId: institution.profileId }).from(institution).where(eq(institution.id, id)).limit(1);
      if (!inst) return;
      if (Object.keys(input.institution).length > 0) {
        await tx.update(institution).set(input.institution).where(eq(institution.id, id));
      }
      const profilePatch = { ...input.profile };
      const hasLat = "latitude" in profilePatch;
      const hasLng = "longitude" in profilePatch;
      const lat = profilePatch.latitude as number | null | undefined;
      const lng = profilePatch.longitude as number | null | undefined;
      if ((hasLat && lat == null) || (hasLng && lng == null)) {
        profilePatch.latitude = null;
        profilePatch.longitude = null;
      } else if (!hasLat && !hasLng) {
        delete profilePatch.latitude;
        delete profilePatch.longitude;
      }
      if (Object.keys(profilePatch).length > 0) {
        await tx.update(profile).set(profilePatch).where(eq(profile.id, inst.profileId));
      }
      const shouldSetGeom = lat != null && lng != null;
      const shouldClearGeom = (hasLat || hasLng) && (lat == null || lng == null);
      if (shouldSetGeom) {
        await tx.execute(sql`UPDATE ${profile} SET geom = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography WHERE ${profile.id} = ${inst.profileId}`);
      } else if (shouldClearGeom) {
        await tx.execute(sql`UPDATE ${profile} SET geom = NULL WHERE ${profile.id} = ${inst.profileId}`);
      }
      if (input.categoryIds) {
        await tx.delete(profileCategory).where(eq(profileCategory.profileId, inst.profileId));
        if (input.categoryIds.length > 0) {
          await tx.insert(profileCategory).values(
            input.categoryIds.map((categoryId, position) => ({
              profileId: inst.profileId,
              categoryId,
              isPrimary: position === 0,
              position,
            })),
          );
        }
      }
    });
  }

  async setVerification(id: string, verificationStatus: "pending" | "in_review" | "verified" | "suspended", actorId: string): Promise<void> {
    const verifiedAt = verificationStatus === "verified" ? new Date() : null;
    await db.update(institution).set({ verificationStatus, verifiedAt, updatedAt: new Date() }).where(eq(institution.id, id));
  }

  async findProfileById(id: string): Promise<{ id: string; type: string; userId: string | null; organizationId: string | null; status: string; deletedAt: Date | null } | null> {
    const [row] = await db
      .select({ id: profile.id, type: profile.type, userId: profile.userId, organizationId: profile.organizationId, status: profile.status, deletedAt: profile.deletedAt })
      .from(profile)
      .where(eq(profile.id, id))
      .limit(1);
    return row ?? null;
  }

  // ── Memberships ──────────────────────────────────────────────────────────

  async findMembershipByCompanyAndInstitution(institutionId: string, companyProfileId: string) {
    const [row] = await db
      .select()
      .from(institutionMembership)
      .where(and(eq(institutionMembership.institutionId, institutionId), eq(institutionMembership.companyProfileId, companyProfileId)))
      .limit(1);
    return row ?? null;
  }

  async requestMembership(input: {
    institutionId: string;
    companyProfileId: string;
    membershipType: MembershipType;
    requestedById: string;
  }) {
    const existing = await this.findMembershipByCompanyAndInstitution(input.institutionId, input.companyProfileId);
    if (existing) {
      if (existing.status === "pending" || existing.status === "approved" || existing.status === "verified") {
        return { inserted: false, row: existing };
      }
      const [updated] = await db
        .update(institutionMembership)
        .set({ status: "pending", membershipType: input.membershipType, requestedById: input.requestedById, updatedAt: new Date() })
        .where(eq(institutionMembership.id, existing.id))
        .returning();
      return { inserted: false, row: updated };
    }
    const [row] = await db
      .insert(institutionMembership)
      .values({
        id: crypto.randomUUID(),
        institutionId: input.institutionId,
        companyProfileId: input.companyProfileId,
        membershipType: input.membershipType,
        status: "pending",
        requestedById: input.requestedById,
      })
      .returning();
    return { inserted: true, row };
  }

  async findMembership(id: string) {
    const [row] = await db.select().from(institutionMembership).where(eq(institutionMembership.id, id)).limit(1);
    return row ?? null;
  }

  async updateMembershipStatus(id: string, status: MembershipStatus, actorId: string) {
    const now = new Date();
    const patch: Partial<typeof institutionMembership.$inferInsert> = { status, updatedAt: now };
    if (status === "approved") {
      patch.approvedById = actorId;
      patch.approvedAt = now;
      patch.joinedAt = now;
    }
    if (status === "verified") {
      patch.verifiedById = actorId;
      patch.verifiedAt = now;
    }
    const [row] = await db.update(institutionMembership).set(patch).where(eq(institutionMembership.id, id)).returning();
    return row ?? null;
  }

  async listMemberships(institutionId: string, query: AdminInstitutionMembershipsQuery): Promise<{ items: InstitutionMembershipAdminRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql>)[] = [eq(institutionMembership.institutionId, institutionId)];
    if (query.status) conditions.push(eq(institutionMembership.status, query.status));
    const where = and(...conditions);

    const rows = await db
      .select({
        id: institutionMembership.id,
        institutionId: institutionMembership.institutionId,
        membershipType: institutionMembership.membershipType,
        status: institutionMembership.status,
        requestedByName: user.name,
        approvedAt: institutionMembership.approvedAt,
        verifiedAt: institutionMembership.verifiedAt,
        joinedAt: institutionMembership.joinedAt,
        createdAt: institutionMembership.createdAt,
        companyProfileId: profile.id,
        companySlug: profile.slug,
        companyName: profile.name,
        companyLogoUrl: profile.logoUrl,
      })
      .from(institutionMembership)
      .innerJoin(profile, eq(institutionMembership.companyProfileId, profile.id))
      .leftJoin(user, eq(institutionMembership.requestedById, user.id))
      .where(where)
      .orderBy(desc(institutionMembership.createdAt))
      .limit(limit)
      .offset(offset);

    const [totals] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(institutionMembership)
      .where(where);

    const profileIds = rows.map((r) => r.companyProfileId);
    const provinces = await this.fetchLocations(profileIds);

    return {
      items: rows.map((r) => ({
        id: r.id,
        institutionId: r.institutionId,
        membershipType: r.membershipType,
        status: r.status,
        requestedByName: r.requestedByName,
        approvedAt: r.approvedAt,
        verifiedAt: r.verifiedAt,
        joinedAt: r.joinedAt,
        createdAt: r.createdAt,
        company: {
          profileId: r.companyProfileId,
          slug: r.companySlug,
          name: r.companyName,
          logoUrl: r.companyLogoUrl,
          province: provinces.get(r.companyProfileId) ?? null,
        },
      })),
      total: totals?.total ?? 0,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async fetchCardExtras(rows: Array<{
    id: string;
    profileId: string;
    slug: string;
    name: string;
    tagline: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    organizationType: InstitutionListItem["organizationType"];
    verificationStatus: InstitutionListItem["verificationStatus"];
    operatingScope: InstitutionListItem["operatingScope"];
    acronym: string | null;
    province: string | null;
    district: string | null;
    city: string | null;
    foundedAt: Date | null;
    membersCount: number;
    verifiedMembersCount: number;
    distanceKm?: number | null;
  }>): Promise<InstitutionListItem[]> {
    if (rows.length === 0) return [];
    const profileIds = rows.map((r) => r.profileId);

    const [categories, badges] = await Promise.all([this.fetchCategoriesByProfiles(profileIds), this.fetchBadgesByProfiles(profileIds)]);

    const catByProfile = new Map<string, InstitutionListItem["categories"]>();
    for (const c of categories) {
      const arr = catByProfile.get(c.profileId) ?? [];
      arr.push({ id: c.id, slug: c.slug, name: c.name, isPrimary: c.isPrimary });
      catByProfile.set(c.profileId, arr);
    }
    const badgeByProfile = new Map<string, ProfileBadgeLite[]>();
    for (const b of badges) {
      const arr = badgeByProfile.get(b.profileId) ?? [];
      arr.push({ slug: b.slug, name: b.name, type: b.type });
      badgeByProfile.set(b.profileId, arr);
    }

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      logoUrl: r.logoUrl,
      coverUrl: r.coverUrl,
      organizationType: r.organizationType,
      verificationStatus: r.verificationStatus,
      operatingScope: r.operatingScope,
      acronym: r.acronym,
      province: r.province,
      district: r.district,
      city: r.city,
      foundedYear: r.foundedAt ? r.foundedAt.getFullYear() : null,
      membersCount: r.membersCount,
      verifiedMembersCount: r.verifiedMembersCount,
      categories: catByProfile.get(r.profileId) ?? [],
      badges: badgeByProfile.get(r.profileId) ?? [],
    }));
  }

  private async fetchCategories(profileId: string): Promise<InstitutionPublicView["categories"]> {
    const rows = await this.fetchCategoriesByProfiles([profileId]);
    return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, isPrimary: r.isPrimary }));
  }

  private async fetchCategoriesByProfiles(profileIds: string[]) {
    if (profileIds.length === 0) return [];
    return db
      .select({
        profileId: profileCategory.profileId,
        id: profileCategory.categoryId,
        slug: category.slug,
        name: category.name,
        isPrimary: profileCategory.isPrimary,
      })
      .from(profileCategory)
      .innerJoin(category, eq(profileCategory.categoryId, category.id))
      .where(inArray(profileCategory.profileId, profileIds))
      .orderBy(asc(profileCategory.position));
  }

  private async fetchBadges(profileId: string): Promise<InstitutionPublicView["badges"]> {
    return this.fetchBadgesByProfiles([profileId]).then((rows) => rows.map((r) => ({ slug: r.slug, name: r.name, type: r.type })));
  }

  private async fetchBadgesByProfiles(profileIds: string[]) {
    if (profileIds.length === 0) return [];
    return db
      .select({
        profileId: profileBadge.profileId,
        slug: badge.slug,
        name: badge.name,
        type: badge.type,
      })
      .from(profileBadge)
      .innerJoin(badge, eq(profileBadge.badgeId, badge.id))
      .where(and(inArray(profileBadge.profileId, profileIds), eq(profileBadge.status, "active")));
  }

  private async fetchMembers(institutionId: string): Promise<InstitutionMemberView[]> {
    const rows = await db
      .select({
        membershipId: institutionMembership.id,
        membershipType: institutionMembership.membershipType,
        status: institutionMembership.status,
        joinedAt: institutionMembership.joinedAt,
        verifiedAt: institutionMembership.verifiedAt,
        companyProfileId: profile.id,
        companySlug: profile.slug,
        companyName: profile.name,
        companyLogoUrl: profile.logoUrl,
        companyTagline: profile.tagline,
      })
      .from(institutionMembership)
      .innerJoin(profile, eq(institutionMembership.companyProfileId, profile.id))
      .where(and(eq(institutionMembership.institutionId, institutionId), inArray(institutionMembership.status, ["approved", "verified"]), isNull(profile.deletedAt)))
      .orderBy(asc(institutionMembership.joinedAt));

    if (rows.length === 0) return [];
    const provinces = await this.fetchLocations(rows.map((r) => r.companyProfileId));

    return rows.map((r) => ({
      id: r.membershipId,
      membershipType: r.membershipType,
      status: r.status,
      joinedAt: r.joinedAt,
      verifiedAt: r.verifiedAt,
      company: {
        slug: r.companySlug,
        name: r.companyName,
        logoUrl: r.companyLogoUrl,
        tagline: r.companyTagline,
        province: provinces.get(r.companyProfileId) ?? null,
      },
    }));
  }

  private async fetchLocations(profileIds: string[]) {
    if (profileIds.length === 0) return new Map<string, string | null>();
    const rows = await db
      .select({ profileId: profileLocation.profileId, province: profileLocation.province })
      .from(profileLocation)
      .where(and(inArray(profileLocation.profileId, profileIds), eq(profileLocation.isPrimary, true)));
    return new Map(rows.map((r) => [r.profileId, r.province]));
  }

  // ── Institution managers ───────────────────────────────────────────────

  async findManager(institutionId: string, userId: string): Promise<{ role: InstitutionManagerRole } | null> {
    const [row] = await db
      .select({ role: institutionManager.role })
      .from(institutionManager)
      .where(and(eq(institutionManager.institutionId, institutionId), eq(institutionManager.userId, userId)))
      .limit(1);
    return row ?? null;
  }

  async listManagers(institutionId: string): Promise<InstitutionManagerRow[]> {
    const rows = await db
      .select({
        id: institutionManager.id,
        institutionId: institutionManager.institutionId,
        role: institutionManager.role,
        createdAt: institutionManager.createdAt,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(institutionManager)
      .innerJoin(user, eq(institutionManager.userId, user.id))
      .where(eq(institutionManager.institutionId, institutionId))
      .orderBy(asc(institutionManager.createdAt));
    return rows.map((r) => ({
      id: r.id,
      institutionId: r.institutionId,
      role: r.role,
      createdAt: r.createdAt,
      user: { id: r.userId, name: r.userName, email: r.userEmail, image: r.userImage },
    }));
  }

  async listByManager(userId: string, query: InstitutionsMineQuery): Promise<{ items: InstitutionAdminRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const selectFields = {
      id: institution.id,
      slug: institution.slug,
      name: institution.name,
      profileId: institution.profileId,
      legalName: institution.legalName,
      organizationType: institution.organizationType,
      status: institution.status,
      verificationStatus: institution.verificationStatus,
      verifiedAt: institution.verifiedAt,
      province: institution.province,
      district: institution.district,
      city: institution.city,
      address: institution.address,
      foundedAt: institution.foundedAt,
      acronym: institution.acronym,
      taxId: institution.taxId,
      mission: institution.mission,
      vision: institution.vision,
      operatingScope: institution.operatingScope,
      socialLinks: institution.socialLinks,
      primaryContact: institution.primaryContact,
      verificationDocuments: institution.verificationDocuments,
      createdAt: institution.createdAt,
      logoUrl: profile.logoUrl,
      createdByEmail: user.email,
      membersCount: membersCountSql,
      verifiedMembersCount: verifiedMembersCountSql,
    };

    const [rows, countRows] = await Promise.all([
      db
        .select(selectFields)
        .from(institutionManager)
        .innerJoin(institution, eq(institutionManager.institutionId, institution.id))
        .innerJoin(profile, eq(institution.profileId, profile.id))
        .leftJoin(user, eq(institution.createdById, user.id))
        .where(and(eq(institutionManager.userId, userId), ...(query.status ? [eq(institution.status, query.status)] : [])))
        .orderBy(desc(institution.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(institutionManager)
        .innerJoin(institution, eq(institutionManager.institutionId, institution.id))
        .where(and(eq(institutionManager.userId, userId), ...(query.status ? [eq(institution.status, query.status)] : [])))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return { items: rows as InstitutionAdminRow[], total: countRows };
  }

  async addManager(institutionId: string, userId: string, role: InstitutionManagerRole): Promise<void> {
    await db
      .insert(institutionManager)
      .values({ id: crypto.randomUUID(), institutionId, userId, role });
  }

  async updateManagerRole(managerId: string, role: InstitutionManagerRole): Promise<void> {
    await db
      .update(institutionManager)
      .set({ role, updatedAt: new Date() })
      .where(eq(institutionManager.id, managerId));
  }

  async removeManager(managerId: string): Promise<void> {
    await db.delete(institutionManager).where(eq(institutionManager.id, managerId));
  }

  async findManagerById(managerId: string): Promise<{ id: string; institutionId: string; userId: string; role: InstitutionManagerRole } | null> {
    const [row] = await db
      .select({ id: institutionManager.id, institutionId: institutionManager.institutionId, userId: institutionManager.userId, role: institutionManager.role })
      .from(institutionManager)
      .where(eq(institutionManager.id, managerId))
      .limit(1);
    return row ?? null;
  }

  async countOwners(institutionId: string): Promise<number> {
    const [r] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(institutionManager)
      .where(and(eq(institutionManager.institutionId, institutionId), eq(institutionManager.role, "owner")));
    return r?.count ?? 0;
  }

  async findUserByEmail(email: string): Promise<{ id: string; name: string; email: string; image: string | null } | null> {
    const [row] = await db
      .select({ id: user.id, name: user.name, email: user.email, image: user.image })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    return row ?? null;
  }
}

export const institutionsRepository = new InstitutionsRepository();