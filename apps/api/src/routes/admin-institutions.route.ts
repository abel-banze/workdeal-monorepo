import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { adminInstitutionsController } from "../controllers/admin-institutions.controller.js";
import { adminInstitutionsListQuerySchema, adminInstitutionMembershipsQuerySchema, institutionCreateSchema, institutionUpdateSchema } from "@workdeal/shared";

export const adminInstitutionsRoute = new Hono<Env>();

// Visão da equipa (lista/consulta) — admin e moderador
adminInstitutionsRoute.use("*", requireAuth, requireSystemRole("admin", "moderator"));

adminInstitutionsRoute.get("/", zValidator("query", adminInstitutionsListQuerySchema), async (c) => {
  const { body, status } = await adminInstitutionsController.list(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminInstitutionsRoute.get("/:id", async (c) => {
  const { body, status } = await adminInstitutionsController.get(c.req.param("id"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminInstitutionsRoute.get("/:id/memberships", zValidator("query", adminInstitutionMembershipsQuerySchema), async (c) => {
  const { body, status } = await adminInstitutionsController.listMemberships(c.req.param("id"), c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

// Mutações — só administradores
adminInstitutionsRoute.post("/", requireSystemRole("admin"), zValidator("json", institutionCreateSchema), async (c) => {
  const { body, status } = await adminInstitutionsController.create(c.get("user").systemRole, c.get("user").id, c.req.valid("json"));
  return c.json(body, status);
});

adminInstitutionsRoute.patch("/:id", requireSystemRole("admin"), zValidator("json", institutionUpdateSchema), async (c) => {
  const { body, status } = await adminInstitutionsController.update(c.get("user").systemRole, c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

adminInstitutionsRoute.post("/:id/verify", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminInstitutionsController.verify(c.get("user").systemRole, c.req.param("id"));
  return c.json(body, status);
});

adminInstitutionsRoute.post("/:id/unverify", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminInstitutionsController.unverify(c.get("user").systemRole, c.req.param("id"));
  return c.json(body, status);
});

adminInstitutionsRoute.post("/memberships/:membershipId/approve", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminInstitutionsController.approveMembership(c.get("user").systemRole, c.req.param("membershipId"));
  return c.json(body, status);
});

adminInstitutionsRoute.post("/memberships/:membershipId/reject", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminInstitutionsController.rejectMembership(c.get("user").systemRole, c.req.param("membershipId"));
  return c.json(body, status);
});

adminInstitutionsRoute.post("/memberships/:membershipId/verify", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminInstitutionsController.verifyMembership(c.get("user").systemRole, c.req.param("membershipId"));
  return c.json(body, status);
});

adminInstitutionsRoute.post("/memberships/:membershipId/revoke", requireSystemRole("admin"), async (c) => {
  const { body, status } = await adminInstitutionsController.revokeMembership(c.get("user").systemRole, c.req.param("membershipId"));
  return c.json(body, status);
});