import type { AuthUser, CreateReviewInput } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { reviewsService } from "../services/reviews.service.js";

export const reviewsController = {
  async create(user: AuthUser, input: CreateReviewInput) {
    const row = await reviewsService.createReview(user, input);
    return { body: ok(row), status: 201 as const };
  },
  async list(profileId: string) {
    const rows = await reviewsService.listReviews(profileId);
    return { body: ok(rows), status: 200 as const };
  },
  async remove(user: AuthUser, reviewId: string) {
    await reviewsService.deleteReview(user, reviewId);
    return { body: ok(null), status: 200 as const };
  },
};
