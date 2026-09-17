import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { tenderListQuerySchema } from "@workdeal/shared";
import type { Env } from "../middlewares/auth.middleware.js";
import { tendersController } from "../controllers/tenders.controller.js";

export const tendersRoute = new Hono<Env>();

tendersRoute.get("/", zValidator("query", tenderListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await tendersController.list({
    q: q.q,
    province: q.province,
    category: q.category,
    page: q.page,
    limit: q.limit,
  });
  c.header("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return c.json(body, status);
});

tendersRoute.get("/:idOrReference", async (c) => {
  const { body, status } = await tendersController.get(c.req.param("idOrReference"));
  return c.json(body, status);
});