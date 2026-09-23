import { db, badge, organization, profile, profileBadge } from "@workdeal/db";
import { eq } from "drizzle-orm";
import {
  type VerificationListQuery,
  type VerificationPaymentProofInput,
  type AuthUser,
  VERIFICATION_DOCUMENT_TYPES,
  VERIFICATION_LEVEL_LABELS_PT,
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
    void notifyVerificationDecision(updated).catch((e) =>
      console.error("[verifications] decision notify falhou", (e as Error).message?.slice(0, 500)),
    );
    return updated;
  }

  async create(
    profileId: string,
    documents: unknown,
    level: "level1" | "level2" = "level1",
    brNumber: string | null | undefined,
    payment?: VerificationPaymentProofInput,
    requester?: { user: AuthUser; profileName: string; organizationId: string | null },
  ) {
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
    // Comprovativo de pagamento do plano Workdeal Trust — se fornecido, validar campos obrigatórios
    let paymentProof: Record<string, unknown> | null = null;
    if (payment) {
      if (!payment.fileId || !payment.url) {
        throw new AppError(400, "PAYMENT_PROOF_REQUIRED", "Comprovativo de pagamento incompleto — anexa o ficheiro.");
      }
      paymentProof = {
        method: payment.method ?? "bank_transfer",
        fileId: payment.fileId,
        url: payment.url,
        name: payment.name ?? "",
        reference: payment.reference ?? "",
      };
    }
    return verificationsRepository.create({
      id: newId(),
      profileId,
      documents: docs as never,
      status: "pending" as never,
      level: level as never,
      brNumber: brNumber?.trim() || null,
      paymentProof: paymentProof as never,
    }).then((created) => {
      if (requester) {
        void notifyVerificationRequested({ ...requester, level }).catch((e) =>
          console.error("[verifications] request notify falhou", (e as Error).message?.slice(0, 500)),
        );
      }
      return created;
    });
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

// ── Notificações (via dispatcher central, fire-and-forget) ──────

async function notifyVerificationRequested(requester: {
  user: AuthUser;
  profileName: string;
  organizationId: string | null;
  level: "level1" | "level2";
}) {
  const { notificationsService } = await import("./notifications.service.js");
  const { verificationRequestedHtml } = await import("@workdeal/shared/lib/email-templates");
  const link = `/dashboard/${requester.organizationId ?? "personal"}/verification`;
  const subject = `Pedido de verificação recebido: ${requester.profileName}`;
  const html = verificationRequestedHtml({
    companyName: requester.profileName,
    level: VERIFICATION_LEVEL_LABELS_PT[requester.level] ?? requester.level,
    url: `https://workdeal.co.mz${link}`,
  });
  await notificationsService.dispatch({
    organizationId: requester.organizationId,
    userIds: [requester.user.id],
    type: "verification_update",
    title: "Pedido de verificação recebido",
    body: `«${requester.profileName}» — em análise (24–48h úteis).`,
    link,
    email: { to: requester.user.email, subject, html },
    metadata: {},
  });
}

async function notifyVerificationDecision(updated: {
  profileId: string;
  level: "level1" | "level2" | null;
  status: string;
  reviewNote?: string | null;
}) {
  const { notificationsService } = await import("./notifications.service.js");
  const { notificationsRepository } = await import("../repositories/notifications.repository.js");
  const { verificationDecisionHtml } = await import("@workdeal/shared/lib/email-templates");
  const recipients = await notificationsRepository.resolveProfileRecipients(updated.profileId).catch(() => null);
  if (!recipients || recipients.userIds.length === 0) return;
  const approved = updated.status === "approved";
  const level = updated.level ?? "level1";
  const title = approved ? "Empresa verificada" : "Pedido não aprovado";
  const link = `/dashboard/${recipients.organizationId ?? "personal"}/verification`;
  const subject = approved ? `Empresa verificada: ${recipients.profileName ?? "o teu perfil"}` : `Pedido não aprovado: ${recipients.profileName ?? "o teu perfil"}`;
  for (const userId of recipients.userIds) {
    const contact = await notificationsRepository.findUserContact(userId).catch(() => null);
    const html = verificationDecisionHtml({
      approved,
      companyName: recipients.profileName ?? "A tua empresa",
      level: VERIFICATION_LEVEL_LABELS_PT[level] ?? level,
      reviewNote: updated.reviewNote ?? null,
      url: `https://workdeal.co.mz${link}`,
    });
    await notificationsService.dispatch({
      organizationId: recipients.organizationId,
      userIds: [userId],
      type: "verification_update",
      title,
      body: approved ? "Selo Workdeal activo." : "Vê o motivo e submete de novo.",
      link,
      email: contact ? { to: contact.email, subject, html } : null,
      metadata: { profileId: updated.profileId },
    });
  }
}
