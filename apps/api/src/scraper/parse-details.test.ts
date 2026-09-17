import { describe, it, expect } from "vitest";
import { parseDetails } from "./parse-details.js";

const DETAILS_HTML = `<!doctype html>
<html><body>
<table id="lista">
  <tr><td></td><th>Regime:</th><td>Concurso Público</td></tr>
  <tr><td></td><th>Modalidade</th><td>Internacional</td></tr>
  <tr><td></td><th>Classe:</th><td>5</td></tr>
  <tr><td></td><th>Objecto Geral:</th><td>Construção de infraestrutura</td></tr>
  <tr><td></td><th>Moeda:</th><td>MZN</td></tr>
  <tr><td></td><th>Valor Estimado:</th><td>10 000,00 MT</td></tr>
  <tr><td></td><th>Garantia Provisória:</th><td>250 000,00 MT</td></tr>
  <tr><td></td><th>Criterio de Adjudicacao:</th><td>Menor preço</td></tr>
  <tr><td></td><th>Numero de Lotes:</th><td>3</td></tr>
  <tr><td></td><th>Entrega de Propostas:</th><td>2024-07-01</td></tr>
  <tr><td></td><th>Hora de Entrega:</th><td>10:00</td></tr>
  <tr><td></td><th>Hora de Abertura:</th><td>10:30</td></tr>
  <tr><td></td><th>Observações:</th><td>Ver anúncio para detalhes</td></tr>
  <tr><td></td><th>Data de Publicação:</th><td>2024-05-20</td></tr>
  <tr><td></td><th>Data de Abertura:</th><td>2024-07-01</td></tr>
  <tr><td></td><th>Data de Lancamento:</th><td>2024-05-10</td></tr>
  <tr><td></td><td>linha sem th no índice 1</td><td>ignorada</td></tr>
</table>
<a href="./Baixar_anuncio.php?tipo=pdf">Anuncio</a>
<a href="/Baixar_cad_enc.php?tipo=pdf">Caderno de encargos</a>
</body></html>`;

describe("parseDetails", () => {
  it("mapeia os campos conhecidos e normaliza labels com ':'", () => {
    const d = parseDetails(DETAILS_HTML, "REF/2024/001");
    expect(d.regime).toBe("Concurso Público");
    expect(d.modality).toBe("Internacional");
    expect(d.class).toBe("5");
    expect(d.generalObject).toBe("Construção de infraestrutura");
    expect(d.currency).toBe("MZN");
    expect(d.awardCriteria).toBe("Menor preço");
    expect(d.lotCount).toBe("3");
    expect(d.proposalDelivery).toBe("2024-07-01");
    expect(d.deliveryTime).toBe("10:00");
    expect(d.openingTime).toBe("10:30");
    expect(d.observations).toBe("Ver anúncio para detalhes");
  });

  it("converte valores monetários e datas", () => {
    const d = parseDetails(DETAILS_HTML, "REF/2024/001");
    expect(d.estimatedValue).toBe(10000);
    expect(d.provisionalGuarantee).toBe(250000);
    expect(d.publishedAt).toEqual(new Date("2024-05-20"));
    expect(d.openedAt).toEqual(new Date("2024-07-01"));
    expect(d.launchedAt).toEqual(new Date("2024-05-10"));

    // datas com texto limpo completo (não a regra dos 10 caracteres da lista)
    expect(typeof d.publishedAt?.toISOString()).toBe("string");
  });

  it("converte links relativos de documentos em URLs absolutos", () => {
    const d = parseDetails(DETAILS_HTML, "REF/2024/001");
    expect(d.noticeUrl).toBe("https://www.ufsa.gov.mz/Baixar_anuncio.php?tipo=pdf");
    expect(d.documentUrl).toBe("https://www.ufsa.gov.mz/Baixar_cad_enc.php?tipo=pdf");
  });

  it("campos ausentes ficam a null sem deslocar os outros", () => {
    const html = `<table id="lista">
      <tr><td></td><th>Regime:</th><td>Concurso Público</td></tr>
      <tr><td></td><th>Data de Abertura:</th><td>2024-07-01</td></tr>
    </table>`;
    const d = parseDetails(html, "MSG/2024/007");
    expect(d.regime).toBe("Concurso Público");
    expect(d.openedAt).toEqual(new Date("2024-07-01"));
    expect(d.modality).toBeNull();
    expect(d.class).toBeNull();
    expect(d.generalObject).toBeNull();
    expect(d.currency).toBeNull();
    expect(d.estimatedValue).toBeNull();
    expect(d.provisionalGuarantee).toBeNull();
    expect(d.awardCriteria).toBeNull();
    expect(d.lotCount).toBeNull();
    expect(d.proposalDelivery).toBeNull();
    expect(d.deliveryTime).toBeNull();
    expect(d.openingTime).toBeNull();
    expect(d.observations).toBeNull();
    expect(d.publishedAt).toBeNull();
    expect(d.launchedAt).toBeNull();
    expect(d.noticeUrl).toBeNull();
    expect(d.documentUrl).toBeNull();
  });

  it("sem links de documentos devolve noticeUrl e documentUrl null", () => {
    const html = `<table id="lista"><tr><td></td><th>Regime:</th><td>x</td></tr></table>`;
    const d = parseDetails(html, "REF");
    expect(d.noticeUrl).toBeNull();
    expect(d.documentUrl).toBeNull();
  });

  it("tabela ausente devolve todos os campos vazios", () => {
    const d = parseDetails("<html><body>nenhum tabela</body></html>", "REF");
    expect(d.regime).toBeNull();
    expect(d.openedAt).toBeNull();
    expect(d.noticeUrl).toBeNull();
  });
});