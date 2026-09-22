import type { AuthUser } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { organizationsService } from "../services/organizations.service.js";

export const organizationsController = {
  async getNotificationPrefs(user: AuthUser, organizationId: string) {
    const prefs = await organizationsService.getNotificationPrefs(user, organizationId);
    return { body: ok(prefs), status: 200 as const };
  },
  async patchNotificationPrefs(user: AuthUser, organizationId: string, body: unknown) {
    const prefs = await organizationsService.updateNotificationPrefs(user, organizationId, body);
    return { body: ok(prefs), status: 200 as const };
  },
};
