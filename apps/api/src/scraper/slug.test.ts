import { describe, it, expect } from "vitest";
import { generateSlug } from "./slug.js";

describe("generateSlug (UGEA)", () => {
  it("converte para minúsculas e remove diacríticos", () => {
    expect(generateSlug("Ministério das Obras Públicas")).toBe("ministerio-das-obras-publicas");
  });

  it("remove caracteres especiais e pontuação", () => {
    expect(generateSlug("EDM - Electricidade de Moçambique, E.P.")).toBe("edm-electricidade-de-mocambique-ep");
  });

  it("aceita acrónimos com espaços em redor da barra", () => {
    expect(generateSlug("ACÇÃO / AEC - Norte")).toBe("accao-aec-norte");
  });

  it("colapsa espaços repetidos e hífens", () => {
    expect(generateSlug("  Centro   Nacional   de      Dados  ")).toBe("centro-nacional-de-dados");
    expect(generateSlug("Banco - - - Central")).toBe("banco-central");
  });

  it("devolve string vazia quando não há caracteres válidos", () => {
    expect(generateSlug("   ")).toBe("");
    expect(generateSlug("!!!")).toBe("");
  });

  it("é determinístico — o mesmo nome gera sempre o mesmo slug", () => {
    const name = "Instituto Nacional de Gestão e Redução do Risco de Desastres";
    expect(generateSlug(name)).toBe(generateSlug(name));
  });
});