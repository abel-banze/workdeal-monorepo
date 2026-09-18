import { describe, it, expect } from "vitest";
import type { ProfileAssistantContext } from "./profile-assistant.js";
import {
  buildProfileAssistantSystemPrompt,
  buildProfileAssistantUserPrompt,
  mockProfileAssistantReply,
  profileAssistantReplySchema,
} from "./profile-assistant.js";

const CTX: ProfileAssistantContext = {
  providerId: "mock",
  company: {
    name: "Construções Massinga",
    tagline: "Construção civil e acabamentos",
    description: "Empresa moçambicana com 15 anos de experiência.",
    location: "Maputo · Kampfumu",
    foundedYear: 2010,
    companySize: "media",
    categories: ["Construção", "Acabamentos"],
    badges: ["verified", "quality"],
    reviews: { average: 4.5, count: 12 },
    services: [
      { title: "Construção de habitação", description: "Obras novas", priceMzn: 250000 },
      { title: "Pintura", description: "Interior e exterior", priceMzn: null },
    ],
    contact: { whatsapp: "258840000000", phone: "25821300000", email: "geral@massinga.co.mz", website: null },
  },
  currency: "MZN",
};

describe("profile-assistant prompt", () => {
  it("system prompt expõe apenas dados públicos do contexto", () => {
    const sys = buildProfileAssistantSystemPrompt(CTX);
    expect(sys).toContain("Construções Massinga");
    expect(sys).toContain("250000 MZN");
    expect(sys).toContain("WhatsApp: 258840000000");
    expect(sys).toContain("4.5");
  });

  it("user prompt sanitiza a mensagem do visitante", () => {
    const user = buildProfileAssistantUserPrompt(CTX, "Vocês fazem   pintura?  ");
    expect(user).toContain("pintura");
  });

  it("system prompt impõe revelação progressiva e anti-extracção", () => {
    const sys = buildProfileAssistantSystemPrompt(CTX);
    expect(sys).toContain("Revelação progressiva");
    expect(sys).toContain("Anti-extracção");
  });

  it("mock devolve reply + sugestão de acção válida", () => {
    for (const msg of ["Quanto custa construir?", "Falamos por whatsapp?", "Quero guardar"] as const) {
      const r = mockProfileAssistantReply(CTX, msg);
      const parsed = profileAssistantReplySchema.safeParse(r);
      expect(parsed.success).toBe(true);
      expect(r.reply).not.toContain("[modo demo");
      // Revelação progressiva: o mock nunca despeja contactos no texto.
      expect(r.reply).not.toContain("258840000000");
    }
    expect(mockProfileAssistantReply(CTX, "Quanto custa?").suggest).toBe("quote");
    expect(mockProfileAssistantReply(CTX, "fala por whatsapp por favor").suggest).toBe("whatsapp");
    expect(mockProfileAssistantReply(CTX, "guarda para mais tarde").suggest).toBe("bookmark");
    expect(mockProfileAssistantReply(CTX, "que serviços têm?").suggest).toBe("none");
  });
});