import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission, hasSelfPermission, normalizeBusinessHours } from "@workdeal/shared";
import type { AuthUser, CreateProfileInput, DomainPermission, ListProfilesQuery, ProfileType, ProfileView, UpdateProfileInput } from "@workdeal/shared";
import type { CategoryView, PublicProfileView, PublicBadge } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { profilesRepository } from "../repositories/profiles.repository.js";
import type { ProfileWithCategories } from "../repositories/profiles.repository.js";

class ProfilesService {
  async createProfile(user: AuthUser, input: CreateProfileInput): Promise<ProfileView> {
    const result = input.organizationId ? await this.createCompanyProfile(user, input, input.organizationId) : await this.createIndividualProfile(user, input);
    // P2-4: tries profile-complete badge best-effort (does not block creation)
    try {
      const { ensureProfileCompleteForProfile } = await import("./badges.job.js");
      await ensureProfileCompleteForProfile(result.id);
    } catch {}
    return result;
  }

  async getProfileBySlug(slug: string): Promise<ProfileView> {
    const row = await profilesRepository.findBySlug(slug);
    if (!row || row.status !== "active") {
      throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
    }
    return this.toProfileView(row);
  }

  async getPublicProfile(slug: string): Promise<PublicProfileView> {
    const row = await profilesRepository.findBySlug(slug);
    if (!row || row.status !== "active") {
      throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
    }

    const profileView = this.toProfileView(row);

    // Fetch related data in parallel
    const [locations, qualification, badges, reviewStats] = await Promise.all([
      this.fetchLocation(row.id),
      this.fetchQualification(row.organizationId),
      this.fetchBadges(row.id),
      this.fetchReviewStats(row.id),
    ]);

    return {
      ...profileView,
      location: locations,
      qualification,
      badges,
      reviews: reviewStats,
    };
  }

  async updateProfile(user: AuthUser, slug: string, input: UpdateProfileInput): Promise<ProfileView> {
    const existing = await profilesRepository.findBySlug(slug, { includeDeleted: true });
    if (!existing || existing.deletedAt) {
      throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
    }
    await this.assertCanEdit(user, existing, "profile:edit");

    if (input.status === "suspended") {
      throw new AppError(403, "FORBIDDEN", "Suspensão é uma acção de moderação");
    }

    const newSlug = await this.resolveSlug(input.slug, existing.slug);
    const categories = input.categoryIds !== undefined ? await this.resolveCategories(input.categoryIds) : undefined;

    const patch = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(newSlug !== existing.slug ? { slug: newSlug } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.googlePlaceId !== undefined ? { googlePlaceId: input.googlePlaceId } : {}),
      ...(input.formattedAddress !== undefined ? { formattedAddress: input.formattedAddress } : {}),
      // Horários normalizados para o formato canónico (Google periods) na escrita
      ...(input.businessHours !== undefined ? { businessHours: normalizeBusinessHours(input.businessHours) } : {}),
    };

    const row = await profilesRepository.updateProfileAndCategories(existing.id, patch, categories);
    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
    }
    // P2-4: update badge after edit
    try {
      const { ensureProfileCompleteForProfile } = await import("./badges.job.js");
      await ensureProfileCompleteForProfile(row.id);
    } catch {}
    return this.toProfileView(row);
  }

  async deleteProfile(user: AuthUser, slug: string): Promise<void> {
    const existing = await profilesRepository.findBySlug(slug, { includeDeleted: true });
    if (!existing || existing.deletedAt) {
      throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
    }
    await this.assertCanEdit(user, existing, "profile:delete");
    await profilesRepository.softDelete(existing.id);
  }

  async listCategories(): Promise<CategoryView[]> {
    const rows = await profilesRepository.listActiveCategories();
    return rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      slug: row.slug,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
    }));
  }

  async listProfiles(query: ListProfilesQuery): Promise<{ items: ProfileView[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await profilesRepository.listProfiles({ ...query, page, limit });
    return {
      items: items.map((r) => this.toProfileView(r)),
      total,
      page,
      limit,
    };
  }

  async getMyProfile(user: AuthUser): Promise<ProfileView | null> {
    // Estritamente pessoal — tipo individual via userId. Perfis de empresa
    // são resolvidos apenas via organizationId no contexto [organizationId] (P0-1).
    const individual = await profilesRepository.findByUserId(user.id);
    if (individual && !individual.deletedAt) {
      const full = await profilesRepository.findBySlug(individual.slug, { includeDeleted: false });
      if (full) return this.toProfileView(full);
      // fallback se findBySlug falhar (status draft)
      return this.toProfileView({ ...individual, categories: [] } as unknown as ProfileWithCategories);
    }
    return null;
  }

  private async createIndividualProfile(user: AuthUser, input: CreateProfileInput): Promise<ProfileView> {
    const existing = await profilesRepository.findByUserId(user.id);
    if (existing && !existing.deletedAt) {
      throw new AppError(409, "PROFILE_ALREADY_EXISTS", "Já tens um perfil criado");
    }
    if (existing?.deletedAt) {
      return this.restore(existing, input, "individual", null);
    }
    const categories = await this.resolveCategories(input.categoryIds ?? []);
    let slug = input.slug ?? (await this.uniqueSlug(input.name));
    try {
      const row = await profilesRepository.createProfileWithCategories(this.buildCreateData("individual", user.id, null, slug, input), categories);
      return this.toProfileView(row);
    } catch (e: unknown) {
      if (isUniqueViolation(e)) {
        // Corrida: slug colidiu entre check e insert — gerar novo e retry 1x
        if (!input.slug) {
          slug = await this.uniqueSlug(`${input.name}-${Date.now() % 1000}`);
          const retry = await profilesRepository.createProfileWithCategories(this.buildCreateData("individual", user.id, null, slug, input), categories);
          return this.toProfileView(retry);
        }
        throw new AppError(409, "SLUG_TAKEN", "Slug já está em uso");
      }
      throw e;
    }
  }

  private async createCompanyProfile(user: AuthUser, input: CreateProfileInput, organizationId: string): Promise<ProfileView> {
    const role = await getOrgRole(user.id, organizationId);
    if (!role || !hasOrgPermission(role, "profile:edit")) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para criar o perfil desta organização");
    }
    const existing = await profilesRepository.findByOrganizationId(organizationId);
    if (existing && !existing.deletedAt) {
      throw new AppError(409, "PROFILE_ALREADY_EXISTS", "Esta organização já tem um perfil");
    }
    if (existing?.deletedAt) {
      return this.restore(existing, input, "company", organizationId);
    }
    const categories = await this.resolveCategories(input.categoryIds ?? []);
    let slug = input.slug ?? (await this.uniqueSlug(input.name));
    try {
      const row = await profilesRepository.createProfileWithCategories(this.buildCreateData("company", null, organizationId, slug, input), categories);
      return this.toProfileView(row);
    } catch (e: unknown) {
      if (isUniqueViolation(e)) {
        if (!input.slug) {
          slug = await this.uniqueSlug(`${input.name}-${Date.now() % 1000}`);
          const retry = await profilesRepository.createProfileWithCategories(this.buildCreateData("company", null, organizationId, slug, input), categories);
          return this.toProfileView(retry);
        }
        throw new AppError(409, "SLUG_TAKEN", "Slug já está em uso");
      }
      throw e;
    }
  }

  private async restore(
    existing: Pick<ProfileWithCategories, "id" | "slug" | "userId" | "organizationId">,
    input: CreateProfileInput,
    type: ProfileType,
    organizationId: string | null,
  ): Promise<ProfileView> {
    const categories = await this.resolveCategories(input.categoryIds ?? []);
    const slug = await this.resolveSlug(input.slug, existing.slug);
    const row = await profilesRepository.updateProfileAndCategories(
      existing.id,
      {
        deletedAt: null,
        ...this.buildCreateData(type, existing.userId, organizationId, slug, input),
      },
      categories,
    );
    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
    }
    return this.toProfileView(row);
  }

  private buildCreateData(
    type: ProfileType,
    userId: string | null,
    organizationId: string | null,
    slug: string,
    input: CreateProfileInput,
  ): Parameters<typeof profilesRepository.createProfileWithCategories>[0] & { status: ProfileView["status"] } {
    return {
      type,
      userId,
      organizationId,
      slug,
      name: input.name,
      tagline: input.tagline ?? null,
      description: input.description ?? null,
      logoUrl: input.logoUrl ?? null,
      coverUrl: input.coverUrl ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      whatsapp: input.whatsapp ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      googlePlaceId: input.googlePlaceId ?? null,
      formattedAddress: input.formattedAddress ?? null,
      businessHours: normalizeBusinessHours(input.businessHours),
      status: "active",
    };
  }

  private async assertCanEdit(
    user: AuthUser,
    row: { userId: string | null; organizationId: string | null },
    permission: DomainPermission,
  ): Promise<void> {
    if (row.userId !== null) {
      if (row.userId === user.id && hasSelfPermission(permission)) return;
    }
    if (row.organizationId !== null) {
      const role = await getOrgRole(user.id, row.organizationId);
      if (role && hasOrgPermission(role, permission)) return;
    }
    throw new AppError(403, "FORBIDDEN", "Sem permissão para esta acção");
  }

  private async resolveSlug(requested: string | undefined, current: string): Promise<string> {
    if (!requested || requested === current) return current;
    if (await profilesRepository.slugExists(requested)) {
      throw new AppError(409, "SLUG_TAKEN", "Slug já está em uso");
    }
    return requested;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    for (let i = 2; await profilesRepository.slugExists(slug); i++) {
      slug = `${base}-${i}`;
    }
    return slug;
  }

  private async resolveCategories(ids: string[]): Promise<Parameters<typeof profilesRepository.createProfileWithCategories>[1]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return [];
    const found = await profilesRepository.findCategoriesByIds(unique);
    if (found.length !== unique.length) {
      throw new AppError(400, "INVALID_CATEGORY", "Uma ou mais categorias são inválidas ou inactivas");
    }
    const byId = new Map(found.map((c) => [c.id, c]));
    return unique.map((id) => byId.get(id)!);
  }

  private async fetchLocation(profileId: string): Promise<PublicProfileView["location"]> {
    const { profileLocation } = await import("@workdeal/db");
    const { eq, desc } = await import("drizzle-orm");
    const { db } = await import("@workdeal/db");
    const [loc] = await db
      .select({
        province: profileLocation.province,
        district: profileLocation.district,
        bairro: profileLocation.bairro,
        address: profileLocation.address,
        latitude: profileLocation.latitude,
        longitude: profileLocation.longitude,
      })
      .from(profileLocation)
      .where(eq(profileLocation.profileId, profileId))
      .orderBy(desc(profileLocation.isPrimary))
      .limit(1);
    if (!loc) return null;
    return {
      province: loc.province,
      district: loc.district,
      bairro: loc.bairro,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      formattedAddress: null,
    };
  }

  private async fetchQualification(organizationId: string | null): Promise<PublicProfileView["qualification"]> {
    if (!organizationId) return null;
    const { companyQualificationRepository } = await import("../repositories/company-qualification.repository.js");
    const row = await companyQualificationRepository.findByOrganizationId(organizationId);
    if (!row) return null;
    return {
      foundedYear: row.foundedYear,
      companySize: row.companySize,
      workers: row.workers,
      legalForm: row.legalForm,
      nuit: row.nuit,
      alvara: row.alvara,
    };
  }

  private async fetchBadges(profileId: string): Promise<PublicBadge[]> {
    const { db, profileBadge, badge } = await import("@workdeal/db");
    const { eq, and } = await import("drizzle-orm");
    const rows = await db
      .select({
        id: badge.id,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        type: badge.type,
        status: profileBadge.status,
        awardedAt: profileBadge.awardedAt,
      })
      .from(profileBadge)
      .innerJoin(badge, eq(profileBadge.badgeId, badge.id))
      .where(and(eq(profileBadge.profileId, profileId), eq(profileBadge.status, "active")));
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      type: r.type,
      status: r.status,
      awardedAt: r.awardedAt,
    }));
  }

  private async fetchReviewStats(profileId: string): Promise<PublicProfileView["reviews"]> {
    const { db, review } = await import("@workdeal/db");
    const { eq, sql } = await import("drizzle-orm");
    const [stats] = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${review.rating})::float, 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(review)
      .where(eq(review.profileId, profileId));
    return {
      average: stats?.avg ? Math.round(stats.avg * 10) / 10 : null,
      count: stats?.count ?? 0,
    };
  }

  private toProfileView(row: ProfileWithCategories): ProfileView {
    return {
      id: row.id,
      type: row.type,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      logoUrl: row.logoUrl,
      coverUrl: row.coverUrl,
      latitude: row.latitude,
      longitude: row.longitude,
      whatsapp: row.whatsapp,
      phone: row.phone,
      email: row.email,
      website: row.website,
      googlePlaceId: row.googlePlaceId,
      formattedAddress: row.formattedAddress,
      businessHours: row.businessHours as Record<string, unknown> | null,
      status: row.status,
      categories: row.categories,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "profile"
  );
}

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return err?.code === "23505" || /unique|duplicate/i.test(err?.message ?? "");
}

export const profilesService = new ProfilesService();
