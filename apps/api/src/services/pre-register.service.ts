import { randomUUID } from "node:crypto";
import type { AdminOrgListQuery, PreRegisterCompanyInput, PreRegisterUpdateInput } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { preRegisterRepository, buildPreRegisterMetadata, parsePreRegisterMetadata } from "../repositories/pre-register.repository.js";
import { preRegisterNotificationService } from "./pre-register-notifications.service.js";

const COMPLETION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

class PreRegisterService {
  async create(actorUserId: string, input: PreRegisterCompanyInput) {
    if (await preRegisterRepository.findBySlug(input.slug)) {
      throw new AppError(409, "SLUG_TAKEN", "Já existe uma empresa com este slug");
    }

    const completionToken = randomUUID();
    const completionTokenExpiresAt = new Date(Date.now() + COMPLETION_TOKEN_TTL_MS);

    // metadata (JSON) guarda os dados do Google Places, logo e categorias para o promoter
    const metadata = buildPreRegisterMetadata({
      googlePlaceId: input.googlePlaceId,
      formattedAddress: input.formattedAddress,
      logoUrl: input.logoUrl,
      categorySlugs: input.categorySlugs,
    });

    const org = await preRegisterRepository.create({
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail ?? null,
      metadata,
      preRegisteredBy: actorUserId,
      completionToken,
      completionTokenExpiresAt,
    });

    // Notifica a empresa (fire-and-forget, nunca bloqueia o request)
    void preRegisterNotificationService
      .notifyCompanyPreRegister({
        companyName: org.name,
        contactName: org.contactName ?? org.name,
        contactPhone: org.contactPhone,
        contactEmail: org.contactEmail,
        formattedAddress: input.formattedAddress,
        completionUrl: `${preRegisterNotificationService.webOrigin()}/pre-register/${completionToken}`,
      })
      .catch((e) => console.error("[pre-register] falha ao notificar:", e instanceof Error ? e.message : String(e)));

    return org;
  }

  async list(query: AdminOrgListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await preRegisterRepository.list(query);
    const origin = preRegisterNotificationService.webOrigin();
    const mapped = items.map((item) => {
      const meta = parsePreRegisterMetadata(item.metadata);
      return {
        ...item,
        // URL absoluta de conclusão na origem do web — o admin copia-a tal e qual
        completionUrl: item.completionToken ? `${origin}/pre-register/${item.completionToken}` : null,
        completionTokenExpiresAt: item.completionTokenExpiresAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        preRegisteredAt: item.preRegisteredAt?.toISOString() ?? null,
        formattedAddress: meta.formattedAddress ?? null,
        logoUrl: meta.logoUrl ?? null,
        categorySlugs: meta.categorySlugs ?? [],
      };
    });
    return { items: mapped, total, page, limit };
  }

  async lookup(token: string) {
    const org = await preRegisterRepository.findByToken(token);
    if (!org) {
      throw new AppError(404, "TOKEN_INVALID", "Link de registo inválido ou já utilizado");
    }
    if (org.completionTokenExpiresAt && org.completionTokenExpiresAt.getTime() < Date.now()) {
      throw new AppError(410, "TOKEN_EXPIRED", "Este link de registo expirou. Contacta a equipa Workdeal.");
    }
    const meta = parsePreRegisterMetadata(org.metadata);
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      contactName: org.contactName,
      contactPhone: org.contactPhone,
      contactEmail: org.contactEmail,
      formattedAddress: meta.formattedAddress ?? null,
      logoUrl: meta.logoUrl ?? null,
      categorySlugs: meta.categorySlugs ?? [],
      metadata: org.metadata,
      verificationStatus: org.verificationStatus,
      preRegisteredAt: org.preRegisteredAt?.toISOString() ?? null,
    };
  }

  async claim(token: string, userId: string) {
    const org = await preRegisterRepository.getValidByToken(token);
    if (!org) {
      const existing = await preRegisterRepository.findByToken(token);
      if (!existing) throw new AppError(404, "TOKEN_INVALID", "Link de registo inválido ou já utilizado");
      throw new AppError(410, "TOKEN_EXPIRED", "Este link de registo expirou ou já foi utilizado");
    }
    const result = await preRegisterRepository.claim(token, userId);
    return result;
  }

  async update(id: string, input: PreRegisterUpdateInput) {
    const org = await preRegisterRepository.findByIdOrg(id);
    if (!org) throw new AppError(404, "NOT_FOUND", "Empresa pré-registada não encontrada");
    if (org.verificationStatus !== "pre_registered") {
      throw new AppError(409, "ALREADY_COMPLETED", "Esta empresa já iniciou o registo");
    }

    if (input.slug && input.slug !== org.slug) {
      const existing = await preRegisterRepository.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new AppError(409, "SLUG_TAKEN", "Já existe uma empresa com este slug");
      }
    }

    // Merge da metadata: preserva googlePlaceId existente quando não é enviado.
    const existingMeta = parsePreRegisterMetadata(org.metadata);
    const nextMeta = buildPreRegisterMetadata({
      googlePlaceId: input.googlePlaceId !== undefined ? input.googlePlaceId : existingMeta.googlePlaceId,
      formattedAddress: input.formattedAddress !== undefined ? input.formattedAddress : existingMeta.formattedAddress,
      logoUrl: input.logoUrl !== undefined ? input.logoUrl : existingMeta.logoUrl,
      categorySlugs:
        input.categorySlugs !== undefined
          ? input.categorySlugs === null
            ? []
            : input.categorySlugs
          : existingMeta.categorySlugs,
    });

    const row = await preRegisterRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
      metadata: nextMeta,
    });

    if (!row) throw new AppError(404, "NOT_FOUND", "Empresa pré-registada não encontrada");
    return { id: row.id, name: row.name, slug: row.slug, verificationStatus: row.verificationStatus };
  }

  async remove(id: string) {
    const org = await preRegisterRepository.findByIdOrg(id);
    if (!org) throw new AppError(404, "NOT_FOUND", "Empresa pré-registada não encontrada");
    if (org.verificationStatus !== "pre_registered") {
      throw new AppError(409, "ALREADY_COMPLETED", "Esta empresa já iniciou o registo e não pode ser eliminada");
    }
    await preRegisterRepository.remove(id);
    return { ok: true };
  }

  async listPublic() {
    const items = await preRegisterRepository.listPublic();
    return items;
  }

  async getById(id: string) {
    const org = await preRegisterRepository.findByIdOrg(id);
    if (!org) throw new AppError(404, "NOT_FOUND", "Empresa pré-registada não encontrada");
    if (org.verificationStatus !== "pre_registered") {
      throw new AppError(409, "ALREADY_COMPLETED", "Esta empresa já não está em pré-registo");
    }
    const meta = parsePreRegisterMetadata(org.metadata);
    const origin = preRegisterNotificationService.webOrigin();
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      contactName: org.contactName,
      contactPhone: org.contactPhone,
      contactEmail: org.contactEmail,
      formattedAddress: meta.formattedAddress ?? null,
      googlePlaceId: meta.googlePlaceId ?? null,
      logoUrl: meta.logoUrl ?? null,
      categorySlugs: meta.categorySlugs ?? [],
      completionUrl: org.completionToken ? `${origin}/pre-register/${org.completionToken}` : null,
      completionTokenExpiresAt: org.completionTokenExpiresAt?.toISOString() ?? null,
      preRegisteredAt: org.preRegisteredAt?.toISOString() ?? null,
    };
  }

  async regenerateToken(id: string, actorSystemRole: string) {
    if (actorSystemRole !== "admin") {
      throw new AppError(403, "FORBIDDEN", "Só administradores podem gerar novos links de registo");
    }
    const org = await preRegisterRepository.findByIdOrg(id);
    if (!org) throw new AppError(404, "NOT_FOUND", "Empresa pré-registada não encontrada");
    if (org.verificationStatus !== "pre_registered") {
      throw new AppError(409, "ALREADY_COMPLETED", "Esta empresa já iniciou o registo");
    }
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + COMPLETION_TOKEN_TTL_MS);
    await preRegisterRepository.updateToken(id, token, expiresAt);
    void preRegisterNotificationService
      .notifyCompanyPreRegister({
        companyName: org.name,
        contactName: org.contactName ?? org.name,
        contactPhone: org.contactPhone,
        contactEmail: org.contactEmail,
        completionUrl: `${preRegisterNotificationService.webOrigin()}/pre-register/${token}`,
      })
      .catch((e) => console.error("[pre-register] falha ao notificar:", e instanceof Error ? e.message : String(e)));
    return { completionToken: token, completionTokenExpiresAt: expiresAt.toISOString() };
  }

  async resendNotification(id: string, actorSystemRole: string) {
    if (actorSystemRole !== "admin") {
      throw new AppError(403, "FORBIDDEN", "Só administradores podem reenviar notificações");
    }
    const org = await preRegisterRepository.findByIdOrg(id);
    if (!org) throw new AppError(404, "NOT_FOUND", "Empresa pré-registada não encontrada");
    if (org.verificationStatus !== "pre_registered") {
      throw new AppError(409, "ALREADY_COMPLETED", "Esta empresa já iniciou o registo");
    }
    if (!org.completionToken) {
      throw new AppError(409, "NO_TOKEN", "Esta empresa não tem um link de registo para notificar");
    }
    await preRegisterNotificationService
      .notifyCompanyPreRegister({
        companyName: org.name,
        contactName: org.contactName ?? org.name,
        contactPhone: org.contactPhone,
        contactEmail: org.contactEmail,
        completionUrl: `${preRegisterNotificationService.webOrigin()}/pre-register/${org.completionToken}`,
      })
      .catch((e) => console.error("[pre-register] falha ao notificar:", e instanceof Error ? e.message : String(e)));
    return { renotified: true };
  }
}

export const preRegisterService = new PreRegisterService();
