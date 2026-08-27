import { sql } from "drizzle-orm";
import { db } from "../client.js";

/**
 * Helpers PostGIS — usam SQL raw via `sql` do drizzle-orm.
 * A coluna `geom` (geography(Point,4326)) é gerida por migração SQL
 * (CREATE EXTENSION postgis + índice GIST). Não existe no schema Drizzle;
 * todas as escritas/leituras geo usam `sql` raw para evitar customType.
 */

/**
 * Actualiza a coluna `geom` do perfil para o ponto (lng, lat).
 * Usa ST_MakePoint(lng, lat)::geography — ordem lng,lat obrigatória no PostGIS.
 */
export async function updateProfileGeom(
  profileId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await db.execute(
    sql`UPDATE "profile" SET geom = ST_MakePoint(${lng}, ${lat})::geography, updated_at = NOW() WHERE id = ${profileId}`,
  );
}

/**
 * Variante para profile_location — mantém geom sincronizado com latitude/longitude.
 */
export async function updateProfileLocationGeom(
  locationId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await db.execute(
    sql`UPDATE "profile_location" SET geom = ST_MakePoint(${lng}, ${lat})::geography, updated_at = NOW() WHERE id = ${locationId}`,
  );
}

/**
 * Encontra perfis próximos dentro de `radiusMeters` metros do ponto (lat,lng).
 * Usa ST_DWithin para filtro indexado (GIST) e ST_Distance para cálculo/distância.
 * Retorna perfis com coluna extra `distance_meters`.
 *
 * @param lat - latitude do ponto de origem
 * @param lng - longitude do ponto de origem
 * @param radiusMeters - raio em metros
 */
export async function findProfilesNearby(
  lat: number,
  lng: number,
  radiusMeters: number,
) {
  const origin = sql`ST_MakePoint(${lng}, ${lat})::geography`;
  return db.execute(sql`
    SELECT p.*, ST_Distance(p.geom, ${origin}) AS distance_meters
    FROM "profile" p
    WHERE p.status = 'active'
      AND p.geom IS NOT NULL
      AND ST_DWithin(p.geom, ${origin}, ${radiusMeters})
    ORDER BY ST_Distance(p.geom, ${origin}) ASC
  `);
}

/**
 * Helper puro que devolve o fragmento SQL para usar em queries compostas.
 * Útil para construir WHERE/ORDER BY sem duplicar ST_MakePoint.
 */
export function nearbyWhereClause(lat: number, lng: number, radiusMeters: number) {
  const origin = sql`ST_MakePoint(${lng}, ${lat})::geography`;
  return {
    origin,
    dwithin: sql`ST_DWithin(geom, ${origin}, ${radiusMeters})`,
    distance: sql`ST_Distance(geom, ${origin})`,
    orderByDistance: sql`geom <-> ${origin}`,
  };
}
