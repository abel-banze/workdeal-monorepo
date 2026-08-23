import { describe, it, expect } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("valida DATABASE_URL postgres", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "https://example.com/db",
        BETTER_AUTH_SECRET: "a".repeat(32),
        BETTER_AUTH_URL: "http://localhost:3001",
        ALLOWED_ORIGINS: "http://localhost:3000",
      }),
    ).toThrow();
  });

  it("aceita postgres://", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/workdeal",
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "http://localhost:3001",
      ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:3001",
      NODE_ENV: "test",
    });
    expect(env.DATABASE_URL).toContain("postgres://");
    expect(env.ALLOWED_ORIGINS).toBe("http://localhost:3000,http://localhost:3001");
  });

  it("rejeita ALLOWED_ORIGINS inválida", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/workdeal",
        BETTER_AUTH_SECRET: "a".repeat(32),
        BETTER_AUTH_URL: "http://localhost:3001",
        ALLOWED_ORIGINS: "not-a-url",
      }),
    ).toThrow();
  });
});
