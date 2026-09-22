import type { AuthUser, TrackOnboardingEventInput } from "@workdeal/shared";
import { onboardingAnalyticsRepository } from "../repositories/onboarding-analytics.repository.js";

export const onboardingAnalyticsService = {
  async track(user: AuthUser, input: TrackOnboardingEventInput) {
    return onboardingAnalyticsRepository.track({
      userId: user.id,
      visitorId: input.visitorId ?? null,
      step: input.step ?? null,
      action: input.action,
      metadata: input.metadata ?? null,
    });
  },

  async funnel(days: number) {
    return onboardingAnalyticsRepository.funnel(days);
  },

  async listEvents(query: { action?: string; step?: number; days: number; page: number; limit: number }) {
    return onboardingAnalyticsRepository.listEvents(query);
  },
};
