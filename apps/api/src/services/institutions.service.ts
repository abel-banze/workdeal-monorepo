import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission, hasInstitutionManagerPermission } from "@workdeal/shared";
import type {
  AdminInstitutionsListQuery,
  AdminInstitutionMembershipsQuery,
  InstitutionCreateInput,
  InstitutionManagerInviteInput,
  InstitutionManagerUpdateInput,
  InstitutionMembershipRequestInput,
  InstitutionUpdateInput,
  InstitutionsListQuery,
  InstitutionsMineQuery,
} from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { institutionsRepository } from "../repositories/institutions.repository.js";
import { profilesRepository } from "../repositories/profiles.repository.js";
import { badgesRepository } from "../repositories/badges.repository.js";
import { slugify } from "./profiles.service.js";

type SystemRole = "user" | "moderator" | "admin";

function isPgUniqueViolation(e: unknown): boolean {
  return e instanceof Error && "code" in e && (e as { code: string }).code === "23505";
}

class InstitutionsService {
  // ── Público ──────────────────────────────────────────────────────────────

  async listPublic(query: InstitutionsListQuery) {
    const { items, total } = await institutionsRepository.listPublic(query);
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 12 };
  }

  async getPublicBySlug(slug: string) {
    const view = await institutionsRepository.getPublicBySlug(slug);
    if (!view || view.status !== "active" || view.verificationStatus === "suspended") {
      throw new AppError(404, "NOT_FOUND", "Instituição não encontrada");
    }
    return view;
  }

  async requestMembership(userId: string, institutionId: string, input: InstitutionMembershipRequestInput) {
    const institution = await institutionsRepository.findAdminById(institutionId);
    if (!institution || institution.status !== "active") {
      throw new AppError(404, "NOT_FOUND", "Instituição não encontrada");
    }

    const company = await institutionsRepository.findProfileById(input.companyProfileId);
    if (!company || company.type !== "company" || company.status !== "active" || company.deletedAt) {
      throw new AppError(400, "INVALID_COMPANY", "Perfil de empresa inválido");
    }

    await this.assertCanManageCompany(userId, company);

    const result = await institutionsRepository.requestMembership({
      institutionId,
      companyProfileId: input.companyProfileId,
      membershipType: input.membershipType ?? "member",
      requestedById: userId,
    });

    if (!result.inserted) {
      const row = result.row!;
      const status = row.status;
      if (status === "pending") {
        throw new AppError(409, "ALREADY_REQUESTED", "A empresa já tem um pedido de associação pendente");
      }
      if (status === "approved" || status === "verified") {
        throw new AppError(409, "ALREADY_MEMBER", "A empresa já é membro desta instituição");
      }
    }

    return result.row!;
  }

  // ── Autosserviço (instituições donas) ────────────────────────────────────

  async createMine(userId: string, input: InstitutionCreateInput) {
    const slug = await this.resolveUniqueSlug(input.slug ?? slugify(input.name));
    const categoryIds = input.categoryIds ?? [];
    await this.validateCategories(categoryIds);

    const status = input.status === "active" ? "active" : "draft";

    try {
      const { institutionId } = await institutionsRepository.create({
        institution: {
          name: input.name,
          slug,
          profileId: "",
          legalName: input.legalName ?? null,
          organizationType: input.organizationType,
          foundedAt: input.foundedAt ?? null,
          website: input.website ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          whatsapp: input.whatsapp ?? null,
          province: input.province ?? null,
          district: input.district ?? null,
          city: input.city ?? null,
          address: input.address ?? null,
          acronym: input.acronym ?? null,
          taxId: input.taxId ?? null,
          mission: input.mission ?? null,
          vision: input.vision ?? null,
          operatingScope: input.operatingScope ?? null,
          socialLinks: input.socialLinks ?? null,
          primaryContact: input.primaryContact ?? null,
          status,
          verificationStatus: "pending",
          createdById: userId,
        },
        profile: {
          type: "institution",
          slug,
          name: input.name,
          tagline: input.tagline ?? null,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
          coverUrl: input.coverUrl ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          status,
        },
        categoryIds,
        managerUserId: userId,
        managerRole: "owner",
      });

      const created = await institutionsRepository.findAdminById(institutionId);
      if (!created) throw new AppError(500, "CREATE_FAILED", "Falha ao criar instituição");
      return created;
    } catch (e) {
      if (isPgUniqueViolation(e)) {
        const msg = (e as { constraint?: string }).constraint;
        if (msg?.includes("tax_id")) throw new AppError(409, "TAX_ID_CONFLICT", "NUIT já registado por outra instituição");
        throw new AppError(409, "SLUG_CONFLICT", "Já existe uma instituição com este identificador");
      }
      throw e;
    }
  }

  async listMine(userId: string, query: InstitutionsMineQuery) {
    const { items, total } = await institutionsRepository.listByManager(userId, query);
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 20 };
  }

  async getMine(userId: string, institutionId: string) {
    const manager = await institutionsRepository.findManager(institutionId, userId);
    if (!manager) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada ou sem acesso");

    const row = await institutionsRepository.findAdminById(institutionId);
    if (!row) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada");

    const managers = await institutionsRepository.listManagers(institutionId);
    return { institution: row, managers, myRole: manager.role };
  }

  async updateMine(userId: string, institutionId: string, input: InstitutionUpdateInput) {
    const manager = await institutionsRepository.findManager(institutionId, userId);
    if (!manager) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada ou sem acesso");
    if (!hasInstitutionManagerPermission(manager.role, "profile:edit")) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para editar esta instituição");
    }

    if (input.status === "suspended" && manager.role !== "owner") {
      throw new AppError(403, "FORBIDDEN", "Só o director da instituição pode suspendê-la");
    }

    const existing = await institutionsRepository.findAdminById(institutionId);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada");

    return this._doUpdate(existing, input);
  }

  async publishMine(userId: string, institutionId: string) {
    const manager = await institutionsRepository.findManager(institutionId, userId);
    if (!manager) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada ou sem acesso");
    if (!hasInstitutionManagerPermission(manager.role, "profile:edit")) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para publicar esta instituição");
    }

    const existing = await institutionsRepository.findAdminById(institutionId);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada");

    await institutionsRepository.update(institutionId, {
      institution: { status: "active", updatedAt: new Date() },
      profile: { status: "active" },
    });
    return this.getAdmin(institutionId);
  }

  // ── Managers (autosserviço) ─────────────────────────────────────────────

  async listManagers(userId: string, institutionId: string) {
    await this.assertInstitutionManager(userId, institutionId, "managers:manage");
    return institutionsRepository.listManagers(institutionId);
  }

  async addManager(userId: string, institutionId: string, input: InstitutionManagerInviteInput) {
    await this.assertInstitutionManager(userId, institutionId, "managers:manage");

    const existing = await institutionsRepository.findManager(institutionId, input.userId);
    if (existing) throw new AppError(409, "ALREADY_MANAGER", "Este utilizador já é gestor da instituição");

    try {
      await institutionsRepository.addManager(institutionId, input.userId, input.role);
    } catch (e) {
      if (isPgUniqueViolation(e)) {
        throw new AppError(409, "ALREADY_MANAGER", "Este utilizador já é gestor da instituição");
      }
      throw e;
    }

    return institutionsRepository.listManagers(institutionId);
  }

  async updateManagerRole(userId: string, institutionId: string, managerId: string, input: InstitutionManagerUpdateInput) {
    await this.assertInstitutionManager(userId, institutionId, "managers:manage");

    const target = await institutionsRepository.findManagerById(managerId);
    if (!target || target.institutionId !== institutionId) {
      throw new AppError(404, "NOT_FOUND", "Gestor não encontrado");
    }

    if (target.role === "owner" && input.role !== "owner") {
      const owners = await institutionsRepository.countOwners(institutionId);
      if (owners <= 1) {
        throw new AppError(409, "LAST_OWNER", "Não é possível rebaixar o último director da instituição");
      }
    }

    await institutionsRepository.updateManagerRole(managerId, input.role);
    return institutionsRepository.listManagers(institutionId);
  }

  async removeManager(userId: string, institutionId: string, managerId: string) {
    await this.assertInstitutionManager(userId, institutionId, "managers:manage");

    const target = await institutionsRepository.findManagerById(managerId);
    if (!target || target.institutionId !== institutionId) {
      throw new AppError(404, "NOT_FOUND", "Gestor não encontrado");
    }

    if (target.userId === userId) {
      throw new AppError(409, "CANNOT_REMOVE_SELF", "Não é possível remover a própria conta de gestor");
    }

    if (target.role === "owner") {
      const owners = await institutionsRepository.countOwners(institutionId);
      if (owners <= 1) {
        throw new AppError(409, "LAST_OWNER", "Não é possível remover o último director da instituição");
      }
    }

    await institutionsRepository.removeManager(managerId);
    return institutionsRepository.listManagers(institutionId);
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async listAdmin(query: AdminInstitutionsListQuery) {
    const { items, total } = await institutionsRepository.listAdmin(query);
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 20 };
  }

  async getAdmin(id: string) {
    const row = await institutionsRepository.findAdminById(id);
    if (!row) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada");
    return row;
  }

  async createAdmin(actorRole: SystemRole, actorUserId: string, input: InstitutionCreateInput) {
    this.requireAdmin(actorRole);
    const slug = await this.resolveUniqueSlug(input.slug ?? slugify(input.name));
    const categoryIds = input.categoryIds ?? [];
    await this.validateCategories(categoryIds);

    const status = input.status === "active" ? "active" : "draft";

    try {
      const { institutionId } = await institutionsRepository.create({
        institution: {
          name: input.name,
          slug,
          profileId: "",
          legalName: input.legalName ?? null,
          organizationType: input.organizationType,
          foundedAt: input.foundedAt ?? null,
          website: input.website ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          whatsapp: input.whatsapp ?? null,
          province: input.province ?? null,
          district: input.district ?? null,
          city: input.city ?? null,
          address: input.address ?? null,
          acronym: input.acronym ?? null,
          taxId: input.taxId ?? null,
          mission: input.mission ?? null,
          vision: input.vision ?? null,
          operatingScope: input.operatingScope ?? null,
          socialLinks: input.socialLinks ?? null,
          primaryContact: input.primaryContact ?? null,
          status,
          verificationStatus: "pending",
          createdById: actorUserId,
        },
        profile: {
          type: "institution",
          slug,
          name: input.name,
          tagline: input.tagline ?? null,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
          coverUrl: input.coverUrl ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          status,
        },
        categoryIds,
      });

      const created = await institutionsRepository.findAdminById(institutionId);
      if (!created) throw new AppError(500, "CREATE_FAILED", "Falha ao criar instituição");
      return created;
    } catch (e) {
      if (isPgUniqueViolation(e)) {
        const msg = (e as { constraint?: string }).constraint;
        if (msg?.includes("tax_id")) throw new AppError(409, "TAX_ID_CONFLICT", "NUIT já registado por outra instituição");
        throw new AppError(409, "SLUG_CONFLICT", "Já existe uma instituição com este identificador");
      }
      throw e;
    }
  }

  async updateAdmin(actorRole: SystemRole, id: string, input: InstitutionUpdateInput) {
    this.requireAdmin(actorRole);
    const existing = await institutionsRepository.findAdminById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada");
    return this._doUpdate(existing, input);
  }

  async verify(actorRole: SystemRole, id: string) {
    this.requireAdmin(actorRole);
    const existing = await institutionsRepository.findAdminById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada");
    await institutionsRepository.setVerification(id, "verified", actorRole as string);
    await badgesRepository.assignBySlug(existing.profileId, "verified", actorRole as string);
    return this.getAdmin(id);
  }

  async unverify(actorRole: SystemRole, id: string) {
    this.requireAdmin(actorRole);
    const existing = await institutionsRepository.findAdminById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada");
    await institutionsRepository.setVerification(id, "pending", actorRole as string);
    return this.getAdmin(id);
  }

  // ── Memberships (admin) ──────────────────────────────────────────────────

  async listMemberships(institutionId: string, query: AdminInstitutionMembershipsQuery) {
    const existing = await institutionsRepository.findAdminById(institutionId);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Instituição não encontrada");
    const { items, total } = await institutionsRepository.listMemberships(institutionId, query);
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  async approveMembership(actorRole: SystemRole, membershipId: string) {
    this.requireAdmin(actorRole);
    const membership = await institutionsRepository.findMembership(membershipId);
    if (!membership) throw new AppError(404, "NOT_FOUND", "Associação não encontrada");
    if (membership.status === "rejected" || membership.status === "revoked") {
      throw new AppError(409, "INVALID_TRANSITION", "Associação revogada/rejeitada não pode ser aprovada directamente");
    }
    return institutionsRepository.updateMembershipStatus(membershipId, "approved", actorRole as string);
  }

  async rejectMembership(actorRole: SystemRole, membershipId: string) {
    this.requireAdmin(actorRole);
    const membership = await institutionsRepository.findMembership(membershipId);
    if (!membership) throw new AppError(404, "NOT_FOUND", "Associação não encontrada");
    if (membership.status === "verified") {
      throw new AppError(409, "INVALID_TRANSITION", "Associação verificada não pode ser rejeitada");
    }
    return institutionsRepository.updateMembershipStatus(membershipId, "rejected", actorRole as string);
  }

  async verifyMembership(actorRole: SystemRole, membershipId: string) {
    this.requireAdmin(actorRole);
    const membership = await institutionsRepository.findMembership(membershipId);
    if (!membership) throw new AppError(404, "NOT_FOUND", "Associação não encontrada");
    if (membership.status === "pending") {
      throw new AppError(409, "INVALID_TRANSITION", "Aprove primeiro a associação antes de verificar");
    }
    if (membership.status === "rejected" || membership.status === "revoked") {
      throw new AppError(409, "INVALID_TRANSITION", "Associação rejeitada/revogada não pode ser verificada");
    }
    return institutionsRepository.updateMembershipStatus(membershipId, "verified", actorRole as string);
  }

  async revokeMembership(actorRole: SystemRole, membershipId: string) {
    this.requireAdmin(actorRole);
    const membership = await institutionsRepository.findMembership(membershipId);
    if (!membership) throw new AppError(404, "NOT_FOUND", "Associação não encontrada");
    return institutionsRepository.updateMembershipStatus(membershipId, "revoked", actorRole as string);
  }

  // ── Shared update logic ──────────────────────────────────────────────────

  private async _doUpdate(
    existing: { id: string; slug: string; name: string; legalName: string | null; organizationType: string; foundedAt: Date | null; profileId: string; status: "draft" | "active" | "suspended" },
    input: InstitutionUpdateInput,
  ) {
    const institutionId = existing.id;
    let slug = existing.slug;
    if (input.slug && input.slug !== existing.slug) {
      slug = await this.resolveUniqueSlug(input.slug);
    }

    const categoryIds = input.categoryIds;
    if (categoryIds) await this.validateCategories(categoryIds);

    const status = input.status ?? existing.status;
    const institutionPatch: Record<string, unknown> = {
      name: input.name ?? existing.name,
      slug,
      legalName: input.legalName !== undefined ? input.legalName : existing.legalName,
      organizationType: input.organizationType ?? existing.organizationType,
      foundedAt: input.foundedAt !== undefined ? input.foundedAt : existing.foundedAt,
      website: input.website !== undefined ? input.website : undefined,
      email: input.email !== undefined ? input.email : undefined,
      phone: input.phone !== undefined ? input.phone : undefined,
      whatsapp: input.whatsapp !== undefined ? input.whatsapp : undefined,
      province: input.province !== undefined ? input.province : undefined,
      district: input.district !== undefined ? input.district : undefined,
      city: input.city !== undefined ? input.city : undefined,
      address: input.address !== undefined ? input.address : undefined,
      acronym: input.acronym !== undefined ? input.acronym : undefined,
      taxId: input.taxId !== undefined ? input.taxId : undefined,
      mission: input.mission !== undefined ? input.mission : undefined,
      vision: input.vision !== undefined ? input.vision : undefined,
      operatingScope: input.operatingScope !== undefined ? input.operatingScope : undefined,
      socialLinks: input.socialLinks !== undefined ? input.socialLinks : undefined,
      primaryContact: input.primaryContact !== undefined ? input.primaryContact : undefined,
      status,
      updatedAt: new Date(),
    };
    const profilePatch: Record<string, unknown> = {
      name: input.name ?? undefined,
      slug,
      tagline: input.tagline !== undefined ? input.tagline : undefined,
      description: input.description !== undefined ? input.description : undefined,
      logoUrl: input.logoUrl !== undefined ? input.logoUrl : undefined,
      coverUrl: input.coverUrl !== undefined ? input.coverUrl : undefined,
      latitude: input.latitude !== undefined ? input.latitude : undefined,
      longitude: input.longitude !== undefined ? input.longitude : undefined,
      status: status ?? undefined,
    };

    try {
      await institutionsRepository.update(institutionId, {
        institution: institutionPatch as never,
        profile: profilePatch as never,
        categoryIds,
      });
    } catch (e) {
      if (isPgUniqueViolation(e)) {
        const msg = (e as { constraint?: string }).constraint;
        if (msg?.includes("tax_id")) throw new AppError(409, "TAX_ID_CONFLICT", "NUIT já registado por outra instituição");
        throw new AppError(409, "SLUG_CONFLICT", "Já existe uma instituição com este identificador");
      }
      throw e;
    }

    return this.getAdmin(institutionId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private requireAdmin(actorRole: string) {
    if (actorRole !== "admin") {
      throw new AppError(403, "FORBIDDEN", "Só administradores podem gerir instituições");
    }
  }

  private async assertInstitutionManager(
    userId: string,
    institutionId: string,
    permission: Parameters<typeof hasInstitutionManagerPermission>[1],
  ) {
    const manager = await institutionsRepository.findManager(institutionId, userId);
    if (!manager) throw new AppError(403, "FORBIDDEN", "Sem permissão para gerir esta instituição");
    if (!hasInstitutionManagerPermission(manager.role, permission)) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para esta acção");
    }
  }

  private async resolveUniqueSlug(base: string): Promise<string> {
    let slug = base;
    for (let i = 2; (await institutionsRepository.slugExists(slug)) || (await profilesRepository.slugExists(slug)); i++) {
      slug = `${base}-${i}`;
    }
    return slug;
  }

  private async validateCategories(ids: string[]) {
    if (ids.length === 0) return;
    const unique = [...new Set(ids)];
    const found = await profilesRepository.findCategoriesByIds(unique);
    if (found.length !== unique.length) {
      throw new AppError(400, "INVALID_CATEGORY", "Uma ou mais categorias são inválidas ou inactivas");
    }
  }

  private async assertCanManageCompany(userId: string, company: { userId: string | null; organizationId: string | null }) {
    if (company.userId === userId) return;
    if (company.organizationId) {
      const role = await getOrgRole(userId, company.organizationId);
      if (role && hasOrgPermission(role, "profile:edit")) return;
    }
    throw new AppError(403, "FORBIDDEN", "Sem permissão para associar esta empresa");
  }
}

export const institutionsService = new InstitutionsService();
