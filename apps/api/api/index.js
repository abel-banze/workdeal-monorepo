import app from "../dist/index.js";

// Vercel Serverless Function - Hono
// `api/index.js` é detetado automaticamente como Function em /api.
// `vercel.json` faz rewrite de todas as rotas para aqui.
export default app;
