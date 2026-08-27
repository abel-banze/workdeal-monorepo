import type { Context } from "hono";
import type { AuthUser, CreateProfileInput, ListProfilesQuery, UpdateProfileInput } from "@workdeal/shared";
import type { Env } from "../middlewares/auth.middleware.js";
import { ok } from "../lib/api-response.js";
import { profilesService } from "../services/profiles.service.js";

export const profilesController = {
  async create(user: AuthUser, input: CreateProfileInput) {
    const profile = await profilesService.createProfile(user, input);
    return { body: ok(profile), status: 201 as const };
  },

  async getBySlug(_c: Context<Env>, slug: string) {
    const profile = await profilesService.getProfileBySlug(slug);
    return { body: ok(profile), status: 200 as const };
  },

  async getPublicBySlug(_c: Context<Env>, slug: string) {
    const profile = await profilesService.getPublicProfile(slug);
    return { body: ok(profile), status: 200 as const };
  },

  async update(user: AuthUser, slug: string, input: UpdateProfileInput) {
    const profile = await profilesService.updateProfile(user, slug, input);
    return { body: ok(profile), status: 200 as const };
  },

  async remove(user: AuthUser, slug: string) {
    await profilesService.deleteProfile(user, slug);
    return { body: ok(null), status: 200 as const };
  },

  async listCategories() {
    const categories = await profilesService.listCategories();
    return { body: ok(categories), status: 200 as const };
  },

  async list(query: ListProfilesQuery) {
    const result = await profilesService.listProfiles(query);
    return {
      body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }),
      status: 200 as const,
    };
  },

  async getMe(user: AuthUser) {
    const profile = await profilesService.getMyProfile(user);
    return { body: ok(profile), status: 200 as const };
  },
};
