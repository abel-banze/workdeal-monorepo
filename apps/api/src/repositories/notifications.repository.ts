import { db, member, notification } from "@workdeal/db";
import { and, count, desc, eq, inArray, or, type SQL } from "drizzle-orm";

export const notificationsRepository = {
  async create(data: {
    recipientUserId: string | null;
    recipientOrganizationId: string | null;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    metadata: Record<string, unknown> | null;
  }) {
    const [row] = await db.insert(notification).values({ ...data, status: "unread" }).returning({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      status: notification.status,
      createdAt: notification.createdAt,
    });
    return row ?? null;
  },

  async updateMetadata(id: string, metadata: Record<string, unknown>) {
    await db.update(notification).set({ metadata }).where(eq(notification.id, id));
  },

  /** Organizações onde o utilizador é membro (âmbito do inbox da empresa). */
  async listMemberOrgIds(userId: string): Promise<string[]> {
    const rows = await db.select({ organizationId: member.organizationId }).from(member).where(eq(member.userId, userId));
    return [...new Set(rows.map((r) => r.organizationId))];
  },

  /** Utilizadores membros de uma organização (para direccionar inbox). */
  async listOrgMemberUserIds(organizationId: string): Promise<string[]> {
    const rows = await db.select({ userId: member.userId }).from(member).where(eq(member.organizationId, organizationId));
    return [...new Set(rows.map((r) => r.userId))];
  },

  /** Email de um utilizador (para payloads de email do dispatcher). */
  async findUserContact(userId: string): Promise<{ email: string; name: string } | null> {
    const { user } = await import("@workdeal/db");
    const [row] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1);
    return row ?? null;
  },

  /**
   * Destinatários de um perfil: utilizador dono (perfil pessoal) ou membros
   * da organização (perfil de empresa) — para direccionar o inbox.
   */
  async resolveProfileRecipients(profileId: string): Promise<{ userIds: string[]; organizationId: string | null; profileName: string | null }> {
    const { profile } = await import("@workdeal/db");
    const [p] = await db.select({ userId: profile.userId, organizationId: profile.organizationId, name: profile.name }).from(profile).where(eq(profile.id, profileId)).limit(1);
    if (!p) return { userIds: [], organizationId: null, profileName: null };
    if (p.userId) return { userIds: [p.userId], organizationId: p.organizationId, profileName: p.name };
    if (p.organizationId) return { userIds: await this.listOrgMemberUserIds(p.organizationId), organizationId: p.organizationId, profileName: p.name };
    return { userIds: [], organizationId: null, profileName: p.name };
  },

  /** Telefone de contacto de uma organização (fallback para WhatsApp). */
  async findOrgContactPhone(organizationId: string): Promise<string | null> {
    const { organization } = await import("@workdeal/db");
    const [row] = await db.select({ contactPhone: organization.contactPhone }).from(organization).where(eq(organization.id, organizationId)).limit(1);
    return row?.contactPhone ?? null;
  },

  async list(userId: string, orgIds: string[], query: { unreadOnly?: boolean; page: number; limit: number }) {
    const scope: SQL[] = [eq(notification.recipientUserId, userId)];
    if (orgIds.length > 0) scope.push(inArray(notification.recipientOrganizationId, orgIds));
    const conds: SQL[] = [or(...scope)!];
    if (query.unreadOnly) conds.push(eq(notification.status, "unread"));
    const where = and(...conds);
    const [cntRow] = await db.select({ cnt: count() }).from(notification).where(where);
    const items = await db
      .select({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        status: notification.status,
        createdAt: notification.createdAt,
      })
      .from(notification)
      .where(where)
      .orderBy(desc(notification.createdAt))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async countUnread(userId: string, orgIds: string[]): Promise<number> {
    const scope: SQL[] = [eq(notification.recipientUserId, userId)];
    if (orgIds.length > 0) scope.push(inArray(notification.recipientOrganizationId, orgIds));
    const [row] = await db
      .select({ cnt: count() })
      .from(notification)
      .where(and(or(...scope)!, eq(notification.status, "unread")));
    return row?.cnt ?? 0;
  },

  async findById(id: string) {
    const [row] = await db.select().from(notification).where(eq(notification.id, id)).limit(1);
    return row ?? null;
  },

  async markRead(id: string) {
    const [row] = await db.update(notification).set({ status: "read" }).where(eq(notification.id, id)).returning({ id: notification.id });
    return row ?? null;
  },

  async markAllRead(userId: string, orgIds: string[]): Promise<number> {
    const scope: SQL[] = [eq(notification.recipientUserId, userId)];
    if (orgIds.length > 0) scope.push(inArray(notification.recipientOrganizationId, orgIds));
    const rows = await db
      .update(notification)
      .set({ status: "read" })
      .where(and(or(...scope)!, eq(notification.status, "unread")))
      .returning({ id: notification.id });
    return rows.length;
  },
};
