import { getOrgRole } from "@workdeal/auth";
import {
  classifyCompanySize,
  hasOrgPermission,
  normalizeBusinessHours,
} from "@workdeal/shared";
import type { CompanySize, LegalForm } from "@workdeal/shared/lib/company-size";
import { contactIdentifier } from "@workdeal/shared/lib/phone";
import type { ContactChannel } from "@workdeal/shared/lib/phone";
import type { AuthUser, OnboardingCompleteInput } from "@workdeal/shared";
import type { ContactVerificationPayload } from "@workdeal/shared/lib/contact-verification";
import { AppError } from "../lib/errors.js";
import { onboardingRepository } from "../repositories/onboarding.repository.js";

class OnboardingService {
  async complete(
    user: AuthUser,
    input: OnboardingCompleteInput,
    verifiedContacts: ContactVerificationPayload[],
  ): Promise<{ profileId: string; created: boolean }> {
    // 1. RBAC — quem pode editar o perfil desta organização
    const role = await getOrgRole(user.id, input.organizationId);
    if (!role || !hasOrgPermission(role, "profile:edit")) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para completar o onboarding desta organização");
    }

    // 2. Bind de contacto verificado — o contacto gravado tem de ser um dos que
    // passou OTP no servidor (token HMAC emitido na verificação)
    this.assertVerifiedContact(input.profile.whatsapp ?? null, input.profile.phone ?? null, input.profile.email ?? null, verifiedContacts);

    // 3. Slug único e estável (idempotente em retry: mantém o do perfil existente)
    const existingProfileId = await onboardingRepository.findOrganizationProfileId(input.organizationId);
    let slug = input.profile.slug ?? "";
    if (!existingProfileId && !slug) {
      slug = await this.uniqueSlug(input.profile.name);
    }

    // 4. Horários → formato canónico; qualificação com tamanho calculado server-side
    const qualification = input.qualification
      ? {
          workers: input.qualification.workers,
          turnoverMzn: input.qualification.turnoverMzn ?? null,
          foundedYear: input.qualification.foundedYear ?? null,
          legalForm: (input.qualification.legalForm ?? null) as LegalForm | null,
          nuit: input.qualification.nuit || null,
          alvara: input.qualification.alvara || null,
          capitalSocialMzn: input.qualification.capitalSocialMzn ?? null,
          licenses: input.qualification.licenses ?? null,
          companySize: classifyCompanySize({
            workers: input.qualification.workers,
            turnoverMzn: input.qualification.turnoverMzn ?? null,
          }) as CompanySize,
        }
      : null;

    const result = await onboardingRepository.complete({
      organizationId: input.organizationId,
      profileData: {
        type: "company",
        userId: null,
        organizationId: input.organizationId,
        slug,
        name: input.profile.name,
        tagline: input.profile.tagline ?? null,
        description: input.profile.description ?? null,
        logoUrl: input.profile.logoUrl ?? null,
        coverUrl: input.profile.coverUrl ?? null,
        latitude: input.location?.latitude ?? input.profile.latitude ?? null,
        longitude: input.location?.longitude ?? input.profile.longitude ?? null,
        whatsapp: input.profile.whatsapp ?? null,
        phone: input.profile.phone ?? null,
        email: input.profile.email ?? null,
        website: input.profile.website ?? null,
        googlePlaceId: input.profile.googlePlaceId ?? null,
        formattedAddress: input.profile.formattedAddress ?? null,
        businessHours: normalizeBusinessHours(input.profile.businessHours),
        status: "active",
      },
      categoryIds: input.profile.categoryIds,
      qualification,
      location: input.location
        ? {
            province: input.location.province,
            district: input.location.district ?? null,
            bairro: input.location.bairro ?? null,
            address: input.location.address ?? null,
            latitude: input.location.latitude ?? null,
            longitude: input.location.longitude ?? null,
            visibility: input.location.visibility,
          }
        : null,
      tagSlugs: input.tagSlugs ?? [],
    });

    // Boas-vindas da empresa — só no primeiro publish (created), não em re-edits
    if (result.created) {
      // fire-and-forget: não bloqueia resposta, não falha onboarding se email falhar
      void import("../services/email.service.js").then(({ sendWelcomeCompanyEmail }) =>
        sendWelcomeCompanyEmail({
          to: user.email,
          name: user.name ?? user.email,
          companyName: input.profile.name,
          profileSlug: slug || result.profileId,
          profileId: result.profileId,
        }).catch((e) => console.error("[Onboarding] Falha welcome empresa:", e)),
      );
    }

    return result;
  }

  private assertVerifiedContact(
    whatsapp: string | null,
    phone: string | null,
    email: string | null,
    verifiedContacts: ContactVerificationPayload[],
  ): void {
    const submitted: Array<{ channel: ContactChannel; identifier: string }> = [];
    const wa = contactIdentifier("whatsapp", whatsapp);
    if (wa) submitted.push({ channel: "whatsapp", identifier: wa });
    const ph = contactIdentifier("phone", phone);
    if (ph && ph !== wa) submitted.push({ channel: "phone", identifier: ph });
    const em = contactIdentifier("email", email);
    if (em) submitted.push({ channel: "email", identifier: em });

    if (submitted.length === 0) {
      throw new AppError(400, "NO_CONTACT", "Pelo menos um contacto é obrigatório");
    }
    const verifiedSet = new Set(verifiedContacts.map((v) => `${v.channel}:${v.identifier}`));
    const ok = submitted.some((s) => verifiedSet.has(`${s.channel}:${s.identifier}`));
    if (!ok) {
      throw new AppError(
        403,
        "CONTACT_NOT_VERIFIED",
        "Confirma pelo menos um dos contactos indicados (verificação por código) antes de publicar",
      );
    }
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64) || "company";
    let slug = base;
    for (let i = 2; await onboardingRepository.slugExists(slug); i++) {
      slug = `${base}-${i}`;
    }
    return slug;
  }
}

export const onboardingService = new OnboardingService();
