import { db, broadcastCampaign, broadcastRecipient, organization, profile } from "@workdeal/db";
import { and, count, desc, eq } from "drizzle-orm";

export const broadcastRepository = {
  async createCampaign(data: {
    title: string;
    channel: "whatsapp" | "email" | "sms";
    templateKey: string | null;
    subject: string | null;
    bodyHtml: string | null;
    createdByUserId: string;
  }) {
    const [row] = await db.insert(broadcastCampaign).values({ ...data, status: "draft" }).returning();
    return row ?? null;
  },

  async findCampaignById(id: string) {
    const [row] = await db.select().from(broadcastCampaign).where(eq(broadcastCampaign.id, id)).limit(1);
    return row ?? null;
  },

  async listCampaigns(page: number, limit: number) {
    const [cntRow] = await db.select({ cnt: count() }).from(broadcastCampaign);
    const items = await db.select().from(broadcastCampaign).orderBy(desc(broadcastCampaign.createdAt)).limit(limit).offset((page - 1) * limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async setStatus(id: string, status: "draft" | "ready" | "sending" | "sent") {
    const [row] = await db.update(broadcastCampaign).set({ status, updatedAt: new Date() }).where(eq(broadcastCampaign.id, id)).returning();
    return row ?? null;
  },

  async setTotals(id: string, total: number) {
    await db.update(broadcastCampaign).set({ totalRecipients: total, sentCount: 0, failedCount: 0, updatedAt: new Date() }).where(eq(broadcastCampaign.id, id));
  },

  async addCounts(id: string, sent: number, failed: number) {
    const [row] = await db.select({ sentCount: broadcastCampaign.sentCount, failedCount: broadcastCampaign.failedCount }).from(broadcastCampaign).where(eq(broadcastCampaign.id, id)).limit(1);
    if (!row) return;
    await db
      .update(broadcastCampaign)
      .set({ sentCount: (row.sentCount ?? 0) + sent, failedCount: (row.failedCount ?? 0) + failed, updatedAt: new Date() })
      .where(eq(broadcastCampaign.id, id));
  },

  /** Todas as empresas com contacto (para materializar a audiência). */
  async listAllCompanyContacts(): Promise<{ organizationId: string; name: string; contactPhone: string | null; contactEmail: string | null; profileWhatsapp: string | null; profilePhone: string | null; profileEmail: string | null }[]> {
    const rows = await db
      .select({
        organizationId: organization.id,
        name: organization.name,
        contactPhone: organization.contactPhone,
        contactEmail: organization.contactEmail,
        profileWhatsapp: profile.whatsapp,
        profilePhone: profile.phone,
        profileEmail: profile.email,
      })
      .from(organization)
      .leftJoin(profile, eq(profile.organizationId, organization.id));
    return rows;
  },

  async insertRecipients(campaignId: string, rows: { organizationId: string | null; address: string; companyName: string | null }[]) {
    if (rows.length === 0) return 0;
    // Chunks para não rebentar o limite de parâmetros
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const res = await db.insert(broadcastRecipient).values(chunk.map((r) => ({ campaignId, ...r, status: "pending" as const }))).onConflictDoNothing().returning({ id: broadcastRecipient.id });
      inserted += res.length;
    }
    return inserted;
  },

  async takePending(campaignId: string, limit: number) {
    const rows = await db
      .select()
      .from(broadcastRecipient)
      .where(and(eq(broadcastRecipient.campaignId, campaignId), eq(broadcastRecipient.status, "pending")))
      .orderBy(broadcastRecipient.createdAt)
      .limit(limit);
    return rows;
  },

  async countPending(campaignId: string): Promise<number> {
    const [row] = await db
      .select({ cnt: count() })
      .from(broadcastRecipient)
      .where(and(eq(broadcastRecipient.campaignId, campaignId), eq(broadcastRecipient.status, "pending")));
    return row?.cnt ?? 0;
  },

  async markSent(id: string) {
    await db.update(broadcastRecipient).set({ status: "sent", error: null, sentAt: new Date() }).where(eq(broadcastRecipient.id, id));
  },

  async markFailed(id: string, error: string) {
    await db.update(broadcastRecipient).set({ status: "failed", error: error.slice(0, 500) }).where(eq(broadcastRecipient.id, id));
  },

  async markSkipped(id: string, error: string) {
    await db.update(broadcastRecipient).set({ status: "skipped", error: error.slice(0, 500) }).where(eq(broadcastRecipient.id, id));
  },

  async findOrganization(orgId: string) {
    const [row] = await db
      .select({ id: organization.id, name: organization.name, contactPhone: organization.contactPhone, contactEmail: organization.contactEmail })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1);
    if (!row) return null;
    const [prof] = await db
      .select({ whatsapp: profile.whatsapp, phone: profile.phone, email: profile.email })
      .from(profile)
      .where(eq(profile.organizationId, orgId))
      .limit(1);
    return { ...row, profileWhatsapp: prof?.whatsapp ?? null, profilePhone: prof?.phone ?? null, profileEmail: prof?.email ?? null };
  },
};
