import { and, asc, desc, eq, exists, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db, profile, profileCategory, category } from "@workdeal/db";
import type { ListProfilesQuery } from "@workdeal/shared";
import { boundingBox, isValidCoordinates } from "@workdeal/shared/lib/geo";

/**
 * Colunas seguras para SELECT — exclui geom (geography) e searchTsv (tsvector)
 * que o Drizzle não consegue serializar como texto. Estes campos são usados
 * apenas em SQL raw para ordenação por distância e busca full-text.
 */
export const profileColumns = {
  id: profile.id,
  type: profile.type,
  userId: profile.userId,
  organizationId: profile.organizationId,
  slug: profile.slug,
  name: profile.name,
  tagline: profile.tagline,
  description: profile.description,
  logoUrl: profile.logoUrl,
  coverUrl: profile.coverUrl,
  latitude: profile.latitude,
  longitude: profile.longitude,
  whatsapp: profile.whatsapp,
  phone: profile.phone,
  email: profile.email,
  website: profile.website,
  googlePlaceId: profile.googlePlaceId,
  formattedAddress: profile.formattedAddress,
  businessHours: profile.businessHours,
  status: profile.status,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
  deletedAt: profile.deletedAt,
} as const;

type ProfileRow = typeof profile.$inferSelect;
type CategoryRow = typeof category.$inferSelect;

export interface ProfileCategoryLink {
  profileId: string;
  categoryId: string;
  isPrimary: boolean;
  position: number;
}

export interface ProfileWithCategories extends ProfileRow {
  categories: Array<{ id: string; slug: string; name: string; isPrimary: boolean }>;
}

class ProfilesRepository {
  async createProfileWithCategories(
    data: typeof profile.$inferInsert,
    categories: CategoryRow[],
  ): Promise<ProfileWithCategories> {
    return db.transaction(async (tx) => {
      const id = crypto.randomUUID();
      await tx.insert(profile).values({ id, ...data });
      // P0-7: mantém geom em sincronia com latitude/longitude (PostGIS)
      if (data.latitude != null && data.longitude != null) {
        await tx.execute(sql`UPDATE ${profile} SET geom = ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)::geography WHERE ${profile.id} = ${id}`);
      }
      await this.insertCategories(tx, id, categories);
      const [row] = await tx.select(profileColumns).from(profile).where(eq(profile.id, id)).limit(1);
      if (!row) throw new Error("Falha ao criar perfil");
      const links = categories.map((cat, i) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        isPrimary: i === 0,
      }));
      return { ...row, categories: links };
    });
  }

  async updateProfileAndCategories(
    profileId: string,
    data: Partial<ProfileRow>,
    categories: CategoryRow[] | undefined,
  ): Promise<ProfileWithCategories | null> {
    return db.transaction(async (tx) => {
      await tx.update(profile).set(data).where(eq(profile.id, profileId));
      // P0-7: sincroniza geom se latitude/longitude foram atualizados
      const lat = (data.latitude as number | null | undefined);
      const lng = (data.longitude as number | null | undefined);
      if (lat != null && lng != null && (data.latitude !== undefined || data.longitude !== undefined)) {
        await tx.execute(sql`UPDATE ${profile} SET geom = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography WHERE ${profile.id} = ${profileId}`);
      } else if ((data.latitude === null || data.longitude === null) && (data.latitude !== undefined || data.longitude !== undefined)) {
        await tx.execute(sql`UPDATE ${profile} SET geom = NULL WHERE ${profile.id} = ${profileId}`);
      }
      if (categories) {
        await tx.delete(profileCategory).where(eq(profileCategory.profileId, profileId));
        await this.insertCategories(tx, profileId, categories);
      }
      const [row] = await tx.select(profileColumns).from(profile).where(eq(profile.id, profileId)).limit(1);
      if (!row) return null;
      const links = await tx
        .select({ id: category.id, slug: category.slug, name: category.name, isPrimary: profileCategory.isPrimary })
        .from(profileCategory)
        .innerJoin(category, eq(profileCategory.categoryId, category.id))
        .where(eq(profileCategory.profileId, profileId))
        .orderBy(asc(profileCategory.position));
      return { ...row, categories: links };
    });
  }

  async findBySlug(slug: string, opts: { includeDeleted: boolean } = { includeDeleted: false }): Promise<ProfileWithCategories | null> {
    const cond = opts.includeDeleted ? eq(profile.slug, slug) : and(eq(profile.slug, slug), isNull(profile.deletedAt));
    const [row] = await db.select(profileColumns).from(profile).where(cond).limit(1);
    if (!row) return null;
    return { ...row, categories: await this.findCategoriesForProfile(row.id) };
  }

  async findByUserId(userId: string): Promise<ProfileRow | null> {
    const [row] = await db.select(profileColumns).from(profile).where(eq(profile.userId, userId)).limit(1);
    return row ?? null;
  }

  async findByOrganizationId(organizationId: string): Promise<ProfileRow | null> {
    const [row] = await db.select(profileColumns).from(profile).where(eq(profile.organizationId, organizationId)).limit(1);
    return row ?? null;
  }

  async slugExists(slug: string): Promise<boolean> {
    const [row] = await db.select({ id: profile.id }).from(profile).where(eq(profile.slug, slug)).limit(1);
    return row !== undefined;
  }

  async softDelete(profileId: string): Promise<void> {
    await db.update(profile).set({ deletedAt: new Date() }).where(eq(profile.id, profileId));
  }

  async findCategoriesByIds(ids: string[]): Promise<CategoryRow[]> {
    if (ids.length === 0) return [];
    return db.select().from(category).where(and(inArray(category.id, ids), eq(category.isActive, true)));
  }

  async listActiveCategories(): Promise<CategoryRow[]> {
    return db
      .select()
      .from(category)
      .where(eq(category.isActive, true))
      .orderBy(asc(category.name));
  }

  async listProfiles(query: ListProfilesQuery): Promise<{ items: ProfileWithCategories[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql> | undefined)[] = [];

    conditions.push(eq(profile.status, query.status ?? "active"));
    conditions.push(isNull(profile.deletedAt));

    if (query.q) {
      const raw = query.q.trim();
      // P2-1: tsvector quando tem ≥2 termos ou >3 chars, senão ilike trigram (fallback)
      if (raw.includes(" ") || raw.length > 3) {
        conditions.push(sql`${profile.searchTsv} @@ plainto_tsquery('portuguese', ${raw})`);
      } else {
        const term = `%${raw}%`;
        conditions.push(or(ilike(profile.name, term), ilike(profile.description, term), ilike(profile.slug, term)) as unknown as ReturnType<typeof eq>);
      }
    }

    if (query.categoryId) {
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(profileCategory)
            .where(and(eq(profileCategory.profileId, profile.id), eq(profileCategory.categoryId, query.categoryId))),
        ),
      );
    } else if (query.categorySlug) {
      const cat = await db.select({ id: category.id }).from(category).where(eq(category.slug, query.categorySlug)).limit(1);
      if (!cat[0]) return { items: [], total: 0 };
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(profileCategory)
            .where(and(eq(profileCategory.profileId, profile.id), eq(profileCategory.categoryId, cat[0].id))),
        ),
      );
    }

    let nearCoords: { latitude: number; longitude: number } | null = null;
    if (query.near) {
      const [latStr, lngStr] = query.near.split(",");
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!isValidCoordinates(lat, lng)) {
        // Validação já feita pelo Zod, mas guarda defensiva
        throw new Error("Coordenadas near inválidas");
      }
      nearCoords = { latitude: lat, longitude: lng };
      const radius = query.radiusKm ?? 25;
      const box = boundingBox(nearCoords, radius);
      conditions.push(sql`${profile.latitude} BETWEEN ${box.minLat} AND ${box.maxLat}`);
      conditions.push(sql`${profile.longitude} BETWEEN ${box.minLng} AND ${box.maxLng}`);
      conditions.push(sql`${profile.latitude} IS NOT NULL AND ${profile.longitude} IS NOT NULL`);
    }

    const where = and(...(conditions.filter(Boolean) as unknown as Parameters<typeof and>[0][]));

    const orderBy =
      query.sort === "name"
        ? asc(profile.name)
        : query.sort === "distance" && nearCoords
          ? sql`ST_Distance(${sql.raw('"profile"."geom"')}, ST_SetSRID(ST_MakePoint(${nearCoords.longitude}, ${nearCoords.latitude}), 4326)::geography) ASC`
          : desc(profile.updatedAt);

    const [rows, countRows] = await Promise.all([
      db.select(profileColumns).from(profile).where(where).orderBy(orderBy).limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(profile)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    // Evita N+1: busca categorias de todos os perfis de uma vez
    const ids = rows.map((r) => r.id);
    const allLinks =
      ids.length === 0
        ? []
        : await db
            .select({
              profileId: profileCategory.profileId,
              id: category.id,
              slug: category.slug,
              name: category.name,
              isPrimary: profileCategory.isPrimary,
              position: profileCategory.position,
            })
            .from(profileCategory)
            .innerJoin(category, eq(profileCategory.categoryId, category.id))
            .where(inArray(profileCategory.profileId, ids))
            .orderBy(asc(profileCategory.position));

    const byProfile = new Map<string, ProfileWithCategories["categories"]>();
    for (const l of allLinks) {
      const arr = byProfile.get(l.profileId) ?? [];
      arr.push({ id: l.id, slug: l.slug, name: l.name, isPrimary: l.isPrimary });
      byProfile.set(l.profileId, arr);
    }

    const items: ProfileWithCategories[] = rows.map((r) => ({
      ...r,
      categories: byProfile.get(r.id) ?? [],
    }));

    return { items, total: countRows };
  }

  private async insertCategories(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    profileId: string,
    categories: CategoryRow[],
  ): Promise<void> {
    if (categories.length === 0) return;
    const rows: ProfileCategoryLink[] = categories.map((cat, i) => ({
      profileId,
      categoryId: cat.id,
      isPrimary: i === 0,
      position: i,
    }));
    await tx.insert(profileCategory).values(rows);
  }

  private async findCategoriesForProfile(profileId: string): Promise<ProfileWithCategories["categories"]> {
    return db
      .select({ id: category.id, slug: category.slug, name: category.name, isPrimary: profileCategory.isPrimary })
      .from(profileCategory)
      .innerJoin(category, eq(profileCategory.categoryId, category.id))
      .where(eq(profileCategory.profileId, profileId))
      .orderBy(asc(profileCategory.position));
  }
}

export const profilesRepository = new ProfilesRepository();
