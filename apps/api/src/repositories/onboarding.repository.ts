import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  profile,
  profileCategory,
  category,
  companyQualification,
  profileLocation,
  profileTag,
  profileContactVerification,
  tag,
} from "@workdeal/db";

type QualificationInsert = typeof companyQualification.$inferInsert;
type LocationInsert = typeof profileLocation.$inferInsert;

export interface CompleteOnboardingParams {
  organizationId: string;
  profileData: typeof profile.$inferInsert;
  categoryIds: string[];
  verifiedContacts?: { channel: "whatsapp" | "phone" | "email"; identifier: string }[];
  qualification?:
    | (Pick<QualificationInsert, "workers" | "companySize"> &
        Partial<Omit<QualificationInsert, "id" | "organizationId" | "profileId" | "workers" | "companySize">>)
    | null;
  location?:
    | (Pick<LocationInsert, "province"> &
        Partial<Omit<LocationInsert, "id" | "profileId" | "organizationId" | "province">>)
    | null;
  tagSlugs: string[];
}

export interface CompleteOnboardingResult {
  profileId: string;
  created: boolean;
}

// Único ponto de escrita atómica do onboarding: perfil + categorias +
// qualificação + localização + tags numa só transação. Ou gruda tudo, ou nada.
class OnboardingRepository {
  async complete(params: CompleteOnboardingParams): Promise<CompleteOnboardingResult> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: profile.id })
        .from(profile)
        .where(eq(profile.organizationId, params.organizationId))
        .limit(1);

      let profileId: string;
      let created: boolean;

      if (existing) {
        const [updated] = await tx
          .update(profile)
          .set({ ...params.profileData, id: undefined, updatedAt: new Date(), deletedAt: null })
          .where(eq(profile.id, existing.id))
          .returning({ id: profile.id });
        if (!updated) throw new Error("Falha ao actualizar perfil no onboarding");
        profileId = updated.id;
        created = false;
      } else {
        const [inserted] = await tx.insert(profile).values(params.profileData).returning({ id: profile.id });
        if (!inserted) throw new Error("Falha ao criar perfil no onboarding");
        profileId = inserted.id;
        created = true;
      }

      // Categorias — replace-all (semântica igual ao resto do perfil)
      await tx.delete(profileCategory).where(eq(profileCategory.profileId, profileId));
      const cats = await tx.select({ id: category.id }).from(category).where(inArray(category.id, params.categoryIds));
      if (cats.length !== params.categoryIds.length) {
        throw new Error("Categoria inválida no onboarding");
      }
      if (params.categoryIds.length > 0) {
        await tx.insert(profileCategory).values(
          params.categoryIds.map((categoryId, i) => ({ profileId, categoryId, isPrimary: i === 0 })),
        );
      }

      // Qualificação — upsert por organizationId (unique)
      if (params.qualification) {
        await tx
          .insert(companyQualification)
          .values({
            id: crypto.randomUUID(),
            ...params.qualification,
            organizationId: params.organizationId,
            profileId,
          })
          .onConflictDoUpdate({
            target: companyQualification.organizationId,
            set: { ...params.qualification, profileId, updatedAt: new Date() },
          });
      }

      // Localização primária — substitui a anterior
      if (params.location) {
        await tx
          .delete(profileLocation)
          .where(and(eq(profileLocation.profileId, profileId), eq(profileLocation.isPrimary, true)));
        await tx.insert(profileLocation).values({
          id: crypto.randomUUID(),
          ...params.location,
          profileId,
          organizationId: params.organizationId,
          isPrimary: true,
        });
      }

      // Tags — resolve slugs existentes e faz replace (slugs desconhecidos são ignorados)
      await tx.delete(profileTag).where(eq(profileTag.profileId, profileId));
      if (params.tagSlugs.length > 0) {
        const tags = await tx.select({ id: tag.id }).from(tag).where(inArray(tag.slug, params.tagSlugs));
        if (tags.length > 0) {
          await tx.insert(profileTag).values(tags.map((t) => ({ profileId, tagId: t.id })));
        }
      }

      // Contactos verificados — persistência do estado "verificado" por canal
      await tx.delete(profileContactVerification).where(eq(profileContactVerification.profileId, profileId));
      if (params.verifiedContacts && params.verifiedContacts.length > 0) {
        await tx.insert(profileContactVerification).values(
          params.verifiedContacts.map((v) => ({
            id: crypto.randomUUID(),
            profileId,
            channel: v.channel,
            identifier: v.identifier,
            verifiedAt: new Date(),
          })),
        );
      }

      return { profileId, created };
    });
  }

  async findOrganizationProfileId(organizationId: string): Promise<string | null> {
    const [row] = await db
      .select({ id: profile.id })
      .from(profile)
      .where(and(eq(profile.organizationId, organizationId)))
      .limit(1);
    return row?.id ?? null;
  }

  async slugExists(slug: string): Promise<boolean> {
    const [row] = await db.select({ id: profile.id }).from(profile).where(eq(profile.slug, slug)).limit(1);
    return !!row;
  }
}

export const onboardingRepository = new OnboardingRepository();
