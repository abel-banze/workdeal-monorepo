import { randomUUID } from "node:crypto";
import type { CategoryListQuery, CategoryCreateInput, CategoryUpdateInput } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { categoriesRepository } from "../repositories/categories.repository.js";

class CategoriesService {
  async list(query: CategoryListQuery) {
    const result = await categoriesRepository.list(query);
    return { ...result, page: query.page ?? 1, limit: query.limit ?? 20 };
  }

  async listAll() {
    return categoriesRepository.listAll();
  }

  async getById(id: string) {
    const cat = await categoriesRepository.findById(id);
    if (!cat) throw new AppError(404, "NOT_FOUND", "Categoria não encontrada");
    return cat;
  }

  async create(input: CategoryCreateInput) {
    if (await categoriesRepository.findBySlug(input.slug)) {
      throw new AppError(409, "SLUG_TAKEN", "Já existe uma categoria com este slug");
    }

    if (input.parentId) {
      const parent = await categoriesRepository.findById(input.parentId);
      if (!parent) throw new AppError(400, "INVALID_PARENT", "Categoria pai não encontrada");
    }

    return categoriesRepository.create({
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      description: input.description,
      parentId: input.parentId,
      isActive: input.isActive ?? true,
    });
  }

  async update(id: string, input: CategoryUpdateInput) {
    const existing = await categoriesRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Categoria não encontrada");

    if (input.slug && input.slug !== existing.slug) {
      if (await categoriesRepository.findBySlug(input.slug)) {
        throw new AppError(409, "SLUG_TAKEN", "Já existe uma categoria com este slug");
      }
    }

    if (input.parentId) {
      if (input.parentId === id) {
        throw new AppError(400, "CIRCULAR_PARENT", "Uma categoria não pode ser pai de si mesma");
      }
      const parent = await categoriesRepository.findById(input.parentId);
      if (!parent) throw new AppError(400, "INVALID_PARENT", "Categoria pai não encontrada");
    }

    return categoriesRepository.update(id, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      parentId: input.parentId,
      isActive: input.isActive,
    });
  }

  async remove(id: string) {
    const existing = await categoriesRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Categoria não encontrada");

    if (await categoriesRepository.hasChildren(id)) {
      throw new AppError(409, "HAS_CHILDREN", "Não é possível eliminar uma categoria que tem subcategorias. Remova ou reatribua as subcategorias primeiro.");
    }

    if (await categoriesRepository.hasProfiles(id)) {
      throw new AppError(409, "IN_USE", "Não é possível eliminar uma categoria que está associada a perfis. Remova a associação dos perfis primeiro.");
    }

    return categoriesRepository.remove(id);
  }

  async toggleActive(id: string) {
    const existing = await categoriesRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Categoria não encontrada");
    return categoriesRepository.update(id, { isActive: !existing.isActive });
  }
}

export const categoriesService = new CategoriesService();
