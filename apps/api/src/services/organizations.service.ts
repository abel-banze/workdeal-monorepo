import type { AuthUser, NotificationPrefs } from "@workdeal/shared";
import { notificationPrefsSchema } from "@workdeal/shared";
import { getOrgRole } from "@workdeal/auth";
import { AppError } from "../lib/errors.js";
import { organizationsRepository } from "../repositories/organizations.repository.js";

export const organizationsService = {
  async getNotificationPrefs(user: AuthUser, organizationId: string): Promise<NotificationPrefs> {
    const role = await getOrgRole(user.id, organizationId);
    if (!role) throw new AppError(403, "FORBIDDEN", "Sem acesso a esta organização");
    const prefs = await organizationsRepository.getNotificationPrefs(organizationId);
    if (!prefs) throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Organização não encontrada");
    return prefs;
  },

  async updateNotificationPrefs(user: AuthUser, organizationId: string, input: unknown): Promise<NotificationPrefs> {
    const prefs = notificationPrefsSchema.parse(input);
    const prefsRow = await organizationsRepository.updateNotificationPrefs(organizationId, prefs);
    if (!prefsRow) throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Organização não encontrada");
    return prefsRow;
  },
};
