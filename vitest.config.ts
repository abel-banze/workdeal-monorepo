import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.ts",
      "packages/*/tests/**/*.test.ts",
      "apps/*/tests/**/*.test.ts",
    ],
    env: {
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/workdeal_test",
      BETTER_AUTH_SECRET: "test-secret-min-32-chars-0123456789",
      BETTER_AUTH_URL: "http://localhost:3001",
      ALLOWED_ORIGINS: "http://localhost:3000",
      NODE_ENV: "test",
    },
  },
});
