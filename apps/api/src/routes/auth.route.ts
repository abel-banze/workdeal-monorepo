import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { ok } from "../lib/api-response.js";

export const authV1Route = new Hono<Env>();

authV1Route.get("/session", requireAuth, (c) => {
  const user = c.get("user");
  return c.json(
    ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        systemRole: user.systemRole,
        emailVerified: user.emailVerified,
      },
      sessionId: c.get("sessionId"),
    }),
  );
});
