import { describe, it, expect } from "vitest";
import { parseList } from "./parse-list.js";

const LIST_HTML = `<!doctype html>
<html><body>
<table>
  <thead>
    <tr><th>Ref</th><th>Designação</th><th>UGEA</th><th>Província</th><th>Lançamento</th><th>Abertura</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="concurso_detalhes.php?referencia=REF%2F2024%2F001"><img src="pdf.png"/>CONCURSO PÚBLICO:<br><b>REF/2024/001</b></a></td>
      <td>Obras: Construção da ponte sobre o rio Limpopo</td>
      <td>Ministério das Obras Públicas, Habitação e Recursos Hídricos</td>
      <td>Gaza</td>
      <td>2024-05-10</td>
      <td>2024-06-10 14H30</td>
    </tr>
    <tr>
      <td><a href="concurso_detalhes.php?referencia=MSG%2F2024%2F007">AVISO DE CONCURSO: Procedimento de selecção</a></td>
      <td>Fornecimento de bens e materiais de emergência</td>
      <td>Instituto Nacional de Gestão de Calamidades</td>
      <td>Sofala</td>
      <td>2024-05-12</td>
      <td></td>
    </tr>
    <tr>
      <td>linha sem link</td>
      <td>ignorada</td>
      <td>nao-ugea</td>
      <td>Maputo</td>
      <td>2024-05-01</td>
      <td>2024-05-01</td>
    </tr>
    <tr>
      <td><a href="concurso_detalhes.php?referencia=X%2F1">apenas cinco células</a></td>
      <td>x</td><td>x</td><td>x</td><td>x</td>
    </tr>
  </tbody>
</table>
</body></html>`;

describe("parseList", () => {
  it("extrai as duas linhas válidas e ignora cabeçalho/linhas inválidas", () => {
    const rows = parseList(LIST_HTML);
    expect(rows).toHaveLength(2);
  });

  it("decode da referência e monta a URL de detalhes", () => {
    const [first] = parseList(LIST_HTML);
    expect(first!.reference).toBe("REF/2024/001");
    expect(first!.detailsUrl).toBe(
      "https://www.ufsa.gov.mz/concurso_detalhes.php?referencia=REF%2F2024%2F001",
    );
  });

  it("extrai tipo da primeira célula antes do <br> e remove ':' final", () => {
    const [first] = parseList(LIST_HTML);
    expect(first!.type).toBe("CONCURSO PÚBLICO");
  });

  it("separa categoria e objecto no formato 'CATEGORIA: Objecto'", () => {
    const [first, second] = parseList(LIST_HTML);
    expect(first!.category).toBe("Obras");
    expect(first!.object).toBe("Construção da ponte sobre o rio Limpopo");

    const text = "Fornecimento de bens e materiais de emergência";
    expect(text.includes(":")).toBe(false);
    expect(second!.category).toBe(text);
    expect(second!.object).toBe("");
  });

  it("normaliza datas da lista (descarta a hora colada) e guarda null quando vazio", () => {
    const [first, second] = parseList(LIST_HTML);
    expect(first!.launchedAt).toEqual(new Date("2024-05-10"));
    expect(first!.openedAt).toEqual(new Date("2024-06-10"));
    expect(second!.launchedAt).toEqual(new Date("2024-05-12"));
    expect(second!.openedAt).toBeNull();
  });

  it("é idempotente — duas execuções produzem as mesmas referências sem duplicados", () => {
    const first = parseList(LIST_HTML).map((r) => r.reference);
    const second = parseList(LIST_HTML).map((r) => r.reference);
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
  });

  it("devolve lista vazia quando o HTML não tem tabelas compatíveis", () => {
    expect(parseList("")).toEqual([]);
    expect(parseList("<html><body><div>estrutura mudou</div></body></html>")).toEqual([]);
    expect(parseList("<table><tr><th>apenas</th><th>cabeçalho</th></tr></table>")).toEqual([]);
  });
});