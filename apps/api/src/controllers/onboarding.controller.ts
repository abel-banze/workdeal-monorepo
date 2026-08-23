import type { AuthUser, OnboardingCompleteInput } from "@workdeal/shared";
import { parseVerifiedContacts } from "@workdeal/shared/lib/contact-verification";
import { env } from "../env.js";
import { ok } from "../lib/api-response.js";
import { onboardingService } from "../services/onboarding.service.js";

class OnboardingController {
  async complete(user: AuthUser, input: OnboardingCompleteInput, verifiedHeader: string | null) {
    // Tokens HMAC emitidos no sucesso da verificação OTP (web) — provam que o
    // contacto submetido passou verificação server-side
    const verified = parseVerifiedContacts(env.BETTER_AUTH_SECRET, verifiedHeader);
    const result = await onboardingService.complete(user, input, verified);
    return { body: ok(result), status: 200 as const };
  }
}

export const onboardingController = new OnboardingController();
