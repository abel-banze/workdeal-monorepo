import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { preRegisterController } from "../controllers/pre-register.controller.js";

// Rotas públicas de completamento do pré-registo — acesso via token único.
export const preRegisterRoute = new Hono<Env>();

// Devolve os dados da empresa associada ao token (sem auth — o token é a credencial).
preRegisterRoute.get("/:token", async (c) => {
  const { body, status } = await preRegisterController.lookup(c.req.param("token"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// A empresa (autenticada), depois de criar a conta, reclama a organização pré-registada.
preRegisterRoute.post("/:token/claim", requireAuth, async (c) => {
  const { body, status } = await preRegisterController.claim(c.req.param("token"), c.get("user").id);
  return c.json(body, status);
});
