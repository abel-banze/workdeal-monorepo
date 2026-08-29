import { z } from "zod";

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isPostgresUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "postgres:" || u.protocol === "postgresql:";
  } catch {
    return false;
  }
}

export const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL é obrigatória")
    .refine(isPostgresUrl, "DATABASE_URL deve ser postgres:// ou postgresql://"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET deve ter ≥32 caracteres"),
  BETTER_AUTH_URL: z.string().min(1).refine(isValidUrl, "BETTER_AUTH_URL deve ser URL válida"),
  ALLOWED_ORIGINS: z
    .string()
    .min(1, "ALLOWED_ORIGINS é obrigatória (CSV de URLs)")
    .refine(
      (v) => v.split(",").every((s) => isValidUrl(s.trim())),
      "ALLOWED_ORIGINS deve ser lista CSV de URLs válidas",
    ),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  // Segredo partilhado web↔API para endpoints só-internos (ex: POST /api/v1/email/*)
  INTERNAL_API_SECRET: z.string().min(32).optional(),
  SMS_API_URL: z.string().url().optional(),
  SMS_USER_TOKEN: z.string().min(8).optional(),
  ZERNIO_API_KEY: z.string().optional(),
  ZERNIO_PHONE_ID: z.string().optional(),
  // Opcionais futuros — mantidos aqui para fail-fast quando vierem a ser usados
  WHATSAPP_API_TOKEN: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().optional(),
  // CLOUDINARY_URL (formato standard cloudinary://api_key:api_secret@cloud_name) e
  // aliases curtos — aceites como fallback para quem já tem estas vars definidas
  // na plataforma (ex: Coolify). Nomes canónicos acima têm prioridade.
  CLOUDINARY_URL: z
    .string()
    .refine((v) => /^cloudinary:\/\/[^:]+:[^@]+@[^/]+$/.test(v), "CLOUDINARY_URL deve ser cloudinary://api_key:api_secret@cloud_name")
    .optional(),
  CLOUDINARY_NAME: z.string().optional(),
  CLOUDINARY_API: z.string().optional(),
  CLOUDINARY_SECRET: z.string().optional(),
  // Google Maps Platform — UMA SÓ CHAVE serve o Maps JS (browser, pin/pesquisa)
  // e a Places API (New) no servidor. GOOGLE_PLACES_API_KEY é opcional para quem
  // quiser chaves separadas; sem ela, o proxy usa esta.
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  PLACES_BIAS_LAT: z.coerce.number().min(-90).max(90).optional(), // centro do bias (default: Maputo -25.9692,32.5732)
  PLACES_BIAS_LNG: z.coerce.number().min(-180).max(180).optional(),
  PLACES_BIAS_RADIUS_KM: z.coerce.number().min(1).max(50000).optional(), // default 50
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${details}`);
  }
  return result.data;
}

export function formatAllowedOrigins(origins: string): string[] {
  return origins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Lazy — não valida no import top-level (evita throw durante build/bundle)
// Só valida quando uma propriedade é acedida em runtime (Vercel injecta env por projecto)
let _cachedEnv: Env | null = null;
function getCachedEnv(): Env {
  if (!_cachedEnv) _cachedEnv = parseEnv();
  return _cachedEnv;
}
export const env: Env = new Proxy({} as Env, {
  get(_t, prop) {
    return (getCachedEnv() as unknown as Record<string | symbol, unknown>)[prop as string];
  },
  has(_t, prop) {
    return prop in getCachedEnv();
  },
  ownKeys() {
    return Reflect.ownKeys(getCachedEnv());
  },
  getOwnPropertyDescriptor(_t, prop) {
    const v = getCachedEnv();
    return Reflect.getOwnPropertyDescriptor(v, prop);
  },
});
export function __clearEnvCache() {
  _cachedEnv = null;
}
