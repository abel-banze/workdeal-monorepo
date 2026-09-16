import { describe, expect, it } from "vitest";
import { toUserNegotiationError } from "../components/features/negotiation-error";

describe("negotiation-error", () => {
  it("traduz CONTACT_SHARING_BLOCKED (o caso reportado) com orientação", () => {
    const raw = new Error(
      "Por segurança, a negociação é anónima até à adjudicação: não partilhes contactos (telefone, email, links) nem nomes de empresas. Comunica apenas pela plataforma.",
    );
    const out = toUserNegotiationError(raw);
    expect(out).toContain("Mensagem bloqueada");
    expect(out).toContain("remove os contactos");
    expect(out).not.toContain("Error:");
  });

  it("traduz código em bruto mesmo sem a mensagem longa", () => {
    expect(toUserNegotiationError(new Error("CONTACT_SHARING_BLOCKED"))).toContain("Mensagem bloqueada");
  });

  it("traduz thread encerrada, oferta própria e já respondida", () => {
    expect(toUserNegotiationError(new Error("THREAD_CLOSED"))).toContain("encerrada");
    expect(toUserNegotiationError(new Error("Não pode responder à sua própria contraproposta"))).toContain(
      "tua própria",
    );
    expect(toUserNegotiationError(new Error("OFFER_ALREADY_ANSWERED"))).toContain("já foi respondida");
  });

  it("traduz proposta não negociável e sem valor", () => {
    expect(toUserNegotiationError(new Error("PROPOSAL_NOT_NEGOTIABLE"))).toContain("já não está disponível");
    expect(toUserNegotiationError(new Error("OFFER_WITHOUT_PRICE"))).toContain("não tem valor");
  });

  it("traduz rate limit, timeout, sessão e permissão", () => {
    expect(toUserNegotiationError(new Error("RATE_LIMITED"))).toContain("depressa demais");
    expect(toUserNegotiationError(new Error("API timeout 90s: /x"))).toContain("demorar mais");
    expect(toUserNegotiationError(new Error("UNAUTHORIZED"))).toContain("sessão expirou");
    expect(toUserNegotiationError(new Error("FORBIDDEN"))).toContain("permissão");
  });

  it("mantém mensagens curtas desconhecidas e encurta as longas", () => {
    expect(toUserNegotiationError(new Error("Falha ao abrir a negociação."))).toBe("Falha ao abrir a negociação.");
    expect(toUserNegotiationError(new Error("x".repeat(500)))).toBe("Falha na negociação. Tenta novamente.");
    expect(toUserNegotiationError(null)).toBe("Falha na negociação. Tenta novamente.");
  });
});
