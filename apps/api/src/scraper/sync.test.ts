import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./fetch.js", () => ({
  fetchList: vi.fn(async () => ""),
  fetchDetails: vi.fn(async () => ""),
}));

vi.mock("./db.js", () => ({
  upsertTender: vi.fn(async () => undefined),
  listReferencesWithoutDetails: vi.fn(async () => []),
  saveDetails: vi.fn(async () => undefined),
}));

vi.mock("./notify.js", () => ({
  notifyError: vi.fn(async () => undefined),
  notifyNewTenders: vi.fn(async () => undefined),
}));

import { fetchDetails, fetchList } from "./fetch.js";
import { listReferencesWithoutDetails, saveDetails, upsertTender } from "./db.js";
import { notifyError, notifyNewTenders } from "./notify.js";
import { runSync } from "./sync.js";

const mocks = vi.mocked({ fetchList, fetchDetails, listReferencesWithoutDetails, saveDetails, upsertTender, notifyError, notifyNewTenders });

let errorSpy: ReturnType<typeof vi.spyOn>;

const LIST_HTML = `<table>
  <tr>
    <td><a href="concurso_detalhes.php?referencia=REF%2F1">CONCURSO:<br>x</a></td>
    <td>cat: obj</td><td>ugea</td><td>Maputo</td><td>2024-05-01</td><td>2024-05-01</td>
  </tr>
  <tr>
    <td><a href="concurso_detalhes.php?referencia=REF%2F2">CONCURSO:<br>x</a></td>
    <td>cat: obj</td><td>ugea2</td><td>Gaza</td><td>2024-05-01</td><td>2024-05-01</td>
  </tr>
</table>`;

const DETAILS_HTML = `<table id="lista"><tr><td></td><th>Regime:</th><td>Concurso Público</td></tr></table>`;

describe("runSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.fetchList.mockResolvedValue(LIST_HTML);
    mocks.listReferencesWithoutDetails.mockResolvedValue([]);
    mocks.upsertTender.mockResolvedValue(undefined);
    mocks.saveDetails.mockResolvedValue(undefined);
    mocks.notifyError.mockResolvedValue(undefined);
    mocks.notifyNewTenders.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("faz upsert de todos os concursos da lista e devolve total/novos", async () => {
    mocks.listReferencesWithoutDetails.mockResolvedValue(["REF/1", "REF/2"]);

    const pending = runSync();
    await vi.advanceTimersByTimeAsync(2000);
    const result = await pending;

    expect(mocks.upsertTender).toHaveBeenCalledTimes(2);
    expect(mocks.listReferencesWithoutDetails).toHaveBeenCalledWith(["REF/1", "REF/2"]);
    expect(result).toEqual({ total: 2, newCount: 2 });
    expect(mocks.notifyNewTenders).toHaveBeenCalledWith(2);
  });

  it("falha num detalhe não impede o processamento do seguinte", async () => {
    mocks.listReferencesWithoutDetails.mockResolvedValue(["REF/1", "REF/2"]);
    mocks.fetchDetails.mockImplementation(async (reference: string) => {
      if (reference === "REF/1") throw new Error("portal em baixo");
      return DETAILS_HTML;
    });

    const pending = runSync();
    await vi.advanceTimersByTimeAsync(2000);
    const result = await pending;

    expect(mocks.fetchDetails).toHaveBeenCalledTimes(2);
    expect(mocks.saveDetails).toHaveBeenCalledTimes(1);
    expect(mocks.saveDetails).toHaveBeenCalledWith("REF/2", expect.objectContaining({ regime: "Concurso Público" }));
    expect(errorSpy).toHaveBeenCalledWith("Falha nos detalhes de REF/1", expect.any(Error));
    expect(result).toEqual({ total: 2, newCount: 2 });
    expect(mocks.notifyNewTenders).toHaveBeenCalledWith(2);
  });

  it("exclui novamente da contagem os pendentes cujos detalhes falharam", async () => {
    mocks.listReferencesWithoutDetails.mockResolvedValue(["REF/1"]);
    mocks.fetchDetails.mockRejectedValue(new Error("parse falhou"));

    const pending = runSync();
    await vi.advanceTimersByTimeAsync(2000);
    const result = await pending;

    expect(errorSpy).toHaveBeenCalledWith("Falha nos detalhes de REF/1", expect.any(Error));
    expect(result).toEqual({ total: 2, newCount: 1 });
    expect(mocks.notifyNewTenders).toHaveBeenCalledWith(1);
  });

  it("sem pendentes não envia notificação de novos", async () => {
    const pending = runSync();
    await vi.advanceTimersByTimeAsync(2000);
    const result = await pending;

    expect(result).toEqual({ total: 2, newCount: 0 });
    expect(mocks.notifyNewTenders).not.toHaveBeenCalled();
    expect(mocks.saveDetails).not.toHaveBeenCalled();
  });

  it("lista vazia (estrutura alterada) envia alerta e não toca na BD", async () => {
    mocks.fetchList.mockResolvedValue("<html><body><div>estrutura mudou</div></body></html>");

    const result = await runSync();

    expect(result).toEqual({ total: 0, newCount: 0 });
    expect(mocks.notifyError).toHaveBeenCalledWith(expect.stringContaining("0 concursos"));
    expect(mocks.upsertTender).not.toHaveBeenCalled();
    expect(mocks.notifyNewTenders).not.toHaveBeenCalled();
  });
});