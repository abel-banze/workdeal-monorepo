import dotenv from "dotenv";

// Em produção (Vercel) as env vars já vêm injectadas via dashboard — não há ficheiro .env
// Este módulo só deve carregar .env em desenvolvimento local.
// Mantido como side-effect import para compatibilidade com `bun run src/index.ts`.
if (process.env.NODE_ENV !== "production") {
  // Tenta primeiro .env na CWD (comportamento padrão do dotenv)
  dotenv.config();
  // Fallback para monorepo: quando a API corre a partir de apps/api, o .env está em ../../.env
  dotenv.config({ path: "../../.env" });
  dotenv.config({ path: "../../../.env" });
}
