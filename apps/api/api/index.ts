import app from "../dist/index.js";

// Vercel Serverless Function - Hono
// `api/index.ts` é detetado automaticamente como Function em /api.
// `vercel.json` faz rewrite de todas as rotas para aqui, então Hono trata o routing.
// Importa do `dist` já bundlado (com @workdeal/* inline) para evitar
// `ERR_MODULE_NOT_FOUND: @workdeal/auth/src/index.ts` em runtime Node.
export default app;
