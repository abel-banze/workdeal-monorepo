import dotenv from "dotenv";

// Em produção (Vercel, Root Directory = apps/api) as env vars já vêm injectadas via dashboard — não há ficheiro .env
// Em dev, carrega por projecto: apps/api/.env > apps/api/.env.local (prioridade per-project)
if (process.env.NODE_ENV !== "production") {
  // CWD = apps/api quando corre `bun run src/index.ts` ou `pnpm --filter @workdeal/api dev`
  dotenv.config(); // apps/api/.env
  dotenv.config({ path: ".env.local", override: false });
  // Compat legado: se ainda existir .env na raiz do monorepo, carrega sem sobrescrever (transição)
  dotenv.config({ path: "../../.env", override: false });
  dotenv.config({ path: "../../.env.local", override: false });
  dotenv.config({ path: "../../../.env", override: false });
}

// Diagnóstico de env em sandbox/preview — mostra início/fim para detectar vazias/mal-configuradas sem expor segredo
function mask(v: string | undefined, show = 4): string {
  if (!v) return "∅ VAZIA";
  if (v.length <= show * 2) return `${v.slice(0, 1)}***${v.slice(-1)} (${v.length}ch)`;
  return `${v.slice(0, show)}...${v.slice(-show)} (${v.length}ch)`;
}
function hostOf(url: string | undefined): string {
  if (!url) return "∅";
  try { return new URL(url).host; } catch { return "URL inválida"; }
}
const _diagKeys = ["DATABASE_URL", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "ALLOWED_ORIGINS", "RESEND_API_KEY", "INTERNAL_API_SECRET", "NODE_ENV", "VERCEL_ENV", "VERCEL_GIT_COMMIT_REF"] as const;
console.log(`[env:api] runtime=${process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "local"} commit=${process.env.VERCEL_GIT_COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7) ?? "-"}`);
for (const k of _diagKeys) {
  const v = process.env[k];
  if (k === "DATABASE_URL" || k === "RESEND_API_KEY" || k === "BETTER_AUTH_SECRET" || k === "INTERNAL_API_SECRET") {
    console.log(`[env:api] ${k}=${mask(v)} host=${k === "DATABASE_URL" ? hostOf(v) : "-"}`);
  } else {
    console.log(`[env:api] ${k}=${v ? (v.length > 80 ? `${v.slice(0, 80)}… (${v.length}ch)` : v) : "∅ VAZIA"} host=${hostOf(v)}`);
  }
}
