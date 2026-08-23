import "./load-env";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { auth } from "@workdeal/auth";
import { formatAllowedOrigins } from "@workdeal/shared/lib/env";
import { logger } from "@workdeal/shared/lib/logger";
import { env } from "./env";
import { AppError, errorHandler } from "./lib/errors";
import { authV1Route } from "./routes/auth.route";
import { profilesRoute } from "./routes/profiles.route";
import { categoriesRoute } from "./routes/categories.route";
import { healthRoute } from "./routes/health.route";
import { reviewsRoute } from "./routes/reviews.route";
import { followsRoute } from "./routes/follows.route";
import { adminRoute } from "./routes/admin.route";
import { reportsRoute } from "./routes/reports.route";
import { verificationsRoute } from "./routes/verifications.route";
import { companyQualificationRoute } from "./routes/company-qualification.route";
import { profileLocationsRoute } from "./routes/profile-locations.route";
import { tagsRoute } from "./routes/tags.route";
import { emailRoute } from "./routes/email.route";
import { quotesRoute } from "./routes/quotes.route";
import { filesRoute } from "./routes/files.route";
import { placesRoute } from "./routes/places.route";
import { onboardingRoute } from "./routes/onboarding.route";
import { metricsRoute } from "./routes/metrics.route";
import { portfolioRoute } from "./routes/portfolio.route";
import { servicesRoute } from "./routes/services.route";

const app = new Hono();

app.use("*", requestId());
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const durationMs = Date.now() - start;
  const requestIdVal = c.req.header("X-Request-Id") ?? (c.get("requestId" as never) as string | undefined) ?? "-";
  const user = c.get("user" as never) as { id?: string } | undefined;
  logger.info(`${c.req.method} ${c.req.path}`, {
    requestId: requestIdVal,
    route: c.req.path,
    method: c.req.method,
    status: c.res.status,
    durationMs,
    userId: user?.id,
  });
});
app.use("*", cors({ origin: formatAllowedOrigins(env.ALLOWED_ORIGINS) }));

app.get("/health", async (c) => c.json({ success: true, data: { status: "ok" } }));
app.route("/health/db", healthRoute);
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api/v1/auth", authV1Route);
app.route("/api/v1/profiles", profilesRoute);
app.route("/api/v1/categories", categoriesRoute);
app.route("/api/v1/reviews", reviewsRoute);
app.route("/api/v1/follows", followsRoute);
app.route("/api/v1/admin", adminRoute);
app.route("/api/v1/reports", reportsRoute);
app.route("/api/v1/verifications", verificationsRoute);
app.route("/api/v1/company-qualification", companyQualificationRoute);
app.route("/api/v1/profile-locations", profileLocationsRoute);
app.route("/api/v1/tags", tagsRoute);
app.route("/api/v1/email", emailRoute);
app.route("/api/v1/quotes", quotesRoute);
app.route("/api/v1/files", filesRoute);
app.route("/api/v1/places", placesRoute);
app.route("/api/v1/onboarding", onboardingRoute);
app.route("/api/v1/metrics", metricsRoute);
app.route("/api/v1/portfolio", portfolioRoute);
app.route("/api/v1/services", servicesRoute);

app.notFound(() => {
  throw new AppError(404, "NOT_FOUND", "Rota não encontrada");
});

app.onError(errorHandler);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
