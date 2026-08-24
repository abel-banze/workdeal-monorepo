import { z } from "zod";

const envSchema = z.object({
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  API_URL: z.string().url().default("http://localhost:4000"),
  ZERNIO_API_KEY: z.string().min(1).optional(),
  ZERNIO_PHONE_ID: z.string().min(1).optional(),
  SMS_API_URL: z.string().url().optional(),
  SMS_USER_TOKEN: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);

function mask(v: string | undefined, show = 4): string {
  if (!v) return "∅ VAZIA";
  if (v.length <= show * 2) return `${v.slice(0, 1)}***${v.slice(-1)} (${v.length}ch)`;
  return `${v.slice(0, show)}...${v.slice(-show)} (${v.length}ch)`;
}
function hostOf(url: string | undefined): string {
  if (!url) return "∅";
  try { return new URL(url).host; } catch { return "URL inválida"; }
}
console.log(`[env:web] runtime=${process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "local"} commit=${process.env.VERCEL_GIT_COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7) ?? "-"}`);
for (const k of ["BETTER_AUTH_URL", "API_URL", "RESEND_API_KEY", "VERCEL_ENV", "VERCEL_GIT_COMMIT_REF"] as const) {
  const v = (process.env as Record<string, string | undefined>)[k] ?? (env as Record<string, unknown>)[k] as string | undefined;
  if (k === "RESEND_API_KEY") console.log(`[env:web] ${k}=${mask(v)}`);
  else console.log(`[env:web] ${k}=${v ? (String(v).length > 80 ? `${String(v).slice(0,80)}… (${String(v).length}ch)` : String(v)) : "∅ VAZIA"} host=${hostOf(v)}`);
}
