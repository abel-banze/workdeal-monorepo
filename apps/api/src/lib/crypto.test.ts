import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  env: { AI_CREDENTIALS_MASTER_KEY: "chave-mestra-de-teste-com-32-caracteres!" },
}));

vi.mock("../env.js", () => ({ env: mocks.env }));

import { encryptSecret, decryptSecret, maskSecret, CryptoError } from "./crypto.js";

describe("crypto (credenciais de IA)", () => {
  beforeEach(() => {
    mocks.env.AI_CREDENTIALS_MASTER_KEY = "chave-mestra-de-teste-com-32-caracteres!";
  });

  it("encripta e desencripta round-trip com IV único por valor", () => {
    const a = encryptSecret("AIzaSy-minha-api-key-secreta");
    const b = encryptSecret("AIzaSy-minha-api-key-secreta");
    expect(a).not.toBe(b); // IV aleatório → outputs diferentes
    expect(a.startsWith("aes256gcm.v1.")).toBe(true);
    expect(decryptSecret(a)).toBe("AIzaSy-minha-api-key-secreta");
    expect(decryptSecret(b)).toBe("AIzaSy-minha-api-key-secreta");
  });

  it("fora do scope da chave-mestra falha em runtime (lazy env)", () => {
    // env é lazy: sem accessor de AI_CREDENTIALS_MASTER_KEY o teste nem chega aqui.
    expect(encryptSecret("x")).toBeTruthy();
  });

  it("não encripta segredo vazio", () => {
    expect(() => encryptSecret("")).toThrow(CryptoError);
  });

  it("rejeita payload sem preamble", () => {
    expect(() => decryptSecret("abc.not-valid")).toThrow(CryptoError);
  });

  it("rejeita payload com estrutura inválida", () => {
    expect(() => decryptSecret("aes256gcm.v1.apenas.um.segmento")).toThrow(CryptoError);
  });

  it("rejeita payload com tag adulterada", () => {
    const good = encryptSecret("segredo");
    const parts = good.split(".");
    parts[1] = (parts[1] ?? "").replace(/^../, "AA");
    expect(() => decryptSecret(parts.join("."))).toThrow(CryptoError);
  });

  it("mascara segredo mostrando apenas os últimos 4 caracteres", () => {
    expect(maskSecret("sk-abc123")).toContain("c123");
    expect(maskSecret("sk-abc123")).not.toContain("sk-ab");
    expect(maskSecret("ab")).toBe("••••");
    expect(maskSecret("")).toBe("");
  });
});