import { describe, it, expect } from "vitest";
import { validateProposalContent } from "./proposal-writer.js";
import { buildStructuredRetryUserPrompt } from "../runtime/run.js";

describe("validateProposalContent", () => {
  it("aceita mensagem completa com preço e prazo", () => {
    const msg = "Olá. Proponho 45000 MZN com entrega em 10 dias. Podemos alinhar os detalhes.";
    expect(validateProposalContent(msg, { priceMzn: 45000, estimatedDays: 10 })).toEqual([]);
  });

  it("aceita mensagem sem pistas (nada a exigir)", () => {
    expect(validateProposalContent("Olá. Podemos apoiar este serviço.", { priceMzn: null, estimatedDays: null })).toEqual([]);
  });

  it("assinala mensagem longa demais", () => {
    const issues = validateProposalContent("x".repeat(2001), { priceMzn: null, estimatedDays: null });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("2001");
  });

  it("assinala preço e prazo ausentes quando foram indicados", () => {
    const issues = validateProposalContent("Olá. Podemos apoiar este serviço.", { priceMzn: 5000, estimatedDays: 7 });
    expect(issues).toHaveLength(2);
  });

  it("limite de 2000 caracteres é inclusivo", () => {
    expect(validateProposalContent("x".repeat(2000), { priceMzn: null, estimatedDays: null })).toEqual([]);
  });
});

describe("buildStructuredRetryUserPrompt", () => {
  it("preserva o pedido original e junta o motivo", () => {
    const out = buildStructuredRetryUserPrompt("Escreve a proposta.", "message: demasiado curta");
    expect(out).toContain("Escreve a proposta.");
    expect(out).toContain("message: demasiado curta");
    expect(out).toContain("objecto JSON válido");
  });
});
