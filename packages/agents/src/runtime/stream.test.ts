import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  streamText: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: mocks.streamText,
  Output: {
    object: (args: unknown) => ({ type: "object", ...(args as object) }),
    text: () => ({ type: "text" }),
  },
  stepCountIs: (n: unknown) => ({ stopWhen: "stepCount", n }),
  tool: (def: unknown) => ({ sdkTool: true, ...(def as object) }),
}));

import { streamAgent } from "./stream.js";

function fakeModel() {
  return {} as never;
}

const BASE = {
  providerId: "openai" as const,
  model: "gpt-5-mini",
  tier: "flash" as const,
  system: "sistema",
  user: "olá!",
  maxInputTokens: 8000,
  maxOutputTokens: 2000,
  maxCostUsd: 0.05,
  temperature: 0.7,
};

function fakeStream(chunks: string[], usage = { inputTokens: 10, outputTokens: 5 }) {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) yield chunk;
    })(),
    text: Promise.resolve(chunks.join("")),
    usage: Promise.resolve(usage),
    steps: Promise.resolve([]),
  };
}

async function collect(stream: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const delta of stream) out.push(delta);
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("streamAgent", () => {
  it("emite deltas por ordem e resolve o completion com o texto completo", async () => {
    mocks.streamText.mockReturnValue(fakeStream(["Olá", " mundo"]));
    const handle = await streamAgent(fakeModel(), BASE);
    const [deltas, result] = await Promise.all([collect(handle.deltas), handle.completion]);
    expect(deltas).toEqual(["Olá", " mundo"]);
    expect(result.status).toBe("ok");
    expect(result.text).toBe("Olá mundo");
    expect(result.usage.inputTokens).toBe(10);
    expect(result.usage.outputTokens).toBe(5);
  });

  it("bloqueia sem chamar o modelo quando o contexto é demasiado grande", async () => {
    const handle = await streamAgent(fakeModel(), { ...BASE, system: "x".repeat(100_000) });
    expect(mocks.streamText).not.toHaveBeenCalled();
    expect(await collect(handle.deltas)).toEqual([]);
    const result = await handle.completion;
    expect(result.status).toBe("guardrail_blocked");
    expect(result.errorCode).toBe("INPUT_TOO_LARGE");
  });

  it("bloqueia em preflight quando o orçamento não chega", async () => {
    const handle = await streamAgent(fakeModel(), { ...BASE, maxCostUsd: 0.0000001 });
    expect(mocks.streamText).not.toHaveBeenCalled();
    const result = await handle.completion;
    expect(result.status).toBe("guardrail_blocked");
    expect(result.errorCode).toBe("COST_EXCEEDED");
  });

  it("converte falha síncrona do SDK em resultado de erro", async () => {
    mocks.streamText.mockImplementation(() => {
      throw new Error("HTTP 429 Too Many Requests");
    });
    const handle = await streamAgent(fakeModel(), BASE);
    expect(await collect(handle.deltas)).toEqual([]);
    const result = await handle.completion;
    expect(result.status).toBe("rate_limited");
    expect(result.errorCode).toBe("RATE_LIMITED");
  });

  it("encaminha o histórico como messages", async () => {
    mocks.streamText.mockReturnValue(fakeStream(["ok"]));
    const handle = await streamAgent(fakeModel(), {
      ...BASE,
      history: [{ role: "user" as const, text: "antes" }],
    });
    await handle.completion;
    const callArgs = mocks.streamText.mock.calls[0][0];
    expect(callArgs.prompt).toBeUndefined();
    expect(callArgs.messages).toEqual([
      { role: "user", content: "antes" },
      { role: "user", content: "olá!" },
    ]);
  });
});
