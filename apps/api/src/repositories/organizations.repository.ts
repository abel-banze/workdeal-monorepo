import { db, organization } from "@workdeal/db";
import { eq } from "drizzle-orm";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from "@workdeal/shared";

export const organizationsRepository = {
  async getNotificationPrefs(organizationId: string): Promise<NotificationPrefs | null> {
    const [row] = await db
      .select({ notifyEmail: organization.notifyEmail, notifyWhatsapp: organization.notifyWhatsapp, notifySms: organization.notifySms })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    if (!row) return null;
    return { email: row.notifyEmail, whatsapp: row.notifyWhatsapp, sms: row.notifySms };
  },

  async updateNotificationPrefs(organizationId: string, prefs: NotificationPrefs): Promise<NotificationPrefs | null> {
    const [row] = await db
      .update(organization)
      .set({ notifyEmail: prefs.email, notifyWhatsapp: prefs.whatsapp, notifySms: prefs.sms })
      .where(eq(organization.id, organizationId))
      .returning({ notifyEmail: organization.notifyEmail, notifyWhatsapp: organization.notifyWhatsapp, notifySms: organization.notifySms });
    if (!row) return null;
    return { email: row.notifyEmail, whatsapp: row.notifyWhatsapp, sms: row.notifySms };
  },
};

export { DEFAULT_NOTIFICATION_PREFS };
