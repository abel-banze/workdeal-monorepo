import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, type Env } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import { adminInvitesController } from "../controllers/admin-invites.controller.js";
import { adminInviteCreateSchema, adminInviteListQuerySchema, adminInviteAcceptSchema } from "@workdeal/shared";

export const adminInvitesRoute = new Hono<Env>();

// Lista — admin e moderador (visão partilhada da equipa)
adminInvitesRoute.get("/", requireSystemRole("admin", "moderator"), zValidator("query", adminInviteListQuerySchema), async (c) => {
  const { body, status } = await adminInvitesController.list(c.req.valid("query"), c.get("user").systemRole);
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// CRUD de convites — só administradores
adminInvitesRoute.post("/", requireSystemRole("admin"), zValidator("json", adminInviteCreateSchema), async (c) => {
  const { body, status } = await adminInvitesController.create(
    c.get("user").systemRole,
    c.get("user").id,
    c.req.valid("json"),
  );
  return c.json(body, status);
});

adminInvitesRoute.post("/:id/revoke", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminInvitesController.revoke(c.get("user").systemRole, c.req.param("id"));
  return c.json(body, status);
});

adminInvitesRoute.post("/:id/regenerate", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminInvitesController.regenerate(c.get("user").systemRole, c.req.param("id"));
  return c.json(body, status);
});

// Aceitar convite: qualquer utilizador autenticado cujo email coincida
adminInvitesRoute.post("/accept", requireAuth, zValidator("json", adminInviteAcceptSchema), async (c) => {
  const { body, status } = await adminInvitesController.accept(c.req.valid("json").token, {
    userId: c.get("user").id,
    email: c.get("user").email,
    role: c.get("user").systemRole,
  });
  return c.json(body, status);
});