import { db, badge, profileBadge, profile, review, follow } from "@workdeal/db";
import { and, eq, sql } from "drizzle-orm";
import { profileColumns } from "../repositories/profiles.repository.js";

/**
 * Job diário de selos automáticos — idempotente.
 * Critérios auditáveis (v0.5):
 * - profile-complete: name+description+category≥1+logoUrl|coverUrl
 * - highly-rated: avg≥4.3 && count≥5
 * - active-member: follows≥10 (proxy; interacções reais virão com tasks/events)
 */
export async function runBadgeJob() {
  // profile-complete
  const profileComplete = await db.select().from(badge).where(eq(badge.slug, "profile-complete")).limit(1).then((r) => r[0]);
  const highlyRated = await db.select().from(badge).where(eq(badge.slug, "highly-rated")).limit(1).then((r) => r[0]);

  if (profileComplete) {
    const candidates = await db
      .select({
        id: profile.id,
        name: profile.name,
        description: profile.description,
        logoUrl: profile.logoUrl,
        coverUrl: profile.coverUrl,
      })
      .from(profile)
      .where(and(eq(profile.status, "active"), sql`${profile.deletedAt} IS NULL`));
    for (const p of candidates) {
      const hasCategory = await db
        .select({ one: sql`1` })
        .from((await import("@workdeal/db")).profileCategory)
        .where(eq((await import("@workdeal/db")).profileCategory.profileId, p.id))
        .limit(1)
        .then((r) => r.length > 0);
      const isComplete = Boolean(p.name && p.description && hasCategory && (p.logoUrl || p.coverUrl));
      const existing = await db
        .select()
        .from(profileBadge)
        .where(and(eq(profileBadge.profileId, p.id), eq(profileBadge.badgeId, profileComplete.id)))
        .limit(1)
        .then((r) => r[0]);
      if (isComplete && !existing) {
        await db.insert(profileBadge).values({ profileId: p.id, badgeId: profileComplete.id, origin: "automatic", status: "active" }).onConflictDoNothing();
      } else if (!isComplete && existing?.status === "active") {
        await db
          .update(profileBadge)
          .set({ status: "revoked", revokedAt: new Date() })
          .where(and(eq(profileBadge.profileId, p.id), eq(profileBadge.badgeId, profileComplete.id)));
      } else if (isComplete && existing?.status === "revoked") {
        await db
          .update(profileBadge)
          .set({ status: "active", revokedAt: null })
          .where(and(eq(profileBadge.profileId, p.id), eq(profileBadge.badgeId, profileComplete.id)));
      }
    }
  }

  // highly-rated: varre perfis com ≥5 reviews e avg≥4.3
  if (highlyRated) {
    const stats = await db
      .select({ profileId: review.profileId, avg: sql<number>`avg(${review.rating})::float`, count: sql<number>`count(*)::int` })
      .from(review)
      .groupBy(review.profileId)
      .having(sql`avg(${review.rating}) >= 4.3 AND count(*) >= 5`);
    for (const s of stats) {
      await db
        .insert(profileBadge)
        .values({ profileId: s.profileId, badgeId: highlyRated.id, origin: "automatic", status: "active" })
        .onConflictDoNothing();
    }
    // revoga quem caiu abaixo
    const toRevoke = await db
      .select({ profileId: review.profileId, avg: sql<number>`avg(${review.rating})::float`, count: sql<number>`count(*)::int` })
      .from(review)
      .groupBy(review.profileId)
      .having(sql`avg(${review.rating}) < 4.3 OR count(*) < 5`);
    for (const s of toRevoke) {
      await db
        .update(profileBadge)
        .set({ status: "revoked", revokedAt: new Date() })
        .where(and(eq(profileBadge.profileId, s.profileId), eq(profileBadge.badgeId, highlyRated.id), eq(profileBadge.status, "active")));
    }
  }
}

export async function ensureProfileCompleteForProfile(profileId: string) {
  const profileComplete = await db.select().from(badge).where(eq(badge.slug, "profile-complete")).limit(1).then((r) => r[0]);
  if (!profileComplete) return;
  const [p] = await db.select(profileColumns).from(profile).where(eq(profile.id, profileId)).limit(1);
  if (!p || p.status !== "active" || p.deletedAt) return;
  const hasCategory = await db
    .select({ one: sql`1` })
    .from((await import("@workdeal/db")).profileCategory)
    .where(eq((await import("@workdeal/db")).profileCategory.profileId, p.id))
    .limit(1)
    .then((r) => r.length > 0);
  const isComplete = Boolean(p.name && p.description && hasCategory && (p.logoUrl || p.coverUrl));
  const [existing] = await db
    .select()
    .from(profileBadge)
    .where(and(eq(profileBadge.profileId, p.id), eq(profileBadge.badgeId, profileComplete.id)))
    .limit(1);
  if (isComplete && !existing) {
    await db.insert(profileBadge).values({ profileId: p.id, badgeId: profileComplete.id, origin: "automatic", status: "active" }).onConflictDoNothing();
  } else if (!isComplete && existing?.status === "active") {
    await db.update(profileBadge).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(profileBadge.profileId, p.id), eq(profileBadge.badgeId, profileComplete.id)));
  } else if (isComplete && existing?.status === "revoked") {
    await db.update(profileBadge).set({ status: "active", revokedAt: null }).where(and(eq(profileBadge.profileId, p.id), eq(profileBadge.badgeId, profileComplete.id)));
  }
}

// Deprecated alias — retrocompatibilidade até migração completa
export const ensurePerfilCompletoForProfile = ensureProfileCompleteForProfile;
