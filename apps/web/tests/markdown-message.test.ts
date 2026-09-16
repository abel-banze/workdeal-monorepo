import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownMessage } from "../components/features/markdown-message";

function html(content: string): string {
  return renderToStaticMarkup(createElement(MarkdownMessage, { content }));
}

describe("markdown-message", () => {
  it("renderiza negrito, itálico e código inline", () => {
    const out = html("Isto é **forte**, *leve* e `código`.");
    expect(out).toContain("<strong>");
    expect(out).toContain("forte");
    expect(out).toContain("<em>");
    expect(out).toContain("<code");
  });

  it("renderiza listas e títulos sem quebrar a hierarquia", () => {
    const out = html("## Empresas\n\n- Uma\n- Duas");
    expect(out).toContain("<ul");
    expect(out).toContain("<li");
    expect(out).not.toContain("<h1");
    expect(out).not.toContain("<h2");
  });

  it("descarta HTML cru (XSS) mas mantém o texto", () => {
    const out = html('Olá <script>alert("x")</script> mundo');
    expect(out).not.toContain("<script");
    expect(out).toContain("mundo");
  });

  it("só permite links http/https/mailto", () => {
    const ok = html("[site](https://exemplo.co.mz)");
    expect(ok).toContain('href="https://exemplo.co.mz"');
    expect(ok).toContain('target="_blank"');
    const bad = html('[x](javascript:alert("x"))');
    expect(bad).not.toContain("javascript:");
  });

  it("não rebenta com conteúdo vazio ou estranho", () => {
    expect(() => html("")).not.toThrow();
    expect(() => html("**inacabado")).not.toThrow();
  });
});
