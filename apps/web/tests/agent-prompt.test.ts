import { describe, expect, it } from "vitest";
import { composeFollowUp, composeGuidedPrompt } from "../components/layout/agent-prompt";

describe("agent-prompt", () => {
  it("compõe pesquisa de empresas com área e província", () => {
    expect(composeGuidedPrompt("companies", { q: "canalização", province: "Maputo" })).toBe(
      "Encontra empresas de canalização na província de Maputo. Para cada uma indica nome, província e selos.",
    );
  });

  it("compõe sem filtros quando vazio", () => {
    expect(composeGuidedPrompt("companies", { q: "", province: "" })).toBe(
      "Encontra empresas. Para cada uma indica nome, província e selos.",
    );
  });

  it("compõe oportunidades e actividade", () => {
    expect(composeGuidedPrompt("opportunities", { q: "pintura", province: "" })).toContain("tarefas abertas");
    expect(composeGuidedPrompt("activity", { q: "", province: "" })).toContain("Resume a minha actividade");
  });

  it("normaliza espaços", () => {
    expect(composeGuidedPrompt("free", { q: "  como   apresento  a empresa? ", province: "" })).toBe(
      "como apresento a empresa?",
    );
  });

  it("follow-up sem histórico passa directo", () => {
    expect(composeFollowUp([], "e a mais barata?")).toBe("e a mais barata?");
  });

  it("follow-up inclui o par anterior como contexto", () => {
    const out = composeFollowUp([{ question: "há tarefas?", answer: "Sim, três." }], "e a mais barata?");
    expect(out).toContain('perguntei "há tarefas?"');
    expect(out).toContain("Agora: e a mais barata?");
  });
});
