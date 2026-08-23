import { Hono } from "hono";
import type { Env } from "../middlewares/auth.middleware.js";
import { profilesController } from "../controllers/profiles.controller.js";

export const categoriesRoute = new Hono<Env>();

categoriesRoute.get("/", async (c) => {
  const { body, status } = await profilesController.listCategories();
  return c.json(body, status);
});
