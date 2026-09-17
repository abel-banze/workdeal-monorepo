import { describe, it, expect } from "vitest";
import { parseDetailsDate, parseListDate, parseMoney, sanitize } from "./sanitize.js";

describe("sanitize", () => {
  it("remove tags HTML e normaliza whitespace", () => {
    expect(sanitize("  texto <b>com</b>\n\ttabu\t  ")).toBe("texto com tabu");
  });

  it("remove imagens em sintaxe markdown", () => {
    expect(sanitize("Veja ![logo](https://ufsa.gov.mz/logo.png) aqui")).toBe("Veja aqui");
  });

  it("devolve string vazia para input só de espaços", () => {
    expect(sanitize("   \n  ")).toBe("");
  });
});

describe("parseMoney", () => {
  it("converte '10 000,00 MT' ignorando espaços e moeda", () => {
    expect(parseMoney("10 000,00 MT")).toBe(10000);
  });

  it("trata milhares por '.' e decimal por ',' (formato pt-MZ)", () => {
    expect(parseMoney("1.234,56 MT")).toBe(1234.56);
    expect(parseMoney("10.000.000,00")).toBe(10000000);
  });

  it("aceita números inteiros sem separadores", () => {
    expect(parseMoney("1250")).toBe(1250);
  });

  it("devolve null para texto sem dígitos", () => {
    expect(parseMoney("não disponível")).toBeNull();
    expect(parseMoney("")).toBeNull();
  });
});

describe("parseListDate", () => {
  it("interpreta YYYY-MM-DD", () => {
    expect(parseListDate("2024-05-10")).toEqual(new Date("2024-05-10"));
  });

  it("descarta horas coladas ('14H30') usando apenas os primeiros 10 caracteres", () => {
    expect(parseListDate("2024-06-10 14H30")).toEqual(new Date("2024-06-10"));
  });

  it("devolve null para vazio ou inválido", () => {
    expect(parseListDate("")).toBeNull();
    expect(parseListDate("sem data")).toBeNull();
  });
});

describe("parseDetailsDate", () => {
  it("interpreta o texto completo, sem regra dos 10 caracteres", () => {
    expect(parseDetailsDate("2024-07-01")).toEqual(new Date("2024-07-01"));
    expect(parseDetailsDate("2024-05-10 10:30:00")).toEqual(new Date("2024-05-10 10:30:00"));
  });

  it("devolve null para vazio ou inválido", () => {
    expect(parseDetailsDate("")).toBeNull();
    expect(parseDetailsDate("a definir")).toBeNull();
  });
});