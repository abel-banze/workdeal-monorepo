import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { verificationListQuerySchema, verificationReviewSchema } from "@workdeal/shared";
import { verificationsController } from "../controllers/verifications.controller.js";
import { reportsController } from "../controllers/reports.controller.js";
import { reportListQuerySchema } from "@workdeal/shared";
import { adminUsersController } from "../controllers/admin-users.controller.js";
import { adminOrganizationsController } from "../controllers/admin-organizations.controller.js";
import { adminUserListQuerySchema, adminOrgListQuerySchema, adminUpdateUserRoleSchema, adminUpdateOrgStatusSchema, preRegisterCompanySchema, preRegisterUpdateSchema } from "@workdeal/shared";
import { z } from "zod";
import { preRegisterController } from "../controllers/pre-register.controller.js";

export const adminRoute = new Hono<Env>();

// Todas as rotas admin exigem moderator|admin
adminRoute.use("*", requireAuth, requireSystemRole("admin", "moderator"));

adminRoute.get("/verifications", zValidator("query", verificationListQuerySchema), async (c) => {
  const { body, status } = await verificationsController.list(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminRoute.post("/verifications/:id/approve", zValidator("json", verificationReviewSchema), async (c) => {
  const { body, status } = await verificationsController.approve(c.req.param("id"), c.get("user").id, c.req.valid("json").reviewNote);
  return c.json(body, status);
});

adminRoute.post("/verifications/:id/reject", zValidator("json", verificationReviewSchema), async (c) => {
  const { body, status } = await verificationsController.reject(c.req.param("id"), c.get("user").id, c.req.valid("json").reviewNote);
  return c.json(body, status);
});

adminRoute.get("/reports", zValidator("query", reportListQuerySchema), async (c) => {
  const { body, status } = await reportsController.list(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminRoute.patch("/reports/:id", zValidator("json", z.object({ status: z.enum(["resolved", "dismissed"]) })), async (c) => {
  const { body, status } = await reportsController.updateStatus(c.req.param("id"), c.req.valid("json").status);
  return c.json(body, status);
});

// --- Utilizadores ---
adminRoute.get("/users", zValidator("query", adminUserListQuerySchema), async (c) => {
  const { body, status } = await adminUsersController.list(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminRoute.patch("/users/:id/role", zValidator("json", adminUpdateUserRoleSchema), async (c) => {
  const { body, status } = await adminUsersController.updateRole(c.get("user").systemRole, c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

// --- Empresas (organizations) ---
adminRoute.get("/organizations", zValidator("query", adminOrgListQuerySchema), async (c) => {
  const { body, status } = await adminOrganizationsController.list(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminRoute.patch("/organizations/:id/verification", zValidator("json", adminUpdateOrgStatusSchema), async (c) => {
  const { body, status } = await adminOrganizationsController.updateStatus(c.get("user").systemRole, c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

// --- Pré-registo de empresas (promoter) ---
adminRoute.post("/organizations/pre-register", zValidator("json", preRegisterCompanySchema), async (c) => {
  const { body, status } = await preRegisterController.create(c.get("user").id, c.req.valid("json"));
  return c.json(body, status);
});

adminRoute.patch("/organizations/pre-register/:id", zValidator("json", preRegisterUpdateSchema), async (c) => {
  const { body, status } = await preRegisterController.update(c.req.param("id"), c.req.valid("json"));
  return c.json(body, status);
});

adminRoute.delete("/organizations/pre-register/:id", async (c) => {
  const { body, status } = await preRegisterController.remove(c.req.param("id"));
  return c.json(body, status);
});

adminRoute.get("/organizations/pre-registered", zValidator("query", adminOrgListQuerySchema), async (c) => {
  const { body, status } = await preRegisterController.list(c.req.valid("query"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

adminRoute.get("/organizations/pre-register/:id", async (c) => {
  const { body, status } = await preRegisterController.getById(c.req.param("id"));
  return c.json(body, status);
});

adminRoute.post("/organizations/:id/pre-register/regenerate-token", async (c) => {
  const { body, status } = await preRegisterController.regenerateToken(c.get("user").systemRole, c.req.param("id"));
  return c.json(body, status);
});

adminRoute.post("/organizations/:id/pre-register/resend-notification", async (c) => {
  const { body, status } = await preRegisterController.resendNotification(c.get("user").systemRole, c.req.param("id"));
  return c.json(body, status);
});

adminRoute.get("/metrics", async (c) => {
  const { db, verificationRequest, report } = await import("@workdeal/db");
  const { sql } = await import("drizzle-orm");
  const [pendingVerifications] = await db.select({ count: sql<number>`count(*)::int` }).from(verificationRequest).where(sql`${verificationRequest.status} = 'pending'`);
  const [pendingReports] = await db.select({ count: sql<number>`count(*)::int` }).from(report).where(sql`${report.status} = 'pending'`);
  const [avg] = await db
    .select({ avgHours: sql<number>`avg(EXTRACT(EPOCH FROM (${verificationRequest.reviewedAt} - ${verificationRequest.createdAt}))/3600)::float` })
    .from(verificationRequest)
    .where(sql`${verificationRequest.reviewedAt} IS NOT NULL`);
  return c.json({ success: true, data: { pendingVerifications: pendingVerifications?.count ?? 0, pendingReports: pendingReports?.count ?? 0, avgVerificationHours: avg?.avgHours ?? null } });
});

adminRoute.post("/badges/run", async (c) => {
  const { runBadgeJob } = await import("../services/badges.job.js");
  await runBadgeJob();
  return c.json({ success: true, data: { ranAt: new Date().toISOString() } });
});
