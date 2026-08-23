import { eq } from "drizzle-orm";
import { db, companyQualification } from "@workdeal/db";

export class CompanyQualificationRepository {
  async upsert(data: typeof companyQualification.$inferInsert) {
    const [row] = await db
      .insert(companyQualification)
      .values(data)
      .onConflictDoUpdate({
        target: companyQualification.organizationId,
        set: {
          profileId: data.profileId,
          companySize: data.companySize,
          workers: data.workers,
          turnoverMzn: data.turnoverMzn,
          foundedYear: data.foundedYear,
          legalForm: data.legalForm,
          nuit: data.nuit,
          alvara: data.alvara,
          capitalSocialMzn: data.capitalSocialMzn,
          licenses: data.licenses,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async findByOrganizationId(organizationId: string) {
    const [row] = await db.select().from(companyQualification).where(eq(companyQualification.organizationId, organizationId)).limit(1);
    return row ?? null;
  }

  async findByProfileId(profileId: string) {
    const [row] = await db.select().from(companyQualification).where(eq(companyQualification.profileId, profileId)).limit(1);
    return row ?? null;
  }
}

export const companyQualificationRepository = new CompanyQualificationRepository();
