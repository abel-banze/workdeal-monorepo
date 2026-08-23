import { and, eq, sql } from "drizzle-orm";
import { db, profileLocation } from "@workdeal/db";

export class ProfileLocationRepository {
  async create(data: typeof profileLocation.$inferInsert) {
    // P1-1: se isPrimary, remove principal anterior
    if (data.isPrimary) {
      await db
        .update(profileLocation)
        .set({ isPrimary: false })
        .where(and(eq(profileLocation.profileId, data.profileId), eq(profileLocation.isPrimary, true)));
    }
    const [row] = await db.insert(profileLocation).values(data).returning();
    if (row && data.latitude != null && data.longitude != null) {
      await db.execute(sql`UPDATE ${profileLocation} SET geom = ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)::geography WHERE ${profileLocation.id} = ${row.id}`);
    }
    return row;
  }
  async listByProfile(profileId: string) {
    return db
      .select()
      .from(profileLocation)
      .where(eq(profileLocation.profileId, profileId))
      .orderBy(sql`${profileLocation.isPrimary} DESC`, profileLocation.createdAt);
  }
  async findById(id: string) {
    const [row] = await db.select().from(profileLocation).where(eq(profileLocation.id, id)).limit(1);
    return row ?? null;
  }
  async findPrimary(profileId: string) {
    const [row] = await db
      .select()
      .from(profileLocation)
      .where(and(eq(profileLocation.profileId, profileId), eq(profileLocation.isPrimary, true)))
      .limit(1);
    return row ?? null;
  }
  async update(id: string, data: Partial<typeof profileLocation.$inferInsert>) {
    // P1-1: se isPrimary true, desmarca outras
    if (data.isPrimary) {
      const [existing] = await db.select({ profileId: profileLocation.profileId }).from(profileLocation).where(eq(profileLocation.id, id)).limit(1);
      if (existing) {
        await db
          .update(profileLocation)
          .set({ isPrimary: false })
          .where(and(eq(profileLocation.profileId, existing.profileId), eq(profileLocation.isPrimary, true)));
      }
    }
    const [row] = await db.update(profileLocation).set({ ...data, updatedAt: new Date() } as unknown as Record<string, unknown>).where(eq(profileLocation.id, id)).returning();
    if (row) {
      // sync geom
      if (data.latitude !== undefined || data.longitude !== undefined) {
        const lat = (data.latitude as number | null | undefined) ?? row.latitude;
        const lng = (data.longitude as number | null | undefined) ?? row.longitude;
        if (lat != null && lng != null) {
          await db.execute(sql`UPDATE ${profileLocation} SET geom = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography WHERE ${profileLocation.id} = ${id}`);
        } else {
          await db.execute(sql`UPDATE ${profileLocation} SET geom = NULL WHERE ${profileLocation.id} = ${id}`);
        }
      }
    }
    return row ?? null;
  }
  async delete(id: string) {
    const [row] = await db.delete(profileLocation).where(eq(profileLocation.id, id)).returning();
    return row ?? null;
  }
}
export const profileLocationRepository = new ProfileLocationRepository();
