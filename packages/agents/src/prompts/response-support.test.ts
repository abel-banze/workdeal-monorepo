import { describe, it, expect } from "vitest";
import type { ResponseSupportContext } from "./response-support.js";
import {
  buildResponseSystemPrompt,
  buildResponseUserPrompt,
  mockResponseMessage,
  responseMessageSchema,
} from "./response-support.js";

const base: Omit<ResponseSupportContext, "contextType"> = {
  providerId: "mock",
  fromName: "João",
  fromOrganization: null,
  subject: "Pedido de orçamento para pintura",
  detail: "Quero pintar 3 divisões.",
  provider: { name: "Carla Reparos", services: ["Pintura", "Canalização"] },
  currency: "MZN",
};

describe("response-support prompt", () => {
  it("dá orientação própria por tipo de contexto", () => {
    expect(buildResponseSystemPrompt({ ...base, contextType: "quote" })).toContain("Pedido de orçamento");
    expect(buildResponseSystemPrompt({ ...base, contextType: "opportunity" })).toContain("Oportunidade");
    expect(buildResponseSystemPrompt({ ...base, contextType: "contact" })).toContain("Contacto simples");
  });

  it("user prompt expõe os serviços do fornecedor", () => {
    const user = buildResponseUserPrompt({ ...base, contextType: "quote" });
    expect(user).toContain("Pintura, Canalização");
    expect(user).toContain("Pedido de orçamento para pintura");
  });

  it("mock devolve mensagem válida com assunto e nome do fornecedor", () => {
    const r = mockResponseMessage({ ...base, contextType: "quote" });
    expect(responseMessageSchema.safeParse(r).success).toBe(true);
    expect(r.message).toContain("Pedido de orçamento para pintura");
    expect(r.message).toContain("Carla Reparos");
    expect(r.message).not.toContain("[modo demo");
  });
});
