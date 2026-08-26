import { sql } from "drizzle-orm";
import { db } from "../client.js";

/**
 * Actualiza a coluna PostGIS `geom` (geography(Point,4326)) a partir de lat/lng.
 * A coluna `geom` NÃO existe no pgTable Drizzle (removida para evitar drift no drizzle-kit push)
 * e é gerida exclusivamente via SQL raw + trigger/migrações (0002 + 0014).
 * Usa ST_MakePoint(lng, lat) ::geography — ordem (lng, lat) é obrigatória.
 */
export async function updateProfileGeom(
  profileId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await db.execute(sql`
    UPDATE "profile"
    SET "geom" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    WHERE "id" = ${profileId}
  `);
}

export async function updateProfileLocationGeom(
  locationId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await db.execute(sql`
    UPDATE "profile_location"
    SET "geom" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    WHERE "id" = ${locationId}
  `);
}

export type NearbyProfile = {
  id: string;
  slug: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  distance_m: number;
};

/**
 * Busca perfis dentro de um raio (metros) a partir de um ponto.
 * Usa índice GiST `profile_geom_gist_idx` via ST_DWithin e retorna distância via ST_Distance.
 * Requer que `geom` tenha sido preenchido (trigger 0003_search_tsv.sql ou updateProfileGeom).
 */
export async function findProfilesNearby(
  lat: number,
  lng: number,
  radiusMeters: number,
  opts?: { limit?: number; offset?: number },
): Promise<NearbyProfile[]> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const result = await db.execute(sql<NearbyProfile>`
    SELECT
      p."id",
      p."slug",
      p."name",
      p."latitude",
      p."longitude",
      ST_Distance(
        p."geom",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) AS "distance_m"
    FROM "profile" p
    WHERE p."geom" IS NOT NULL
      AND ST_DWithin(
        p."geom",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
    ORDER BY "distance_m" ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  // drizzle node-postgres retorna { rows: T[] } via db.execute
  // @ts-ignore - tipagem depende do driver
  return (result as unknown as { rows: NearbyProfile[] }).rows ?? (result as unknown as NearbyProfile[]);
}

export type NearbyProfileLocation = {
  id: string;
  profileId: string;
  label: string | null;
  province: string;
  distance_m: number;
};

export async function findProfileLocationsNearby(
  lat: number,
  lng: number,
  radiusMeters: number,
  opts?: { limit?: number },
): Promise<NearbyProfileLocation[]> {
  const limit = opts?.limit ?? 50;

  const result = await db.execute(sql<NearbyProfileLocation>`
    SELECT
      pl."id",
      pl."profile_id" AS "profileId",
      pl."label",
      pl."province",
      ST_Distance(
        pl."geom",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) AS "distance_m"
    FROM "profile_location" pl
    WHERE pl."geom" IS NOT NULL
      AND ST_DWithin(
        pl."geom",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
    ORDER BY "distance_m" ASC
    LIMIT ${limit}
  `);

  // @ts-ignore
  return (result as unknown as { rows: NearbyProfileLocation[] }).rows ?? (result as unknown as NearbyProfileLocation[]);
}
