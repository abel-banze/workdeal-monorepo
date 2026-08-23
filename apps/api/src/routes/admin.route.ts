import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireSystemRole } from "../middlewares/rbac.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { verificationListQuerySchema, verificationReviewSchema } from "@workdeal/shared";
import { verificationsController } from "../controllers/verifications.controller.js";
import { reportsController } from "../controllers/reports.controller.js";
import { reportListQuerySchema } from "@workdeal/shared";
import { z } from "zod";

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
