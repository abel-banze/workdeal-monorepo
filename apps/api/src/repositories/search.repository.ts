import { and, asc, desc, eq, exists, ilike, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db, profile, profileCategory, category, profileLocation, profileBadge, badge } from "@workdeal/db";
import type { ProfileBadgeLite } from "@workdeal/shared";
import { profileColumns } from "./profiles.repository.js";
import { boundingBox } from "@workdeal/shared/lib/geo";

export interface SearchLocation {
  kind: "province" | "district" | "bairro";
  value: string;
  province: string;
  district: string | null;
}

export interface SearchNear {
  latitude: number;
  longitude: number;
}

export interface SearchParams {
  /** Texto residual para websearch_to_tsquery (já unaccent lower). Vazio → só filtros estruturados. */
  text: string;
  location: SearchLocation | null;
  categoryId?: string;
  near?: SearchNear | null;
  radiusKm?: number;
  sort?: "recent" | "name" | "distance";
  page?: number;
  limit?: number;
  status?: string;
}

export class SearchRepository {
  async matchLocation(raw: string): Promise<SearchLocation | null> {
    // Usa pg_trgm real em known_locations (unaccent lower)
    try {
      const rows = await db.execute(sql`
        SELECT kind, value, province, district, similarity(value_unaccent, unaccent(lower(${raw}))) AS sim
        FROM known_locations
        WHERE value_unaccent % unaccent(lower(${raw})) OR similarity(value_unaccent, unaccent(lower(${raw}))) > 0.3
        ORDER BY sim DESC, CASE kind WHEN 'bairro' THEN 3 WHEN 'district' THEN 2 ELSE 1 END DESC
        LIMIT 1
      `) as unknown as Array<{ kind: string; value: string; province: string; district: string | null; sim: number }>;
      if (rows[0]) return { kind: rows[0].kind as any, value: rows[0].value, province: rows[0].province, district: rows[0].district };
    } catch {}
    return null;
  }

  async search(params: SearchParams): Promise<{ items: any[]; total: number; fallback: boolean }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    // Filtros base (status + soft-delete) + filtros estruturados (location,
    // categoria, raio). Mantidos à parte do FTS para o fallback trigram: o
    // termo que não deu FTS nunca é re-filtrado, mas os filtros estruturados
    // continuam sempre aplicados.
    const base: SQL[] = [];
    base.push(eq(profile.status, (params.status as any) ?? "active") as unknown as SQL);
    base.push(sql`${profile.deletedAt} IS NULL`);

    // Filtro por localização detectada (via profile_location)
    if (params.location) {
      const loc = params.location;
      if (loc.kind === "province") {
        base.push(
          exists(db.select({ one: sql`1` }).from(profileLocation).where(and(eq(profileLocation.profileId, profile.id), eq(profileLocation.province, loc.province)))) as unknown as SQL,
        );
      } else if (loc.kind === "district") {
        base.push(
          exists(db.select({ one: sql`1` }).from(profileLocation).where(and(eq(profileLocation.profileId, profile.id), eq(profileLocation.district, loc.value)))) as unknown as SQL,
        );
      } else {
        base.push(
          exists(db.select({ one: sql`1` }).from(profileLocation).where(and(eq(profileLocation.profileId, profile.id), eq(profileLocation.bairro, loc.value)))) as unknown as SQL,
        );
      }
    }

    if (params.categoryId) {
      base.push(
        exists(
          db.select({ one: sql`1` }).from(profileCategory).where(and(eq(profileCategory.profileId, profile.id), eq(profileCategory.categoryId, params.categoryId))),
        ) as unknown as SQL,
      );
    }

    const nearCoords: SearchNear | null = params.near ?? null;
    if (nearCoords) {
      const radius = params.radiusKm ?? 25;
      const box = boundingBox(nearCoords, radius);
      base.push(sql`${profile.latitude} BETWEEN ${box.minLat} AND ${box.maxLat}`);
      base.push(sql`${profile.longitude} BETWEEN ${box.minLng} AND ${box.maxLng}`);
      base.push(sql`${profile.latitude} IS NOT NULL AND ${profile.longitude} IS NOT NULL`);
    }

    let rankQuery: SQL | null = null;
    let useFallbackTrigram = false;
    const raw = (params.text || "").trim();

    const baseWhere: SQL | undefined = and(...(base as any)) as unknown as SQL | undefined;
    let where: SQL | undefined = baseWhere;
    if (raw) {
      // websearch_to_tsquery com unaccent
      rankQuery = sql`websearch_to_tsquery('portuguese', unaccent(${raw}))`;
      where = and(baseWhere, sql`${profile.searchTsv} @@ ${rankQuery}`) as unknown as SQL;
    }

    let orderBy: SQL;
    if (params.sort === "name") {
      orderBy = asc(profile.name) as unknown as SQL;
    } else if (params.sort === "distance" && nearCoords) {
      orderBy = sql`ST_Distance(${sql.raw('"profile"."geom"')}, ST_SetSRID(ST_MakePoint(${nearCoords.longitude}, ${nearCoords.latitude}), 4326)::geography) ASC`;
    } else if (rankQuery) {
      orderBy = sql`ts_rank_cd(${profile.searchTsv}, ${rankQuery}) DESC, similarity(unaccent(${profile.name}), unaccent(${raw})) DESC, ${profile.updatedAt} DESC`;
    } else {
      orderBy = desc(profile.updatedAt) as unknown as SQL;
    }

    const selectColumns = {
      ...profileColumns,
      rank: rankQuery
        ? sql<number>`ts_rank_cd(${profile.searchTsv}, ${rankQuery})`.as("rank")
        : sql<number>`0`.as("rank"),
      similarity: raw
        ? sql<number>`similarity(unaccent(${profile.name}), unaccent(${raw}))`.as("similarity")
        : sql<number>`0`.as("similarity"),
      ...(nearCoords
        ? {
            distanceKm: sql<number>`ST_Distance(${sql.raw('"profile"."geom"')}, ST_SetSRID(ST_MakePoint(${nearCoords.longitude}, ${nearCoords.latitude}), 4326)::geography) / 1000.0`.as("distanceKm"),
          }
        : {}),
    };

    // Tenta FTS primeiro
    let rows: any[] = [];
    let total = 0;
    try {
      const sel = db.select(selectColumns as any).from(profile).where(where as any).orderBy(orderBy).limit(limit).offset(offset);
      const cnt = db.select({ count: sql<number>`count(*)::int` }).from(profile).where(where as any);
      const [r, c] = await Promise.all([sel, cnt]);
      rows = r as any;
      total = (c as any)[0]?.count ?? 0;
    } catch {
      // fallback se tsvector não existir (dev sem migração)
      rows = [];
      total = 0;
    }

    // Fallback trigram quando FTS não devolve resultados mas há texto
    if (rows.length === 0 && raw) {
      useFallbackTrigram = true;
      const trigCond = or(
        sql`similarity(unaccent(${profile.name}), unaccent(${raw})) > 0.25`,
        sql`similarity(unaccent(coalesce(${profile.description},'')), unaccent(${raw})) > 0.2`,
        ilike(profile.name, `%${raw}%`) as unknown as SQL,
      ) as unknown as SQL;
      // Mantém filtros estruturados (location/categoria/raio), mas SEM a condição
      // FTS que falhou; sem filtros estruturados usa trigCond puro para recall máximo
      const hasStructuredFilters = base.length > 2;
      const w = (hasStructuredFilters ? and(baseWhere, trigCond) : trigCond) as unknown as SQL;
      const fallbackOrder =
        params.sort === "name"
          ? (asc(profile.name) as unknown as SQL)
          : params.sort === "distance" && nearCoords
            ? (sql`ST_Distance(${sql.raw('"profile"."geom"')}, ST_SetSRID(ST_MakePoint(${nearCoords.longitude}, ${nearCoords.latitude}), 4326)::geography) ASC` as unknown as SQL)
            : (sql`greatest(similarity(unaccent(${profile.name}), unaccent(${raw})), similarity(unaccent(coalesce(${profile.description},'')), unaccent(${raw})) ) DESC, ${profile.updatedAt} DESC` as unknown as SQL);
      const sel2 = db.select(selectColumns as any).from(profile).where(w as any).orderBy(fallbackOrder).limit(limit).offset(offset);
      const cnt2 = db.select({ count: sql<number>`count(*)::int` }).from(profile).where(w as any);
      const [r2, c2] = await Promise.all([sel2, cnt2]);
      rows = r2 as any;
      total = (c2 as any)[0]?.count ?? 0;
    }

    // Enriquecer com categorias e province/district primário (evita N+1, batch)
    const ids = rows.map((r: any) => r.id);
    const cats = ids.length
      ? await db
          .select({
            profileId: profileCategory.profileId,
            id: category.id,
            slug: category.slug,
            name: category.name,
            isPrimary: profileCategory.isPrimary,
          })
          .from(profileCategory)
          .innerJoin(category, eq(profileCategory.categoryId, category.id))
          .where(sql`${profileCategory.profileId} IN ${sql.raw(`(${ids.map((s) => `'${s.replace(/'/g, "''")}'`).join(",")})`)}`)
      : [];
    const byProfile = new Map<string, any[]>();
    for (const c of cats) {
      const arr = byProfile.get(c.profileId) ?? [];
      arr.push({ id: c.id, slug: c.slug, name: c.name, isPrimary: c.isPrimary });
      byProfile.set(c.profileId, arr);
    }
    const locs = ids.length
      ? await db
          .select({
            profileId: profileLocation.profileId,
            province: profileLocation.province,
            district: profileLocation.district,
          })
          .from(profileLocation)
          .where(and(sql`${profileLocation.profileId} IN ${sql.raw(`(${ids.map((s) => `'${s.replace(/'/g, "''")}'`).join(",")})`)}` as any, eq(profileLocation.isPrimary, true)))
      : [];
    const locMap = new Map(locs.map((r) => [r.profileId, r]));

    // Badges ativos por perfil — badges xs do company-card (evita N+1, 1 query extra)
    const badges = ids.length
      ? await db
          .select({
            profileId: profileBadge.profileId,
            slug: badge.slug,
            name: badge.name,
            type: badge.type,
          })
          .from(profileBadge)
          .innerJoin(badge, eq(profileBadge.badgeId, badge.id))
          .where(and(sql`${profileBadge.profileId} IN ${sql.raw(`(${ids.map((s) => `'${s.replace(/'/g, "''")}'`).join(",")})`)}` as any, eq(profileBadge.status, "active")))
      : [];
    const badgeByProfile = new Map<string, ProfileBadgeLite[]>();
    for (const b of badges) {
      const arr = badgeByProfile.get(b.profileId) ?? [];
      arr.push({ slug: b.slug, name: b.name, type: b.type });
      badgeByProfile.set(b.profileId, arr);
    }

    const items = rows.map((r: any) => ({
      ...r,
      categories: byProfile.get(r.id) ?? [],
      province: locMap.get(r.id)?.province ?? null,
      district: locMap.get(r.id)?.district ?? null,
      badges: badgeByProfile.get(r.id) ?? [],
    }));
    return { items, total, fallback: useFallbackTrigram } as any;
  }
}
export const searchRepository = new SearchRepository();