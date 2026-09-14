import { describe, expect, it } from "vitest";
import {
  anonymousCode,
  anonymousProviderName,
  anonymousThreadProviderName,
  CONTACT_BLOCK_MESSAGE_PT,
  detectContactSharing,
  isNegotiationTextAllowed,
  negotiationSideAlias,
} from "./negotiation-anonymity.js";

describe("negotiationSideAlias", () => {
  it("usa aliases genéricos sem identidade real", () => {
    expect(negotiationSideAlias("requester")).toBe("Solicitante");
    expect(negotiationSideAlias("provider")).toBe("Fornecedor");
  });
});

describe("anonymousCode", () => {
  it("é determinístico para o mesmo id", () => {
    expect(anonymousCode("prop-1")).toBe(anonymousCode("prop-1"));
  });

  it("distingue ids diferentes na maioria dos casos e nunca devolve o id", () => {
    const a = anonymousCode("prop-1");
    const b = anonymousCode("prop-2");
    expect(a).not.toBe(b);
    expect("prop-1").not.toContain(a);
  });

  it("compõe nomes anónimos de proposta e thread", () => {
    expect(anonymousProviderName("prop-1")).toMatch(/^Fornecedor · #[0-9A-F]{4}$/);
    expect(anonymousThreadProviderName("th-1")).toMatch(/^Fornecedor · #[0-9A-F]{4}$/);
  });
});

describe("detectContactSharing", () => {
  it("permite texto normal de negociação (preço, prazos, âmbito)", () => {
    expect(detectContactSharing("Consigo fechar a 12.500 MZN com entrega em 10 dias.")).toBeNull();
    expect(detectContactSharing("Boa tarde, qual é o âmbito exacto da vedação?")).toBeNull();
    expect(detectContactSharing("")).toBeNull();
    expect(detectContactSharing(null)).toBeNull();
  });

  it("bloqueia emails", () => {
    expect(detectContactSharing("fala comigo em joao@empresa.co.mz")).toBe("email");
  });

  it("bloqueia links e domínios", () => {
    expect(detectContactSharing("vê o nosso trabalho em https://empresa.co.mz")).toBe("url");
    expect(detectContactSharing("o site é www.empresa.co.mz, confere lá")).toBe("url");
    expect(detectContactSharing("contacta via empresa.com")).toBe("url");
  });

  it("não bloqueia pontuação normal nem abreviaturas sem domínio", () => {
    expect(detectContactSharing("Ok. Entrega em 5 dias, etc. Combinado.")).toBeNull();
  });

  it("bloqueia números de telefone moçambicanos em vários formatos", () => {
    expect(detectContactSharing("liga-me no 841234567")).toBe("phone");
    expect(detectContactSharing("o meu número é +258 84 123 4567")).toBe("phone");
    expect(detectContactSharing("contacto: 258-82-123-4567")).toBe("phone");
  });

  it("bloqueia número com palavra-chave de contacto mesmo com menos dígitos", () => {
    expect(detectContactSharing("o meu whatsapp é 8412345")).toBe("phone");
    expect(detectContactSharing("manda sms para 82123 45")).toBe("phone");
  });

  it("não bloqueia valores e prazos (dígitos isolados sem contexto de contacto)", () => {
    expect(detectContactSharing("proponho 12500 MZN em 10 dias")).toBeNull();
    expect(detectContactSharing("consigo em 2026 sem falta")).toBeNull();
  });

  it("expõe helper booleano e mensagem pt-MZ", () => {
    expect(isNegotiationTextAllowed("tudo bem?")).toBe(true);
    expect(isNegotiationTextAllowed("liga 841234567")).toBe(false);
    expect(CONTACT_BLOCK_MESSAGE_PT).toMatch(/anónima/);
  });
});
