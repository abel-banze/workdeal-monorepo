import { describe, expect, it } from "vitest";
import { normalizeWebsite, websiteSchema } from "./website.js";

describe("normalizeWebsite", () => {
  it("acrescenta https:// quando falta o esquema", () => {
    expect(normalizeWebsite("empresa.co.mz")).toBe("https://empresa.co.mz");
    expect(normalizeWebsite("  www.empresa.co.mz  ")).toBe("https://www.empresa.co.mz");
  });
  it("mantém esquemas explícitos", () => {
    expect(normalizeWebsite("https://empresa.co.mz")).toBe("https://empresa.co.mz");
    expect(normalizeWebsite("http://empresa.co.mz")).toBe("http://empresa.co.mz");
  });
  it("devolve null para vazio/nulo", () => {
    expect(normalizeWebsite("")).toBeNull();
    expect(normalizeWebsite("   ")).toBeNull();
    expect(normalizeWebsite(null)).toBeNull();
    expect(normalizeWebsite(undefined)).toBeNull();
  });
});

describe("websiteSchema", () => {
  it("aceita domínio sem esquema (normaliza)", () => {
    expect(websiteSchema.parse("empresa.co.mz")).toBe("https://empresa.co.mz");
  });
  it("aceita URL completa", () => {
    expect(websiteSchema.parse("https://empresa.co.mz")).toBe("https://empresa.co.mz");
  });
  it("aceita vazio/undefined (campo opcional)", () => {
    expect(websiteSchema.parse("")).toBeNull();
    expect(websiteSchema.parse(undefined)).toBeUndefined();
    expect(websiteSchema.parse(null)).toBeNull();
  });
  it("rejeita lixo sem domínio válido", () => {
    expect(() => websiteSchema.parse("abc")).toThrow();
    expect(() => websiteSchema.parse("https://")).toThrow();
  });
});
