import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  API_URL: z.string().url().default("http://localhost:4000"),
  ZERNIO_API_KEY: z.string().min(1).optional(),
  ZERNIO_PHONE_ID: z.string().min(1).optional(),
  SMS_API_URL: z.string().url().optional(),
  SMS_USER_TOKEN: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
