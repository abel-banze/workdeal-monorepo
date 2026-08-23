// Re-export lazy env de @workdeal/shared — validação só em runtime, por projecto (apps/api)
// Vercel com Root Directory = apps/api injecta vars só neste projecto
export { env, parseEnv, envSchema, __clearEnvCache } from "@workdeal/shared/lib/env";
