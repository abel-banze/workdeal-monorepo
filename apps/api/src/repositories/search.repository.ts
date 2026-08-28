import { and, asc, desc, eq, exists, ilike, isNull, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db, profile, profileCategory, category, profileLocation } from "@workdeal/db";
import { profileColumns } from "./profiles.repository.js";

export interface SearchParams {
  text: string; // residual para websearch_to_tsquery (já unaccent lower)
  location: { kind: "province"|"district"|"bairro"; value: string; province: string; district: string|null } | null;
  page?: number; limit?: number; status?: string;
}

export interface SearchResultItem { id: string; name: string; slug: string; description: string|null; rank: number; similarity: number; province: string|null; district: string|null; }

export class SearchRepository {
  async matchLocation(raw: string): Promise<SearchParams["location"]> {
    // Usa pg_trgm real em known_locations (unaccent lower)
    try {
      const rows = await db.execute(sql`
        SELECT kind, value, province, district, similarity(value_unaccent, unaccent(lower(${raw}))) AS sim
        FROM known_locations
        WHERE value_unaccent % unaccent(lower(${raw})) OR similarity(value_unaccent, unaccent(lower(${raw}))) > 0.3
        ORDER BY sim DESC, CASE kind WHEN 'bairro' THEN 3 WHEN 'district' THEN 2 ELSE 1 END DESC
        LIMIT 1
      `) as unknown as Array<{kind:string;value:string;province:string;district:string|null;sim:number}>;
      if (rows[0]) return { kind: rows[0].kind as any, value: rows[0].value, province: rows[0].province, district: rows[0].district };
    } catch {}
    return null;
  }

  async search(params: SearchParams): Promise<{ items: any[]; total: number }> {
    const page = params.page ?? 1; const limit = params.limit ?? 20; const offset=(page-1)*limit;
    const conditions: SQL[] = [];
    conditions.push(eq(profile.status, (params.status as any) ?? "active") as unknown as SQL);
    conditions.push(sql`${profile.deletedAt} IS NULL`);

    // Filtro por localização detectada (via profile_location)
    if (params.location) {
      const loc = params.location;
      if (loc.kind==="province") {
        conditions.push(exists(db.select({one: sql`1`}).from(profileLocation).where(and(eq(profileLocation.profileId, profile.id), eq(profileLocation.province, loc.province)))) as unknown as SQL);
      } else if (loc.kind==="district") {
        conditions.push(exists(db.select({one: sql`1`}).from(profileLocation).where(and(eq(profileLocation.profileId, profile.id), eq(profileLocation.district, loc.value)))) as unknown as SQL);
      } else {
        conditions.push(exists(db.select({one: sql`1`}).from(profileLocation).where(and(eq(profileLocation.profileId, profile.id), eq(profileLocation.bairro, loc.value)))) as unknown as SQL);
      }
    }

    let rankQuery: SQL | null = null;
    let useFallbackTrigram = false;
    const raw = (params.text||"").trim();
    if (raw) {
      // websearch_to_tsquery com unaccent
      rankQuery = sql`websearch_to_tsquery('portuguese', unaccent(${raw}))`;
      conditions.push(sql`${profile.searchTsv} @@ ${rankQuery}`);
    }

    const where = and(...conditions as any);

    // Tenta FTS primeiro
    let orderBy: SQL = rankQuery
      ? sql`ts_rank_cd(${profile.searchTsv}, ${rankQuery}) DESC, similarity(unaccent(${profile.name}), unaccent(${raw})) DESC, ${profile.updatedAt} DESC`
      : desc(profile.updatedAt) as unknown as SQL;

    let rows: any[] = []; let total = 0;
    try {
      const sel = db.select({ ...profileColumns, rank: rankQuery ? sql<number>`ts_rank_cd(${profile.searchTsv}, ${rankQuery})`.as("rank") : sql<number>`0`.as("rank"), similarity: raw ? sql<number>`similarity(unaccent(${profile.name}), unaccent(${raw}))`.as("similarity") : sql<number>`0`.as("similarity") }).from(profile).where(where).orderBy(orderBy).limit(limit).offset(offset);
      const cnt = db.select({ count: sql<number>`count(*)::int` }).from(profile).where(where);
      const [r,c] = await Promise.all([sel, cnt]);
      rows = r as any; total = (c as any)[0]?.count ?? 0;
    } catch (e) {
      // fallback se tsvector não existir (dev sem migração)
      rows=[]; total=0;
    }

    // Fallback trigram quando FTS não devolve resultados mas há texto
    if (rows.length===0 && raw) {
      useFallbackTrigram = true;
      const trigCond = or(
        sql`similarity(unaccent(${profile.name}), unaccent(${raw})) > 0.25`,
        sql`similarity(unaccent(coalesce(${profile.description},'')), unaccent(${raw})) > 0.2`,
        ilike(profile.name, `%${raw}%`) as unknown as SQL,
      ) as unknown as SQL;
      const fallbackWhere = params.location
        ? and(where, trigCond) as unknown as SQL
        : trigCond as unknown as SQL;
      // quando sem filtro location, usa trigCond puro para maximizar recall
      const w = params.location ? fallbackWhere : trigCond;
      const fallbackOrder = sql`greatest(similarity(unaccent(${profile.name}), unaccent(${raw})), similarity(unaccent(coalesce(${profile.description},'')), unaccent(${raw})) ) DESC, ${profile.updatedAt} DESC`;
      const sel2 = await db.select({ ...profileColumns, rank: sql<number>`0`.as("rank"), similarity: sql<number>`similarity(unaccent(${profile.name}), unaccent(${raw}))`.as("similarity") }).from(profile).where(w as any).orderBy(fallbackOrder).limit(limit).offset(offset);
      const cnt2 = await db.select({ count: sql<number>`count(*)::int` }).from(profile).where(w as any);
      rows = sel2 as any; total = (cnt2 as any)[0]?.count ?? 0;
    }

    // Enriquecer com categorias e province/district primário (evita N+1, batch)
    const ids = rows.map((r:any)=>r.id);
    const cats = ids.length? await db.select({ profileId: profileCategory.profileId, id: category.id, slug: category.slug, name: category.name, isPrimary: profileCategory.isPrimary }).from(profileCategory).innerJoin(category, eq(profileCategory.categoryId, category.id)).where(sql`${profileCategory.profileId} IN ${sql.raw(`(${ids.map(s=>`'${s.replace(/'/g,"''")}'`).join(",")})`)}`) : [];
    const byProfile = new Map<string, any[]>(); for (const c of cats) { const arr=byProfile.get(c.profileId)??[]; arr.push({id:c.id,slug:c.slug,name:c.name,isPrimary:c.isPrimary}); byProfile.set(c.profileId,arr); }
    const locs = ids.length? await db.select({ profileId: profileLocation.profileId, province: profileLocation.province, district: profileLocation.district }).from(profileLocation).where(and(sql`${profileLocation.profileId} IN ${sql.raw(`(${ids.map(s=>`'${s.replace(/'/g,"''")}'`).join(",")})`)}` as any, eq(profileLocation.isPrimary, true))) : [];
    const locMap = new Map(locs.map(r=>[r.profileId,r]));

    const items = rows.map((r:any)=>({ ...r, categories: byProfile.get(r.id)??[], province: locMap.get(r.id)?.province??null, district: locMap.get(r.id)?.district??null }));
    return { items, total, fallback: useFallbackTrigram } as any;
  }
}
export const searchRepository = new SearchRepository();
