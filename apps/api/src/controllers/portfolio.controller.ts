import type { AuthUser } from "@workdeal/shared";
import { ok } from "../lib/api-response";
import { portfolioService } from "../services/portfolio.service";

export const portfolioController = {
  async list(profileId: string) {
    const items = await portfolioService.list(profileId);
    return { body: ok(items), status: 200 as const };
  },
  async create(user: AuthUser, input: { profileId: string; title: string; description?: string | null; imageUrl?: string | null }) {
    const item = await portfolioService.create(user, input);
    return { body: ok(item), status: 201 as const };
  },
  async update(user: AuthUser, id: string, input: { title?: string; description?: string | null; imageUrl?: string | null }) {
    const item = await portfolioService.update(user, id, input);
    return { body: ok(item), status: 200 as const };
  },
  async remove(user: AuthUser, id: string) {
    const res = await portfolioService.remove(user, id);
    return { body: ok(res), status: 200 as const };
  },
};
