import { db, badge, organization, profile, profileBadge } from "@workdeal/db";
import { eq } from "drizzle-orm";
import {
  type VerificationListQuery,
  VERIFICATION_DOCUMENT_TYPES,
  missingVerificationDocuments,
  verificationDocumentLabel,
} from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { verificationsRepository } from "../repositories/verifications.repository.js";
import { logger } from "@workdeal/shared/lib/logger";

function newId(): string {
  return `vr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

class VerificationsService {
  async list(query: VerificationListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await verificationsRepository.listByStatus(query.status, page, limit);
    return { items, total, page, limit };
  }

  async review(id: string, status: "approved" | "rejected", reviewerUserId: string, reviewNote?: string) {
    const existing = await verificationsRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Pedido de verificação não encontrado");
    if (existing.status !== "pending" && existing.status !== "in_review") {
      throw new AppError(409, "INVALID_TRANSITION", `Transição inválida de ${existing.status} para ${status}`);
    }

    const updated = await verificationsRepository.updateStatus(id, status, reviewerUserId, reviewNote);
    if (!updated) throw new AppError(404, "NOT_FOUND", "Pedido não encontrado");

    if (status === "approved") {
      await this.assignBadgeForLevel(updated);
    }
    return updated;
  }

  async create(profileId: string, documents: unknown, level: "level1" | "level2" = "level1") {
    // Permite re-submissão: só bloqueia se já existe pending/in_review
    const pending = await db
      .select()
      .from((await import("@workdeal/db")).verificationRequest)
      .where(eq((await import("@workdeal/db")).verificationRequest.profileId, profileId))
      .then((rows) => rows.find((r) => r.status === "pending" || r.status === "in_review"));
    if (pending) throw new AppError(409, "ALREADY_PENDING", "Já existe um pedido pendente");
    const docs = Array.isArray(documents) ? documents : [];
    if (docs.length > VERIFICATION_DOCUMENT_TYPES.length) {
      throw new AppError(400, "TOO_MANY_DOCUMENTS", `Máximo ${VERIFICATION_DOCUMENT_TYPES.length} documentos`);
    }
    const knownTypes = VERIFICATION_DOCUMENT_TYPES.map((d) => d.id) as string[];
    const invalidType = docs.find((d) => typeof d === "object" && d && "type" in d && !knownTypes.includes((d as { type: string }).type));
    if (invalidType) {
      throw new AppError(400, "INVALID_DOCUMENT_TYPE", "Tipo de documento inválido no pedido");
    }
    // 1º grau exige os documentos obrigatórios — validação de novo no servidor
    const missing = missingVerificationDocuments(docs as Array<{ type: string }>, level);
    if (missing.length > 0) {
      const labels = missing.map((t) => verificationDocumentLabel(t)).join(", ");
      throw new AppError(400, "DOCUMENTS_REQUIRED", `Faltam documentos obrigatórios: ${labels}`);
    }
    return verificationsRepository.create({ id: newId(), profileId, documents: docs as never, status: "pending" as never, level: level as never });
  }

  private async assignBadgeForLevel(vr: { profileId: string; level: "level1" | "level2" | null }) {
    // 1º grau (level1) = todos os documentos de registo legal → badge "verified"
    // 2º grau (level2) = ainda em processo de legalização → badge "in-legalization"
    const slug = vr.level === "level2" ? "in-legalization" : "verified";
    const verified = await db.select().from(badge).where(eq(badge.slug, slug)).limit(1).then((r) => r[0]);
    if (!verified) {
      logger.error(`Badge ${slug} não semeado`, { profileId: vr.profileId });
      throw new AppError(500, "BADGE_NOT_SEEDED", "Selo de verificação não configurado");
    }
    await db
      .insert(profileBadge)
      .values({ profileId: vr.profileId, badgeId: verified.id, origin: "manual" as never, status: "active" as never })
      .onConflictDoNothing();

    // Só marca a organização como "verified" no 1º grau (empresa totalmente legalizada)
    if (vr.level === "level1") {
      const [prof] = await db.select({ organizationId: profile.organizationId }).from(profile).where(eq(profile.id, vr.profileId)).limit(1);
      if (prof?.organizationId) {
        await db
          .update(organization)
          .set({ verificationStatus: "verified" as never, verifiedAt: new Date() })
          .where(eq(organization.id, prof.organizationId));
      }
    }
  }
}

export const verificationsService = new VerificationsService();
