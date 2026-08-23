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
