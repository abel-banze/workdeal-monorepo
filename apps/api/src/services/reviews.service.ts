import type { AuthUser, CreateReviewInput } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { reviewsRepository } from "../repositories/reviews.repository.js";
import { profilesRepository } from "../repositories/profiles.repository.js";

function newId(): string {
  return `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

class ReviewsService {
  async createReview(user: AuthUser, input: CreateReviewInput) {
    const profile = await profilesRepository.findBySlug(input.profileId, { includeDeleted: false }).catch(() => null);
    // input.profileId pode ser id ou slug — tenta por id directo se slug não achou
    let profileRow = profile;
    if (!profileRow) {
      // fallback: busca por id
      const { db, profile: profileTable } = await import("@workdeal/db");
      const { eq } = await import("drizzle-orm");
      const [row] = await db.select().from(profileTable).where(eq(profileTable.id, input.profileId)).limit(1);
      if (!row) throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
      profileRow = { ...row, categories: [] } as never;
    }

    const owner = await reviewsRepository.findProfileOwner((profileRow as unknown as { id: string }).id);
    if (owner?.userId && owner.userId === user.id) {
      throw new AppError(403, "FORBIDDEN", "Não pode avaliar o próprio perfil");
    }

    const existing = await reviewsRepository.findByProfileAuthorOrigin(
      (profileRow as unknown as { id: string }).id,
      user.id,
      input.origin,
    );
    if (existing) {
      throw new AppError(409, "REVIEW_ALREADY_EXISTS", "Já avaliou este perfil nesta origem");
    }

    const row = await reviewsRepository.create({
      id: newId(),
      profileId: (profileRow as unknown as { id: string }).id,
      authorUserId: user.id,
      rating: input.rating,
      comment: input.comment ?? null,
      origin: input.origin,
    });
    return row;
  }

  async listReviews(profileIdOrSlug: string) {
    // resolve slug -> id
    const profile = await profilesRepository.findBySlug(profileIdOrSlug).catch(() => null);
    let id = (profile as unknown as { id?: string })?.id ?? profileIdOrSlug;
    if (profile) id = (profile as unknown as { id: string }).id;
    const rows = await reviewsRepository.findByProfile(id);
    return rows;
  }

  async deleteReview(user: AuthUser, reviewId: string) {
    const row = await reviewsRepository.findById(reviewId);
    if (!row) throw new AppError(404, "NOT_FOUND", "Avaliação não encontrada");
    // autor ou moderador/admin
    if (row.authorUserId !== user.id && user.systemRole !== "admin" && user.systemRole !== "moderator") {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para remover esta avaliação");
    }
    await reviewsRepository.deleteById(reviewId);
  }
}

export const reviewsService = new ReviewsService();
