import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt, bearer, organization } from "better-auth/plugins";
import { db } from "@workdeal/db";
import * as schema from "@workdeal/db/schema";
import { env } from "./env.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url, token }) => {
      const { sendResetPasswordEmailAuth } = await import("./email.js");
      await sendResetPasswordEmailAuth(user.email, user.name ?? "", token, url);
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Não-bloqueante: erro/timeout de Resend nunca deve falhar o signup nem pendurar o request
        after: async (user) => {
          void import("./email.js")
            .then((m) => m.sendWelcomeAccountEmailAuth(user.email, (user as { name?: string }).name ?? user.email))
            .catch((e) => console.error("[Auth DB Hook] welcome after hook failed:", e instanceof Error ? e.message : String(e)));
        },
      },
    },
  },
  user: {
    additionalFields: {
      systemRole: {
        type: "string",
        input: false,
        defaultValue: "user",
      },
      phone: {
        type: "string",
        required: false,
      },
      locale: {
        type: "string",
        required: false,
        defaultValue: "pt-MZ",
      },
      deletedAt: {
        type: "date",
        required: false,
      },
    },
  },
  plugins: [
    organization({
      schema: {
        organization: {
          additionalFields: {
            verificationStatus: {
              type: "string",
              input: false,
              defaultValue: "pending",
            },
            verifiedAt: {
              type: "date",
              required: false,
            },
          },
        },
      },
    }),
    jwt({}),
    bearer(),
  ],
});
