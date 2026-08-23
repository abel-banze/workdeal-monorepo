import type { AuthUser } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { servicesService } from "../services/services.service.js";

export const servicesController = {
  async list(profileId: string) {
    const items = await servicesService.list(profileId);
    return { body: ok(items), status: 200 as const };
  },
  async create(user: AuthUser, input: { profileId: string; title: string; description?: string | null; priceMzn?: number | null; imageUrl?: string | null; categoryId?: string | null }) {
    const item = await servicesService.create(user, input);
    return { body: ok(item), status: 201 as const };
  },
  async update(user: AuthUser, id: string, input: { title?: string; description?: string | null; priceMzn?: number | null; imageUrl?: string | null; categoryId?: string | null }) {
    const item = await servicesService.update(user, id, input);
    return { body: ok(item), status: 200 as const };
  },
  async remove(user: AuthUser, id: string) {
    const res = await servicesService.remove(user, id);
    return { body: ok(res), status: 200 as const };
  },
};
