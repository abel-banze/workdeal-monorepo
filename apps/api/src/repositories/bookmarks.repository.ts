import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db, member, profile, profileBookmark, user } from "@workdeal/db";

export type BookmarkOwner =
  | { kind: "personal"; userId: string }
  | { kind: "organization"; userId: string; organizationId: string };

function scopeCondition(owner: BookmarkOwner) {
  return owner.kind === "personal"
    ? and(eq(profileBookmark.userId, owner.userId), isNull(profileBookmark.organizationId))
    : eq(profileBookmark.organizationId, owner.organizationId);
}

export const bookmarksRepository = {
  async isMemberOf(userId: string, organizationId: string): Promise<boolean> {
    const rows = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1);
    return rows.length > 0;
  },

  async bookmark(userId: string, profileId: string, organizationId: string | null) {
    if (organizationId) {
      await db
        .insert(profileBookmark)
        .values({ userId, profileId, organizationId })
        .onConflictDoNothing({
          target: [profileBookmark.profileId, profileBookmark.organizationId],
          where: isNotNull(profileBookmark.organizationId),
        });
    } else {
      await db
        .insert(profileBookmark)
        .values({ userId, profileId, organizationId: null })
        .onConflictDoNothing({
          target: [profileBookmark.userId, profileBookmark.profileId],
          where: isNull(profileBookmark.organizationId),
        });
    }
  },

  async unbookmark(userId: string, profileId: string, organizationId: string | null) {
    if (organizationId) {
      await db
        .delete(profileBookmark)
        .where(
          and(eq(profileBookmark.profileId, profileId), eq(profileBookmark.organizationId, organizationId)),
        );
    } else {
      await db
        .delete(profileBookmark)
        .where(
          and(
            eq(profileBookmark.userId, userId),
            eq(profileBookmark.profileId, profileId),
            isNull(profileBookmark.organizationId),
          ),
        );
    }
  },

  async toggle(userId: string, profileId: string, organizationId: string | null): Promise<boolean> {
    const current = await this.isBookmarked(userId, profileId, organizationId);
    if (current) {
      await this.unbookmark(userId, profileId, organizationId);
    } else {
      await this.bookmark(userId, profileId, organizationId);
    }
    return !current;
  },

  async isBookmarked(userId: string, profileId: string, organizationId: string | null): Promise<boolean> {
    const owner: BookmarkOwner =
      organizationId != null
        ? { kind: "organization", userId, organizationId }
        : { kind: "personal", userId };
    const [row] = await db
      .select({ id: profileBookmark.id })
      .from(profileBookmark)
      .where(and(eq(profileBookmark.profileId, profileId), scopeCondition(owner)))
      .limit(1);
    return !!row;
  },

  async listByOwner(owner: BookmarkOwner) {
    return db
      .select({
        profileId: profileBookmark.profileId,
        createdAt: profileBookmark.createdAt,
        savedByUserId: profileBookmark.userId,
        savedByName: user.name,
        profile: {
          id: profile.id,
          slug: profile.slug,
          name: profile.name,
          tagline: profile.tagline,
          logoUrl: profile.logoUrl,
          type: profile.type,
          status: profile.status,
        },
      })
      .from(profileBookmark)
      .innerJoin(profile, eq(profile.id, profileBookmark.profileId))
      .innerJoin(user, eq(user.id, profileBookmark.userId))
      .where(scopeCondition(owner))
      .orderBy(desc(profileBookmark.createdAt));
  },

  /** Compat: guardados pessoais do utilizador. */
  async listByUser(userId: string) {
    return this.listByOwner({ kind: "personal", userId });
  },
};
