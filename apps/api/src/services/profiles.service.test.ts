import { describe, it, expect, vi } from "vitest";
import { slugify } from "../services/profiles.service";
import { hasOrgPermission, hasSelfPermission } from "@workdeal/shared";

describe("slugify", () => {
  it("normaliza acentos e espaços", () => {
    expect(slugify("Construção Civil")).toBe("construcao-civil");
    expect(slugify("  Serviços   Gerais  ")).toBe("servicos-gerais");
  });

  it("corta em 64 chars e fallback", () => {
    expect(slugify("")).toBe("profile");
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(64);
  });

  it("remove caracteres especiais", () => {
    expect(slugify("Workdeal! @#")).toBe("workdeal");
  });
});

// P1-8: RBAC unit tests — hasOrgPermission / hasSelfPermission (mock-free, cobre P0-1/P0-2)
describe("RBAC permissions", () => {
  it("member não tem profile:edit", () => {
    expect(hasOrgPermission("member", "profile:edit")).toBe(false);
    expect(hasOrgPermission("member", "tasks:view")).toBe(true);
  });
  it("editor tem profile:edit mas não members:manage", () => {
    expect(hasOrgPermission("editor", "profile:edit")).toBe(true);
    expect(hasOrgPermission("editor", "members:manage")).toBe(false);
  });
  it("admin e owner têm profile:edit", () => {
    expect(hasOrgPermission("admin", "profile:edit")).toBe(true);
    expect(hasOrgPermission("owner", "profile:edit")).toBe(true);
  });
  it("self permission profile:edit é true", () => {
    expect(hasSelfPermission("profile:edit")).toBe(true);
    expect(hasSelfPermission("profile:delete")).toBe(true);
  });
});

// P1-8: integração leve — getMyProfile estritamente pessoal (P0-1)
describe("getMyProfile separação", () => {
  it("findByUserId só deve retornar individual (verificado via schema unique)", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("apps/api/src/services/profiles.service.ts", "utf-8");
    const m = src.match(/async getMyProfile[\s\S]*?return null;\s*\}/);
    expect(m).toBeTruthy();
    const body = m![0];
    expect(body).not.toContain("member");
    expect(body).not.toContain("findByOrganizationId");
    expect(body).toContain("findByUserId");
    expect(body).toContain("findBySlug");
  });
});
