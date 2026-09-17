import { afterEach, describe, expect, it, vi } from "vitest";

function sessionResponse(): Response {
  return new Response("ok", {
    status: 200,
    headers: { "set-cookie": "PHPSESSID=abc123; path=/" },
  });
}

async function freshFetch() {
  vi.resetModules();
  return await import("./fetch.js");
}

describe("fetch — sessão UFSA e retry HTTP", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("cria a sessão antes do primeiro conteúdo e envia o cookie PHPSESSID", async () => {
    const calls: string[] = [];
    let cookieSent: string | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push(url);
        if (url.includes("concursos.php")) return sessionResponse();
        cookieSent = ((init?.headers as Record<string, string> | undefined)?.Cookie as string) ?? null;
        return new Response("<html>conteudo</html>", { status: 200 });
      }),
    );

    const mod = await freshFetch();
    const html = await mod.fetchList("open");

    expect(html).toBe("<html>conteudo</html>");
    expect(calls[0]).toContain("concursos.php");
    expect(calls[1]).toContain("Busca_concurso1.php");
    expect(cookieSent).toBe("PHPSESSID=abc123");
  });

  it("repete 502/503 com backoff e devolve o HTML quando o portal responde", async () => {
    const statuses = [502, 503, 200];
    let contentCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("concursos.php")) return sessionResponse();
        contentCalls++;
        const status = statuses.shift() ?? 200;
        return new Response(status === 200 ? "<html>ok</html>" : "indisponivel", { status });
      }),
    );
    vi.useFakeTimers();

    const mod = await freshFetch();
    const pending = mod.fetchList("open");
    await vi.advanceTimersByTimeAsync(5000);
    const html = await pending;

    expect(html).toBe("<html>ok</html>");
    expect(contentCalls).toBe(3);
  });

  it("falha após três tentativas quando o 503 persiste", async () => {
    let contentCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("concursos.php")) return sessionResponse();
        contentCalls++;
        return new Response("indisponivel", { status: 503 });
      }),
    );
    vi.useFakeTimers();

    const mod = await freshFetch();
    const pending = mod.fetchList("open").catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(5000);

    const error = await pending;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/HTTP 503/);
    expect(contentCalls).toBe(3);
  });

  it("falha imediatamente para status não-retryable (404/500)", async () => {
    let contentCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("concursos.php")) return sessionResponse();
        contentCalls++;
        return new Response("nao encontrado", { status: 404 });
      }),
    );
    vi.useFakeTimers();

    const mod = await freshFetch();
    const pending = mod.fetchList("open").catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(5000);

    const error = await pending;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/HTTP 404/);
    expect(contentCalls).toBe(1);
  });

  it("propaga erro de rede após a última tentativa", async () => {
    let contentCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("concursos.php")) return sessionResponse();
        contentCalls++;
        throw new Error("network down");
      }),
    );
    vi.useFakeTimers();

    const mod = await freshFetch();
    const pending = mod.fetchList("open").catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(5000);

    const error = await pending;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("network down");
    expect(contentCalls).toBe(3);
  });
});