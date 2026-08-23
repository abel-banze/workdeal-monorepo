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
  trustedOrigins: env.ALLOWED_ORIGINS.split(","),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
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
