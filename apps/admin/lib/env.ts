import { z } from "zod";

const envSchema = z.object({
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  BETTER_AUTH_SECRET: z.string().min(1),
  API_URL: z.string().url().default("http://localhost:4000"),
  NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
