import { ok } from "../lib/api-response.js";
import { categoriesService } from "../services/categories.service.js";
import type { CategoryListQuery, CategoryCreateInput, CategoryUpdateInput } from "@workdeal/shared";

export const categoriesController = {
  async list(query: CategoryListQuery) {
    const result = await categoriesService.list(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },

  async listAll() {
    const items = await categoriesService.listAll();
    return { body: ok(items), status: 200 as const };
  },

  async getById(id: string) {
    const data = await categoriesService.getById(id);
    return { body: ok(data), status: 200 as const };
  },

  async create(input: CategoryCreateInput) {
    const row = await categoriesService.create(input);
    return { body: ok({ id: row.id, name: row.name, slug: row.slug }), status: 201 as const };
  },

  async update(id: string, input: CategoryUpdateInput) {
    const result = await categoriesService.update(id, input);
    return { body: ok(result), status: 200 as const };
  },

  async remove(id: string) {
    const result = await categoriesService.remove(id);
    return { body: ok(result), status: 200 as const };
  },

  async toggleActive(id: string) {
    const result = await categoriesService.toggleActive(id);
    return { body: ok(result), status: 200 as const };
  },
};
