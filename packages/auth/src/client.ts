import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { env } from "./env.js";

export const authClient = createAuthClient({
  baseURL: env.BETTER_AUTH_URL,
  plugins: [organizationClient()],
});
