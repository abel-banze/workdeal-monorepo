import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: mocks.generateText,
  Output: {
    object: (args: unknown) => ({ type: "object", ...(args as object) }),
    text: () => ({ type: "text" }),
  },
  stepCountIs: (n: unknown) => ({ stopWhen: "stepCount", n }),
  tool: (def: unknown) => ({ sdkTool: true, ...(def as object) }),
}));

import { runAgent, executeToolSafely, MAX_TOOL_STEPS } from "./run.js";
import type { AgentTool } from "../types.js";

function fakeModel() {
  return {} as never;
}

const BASE = {
  providerId: "openai" as const,
  model: "gpt-5-mini",
  tier: "flash" as const,
  system: "sistema",
  user: "há tarefas abertas em Maputo?",
  maxInputTokens: 8000,
  maxOutputTokens: 2000,
  maxCostUsd: 0.05,
  temperature: 0.7,
};

const searchTasks: AgentTool = {
  name: "search_tasks",
  description: "Pesquisa tarefas abertas",
  inputSchema: z.object({ q: z.string() }),
  execute: async (input) => ({ items: [`tarefa sobre ${(input as { q: string }).q}`] }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runAgent com tools", () => {
  it("encaminha tools e stopWhen ao generateText", async () => {
    mocks.generateText.mockResolvedValue({ text: "Sim, há 2.", usage: { inputTokens: 50, outputTokens: 10 } });
    const result = await runAgent(fakeModel(), { ...BASE, tools: [searchTasks] });
    expect(result.status).toBe("ok");
    const callArgs = mocks.generateText.mock.calls[0][0];
    expect(Object.keys(callArgs.tools)).toEqual(["search_tasks"]);
    expect(callArgs.stopWhen).toEqual({ stopWhen: "stepCount", n: 5 });
  });

  it("respeita maxSteps e o tecto de segurança", async () => {
    mocks.generateText.mockResolvedValue({ text: "ok", usage: {} });
    await runAgent(fakeModel(), { ...BASE, tools: [searchTasks], maxSteps: 3 });
    expect(mocks.generateText.mock.calls[0][0].stopWhen).toEqual({ stopWhen: "stepCount", n: 3 });
    await runAgent(fakeModel(), { ...BASE, tools: [searchTasks], maxSteps: 99 });
    expect(mocks.generateText.mock.calls[1][0].stopWhen).toEqual({ stopWhen: "stepCount", n: MAX_TOOL_STEPS });
  });

  it("sem tools mantém tiro único (sem stopWhen)", async () => {
    mocks.generateText.mockResolvedValue({ text: "ok", usage: {} });
    const result = await runAgent(fakeModel(), BASE);
    expect(mocks.generateText.mock.calls[0][0].stopWhen).toBeUndefined();
    expect(mocks.generateText.mock.calls[0][0].tools).toBeUndefined();
    expect(result.steps).toBe(0);
    expect(result.toolCalls).toEqual([]);
  });

  it("expõe toolCalls e steps do resultado", async () => {
    mocks.generateText.mockResolvedValue({
      text: "Encontrada.",
      usage: { inputTokens: 60, outputTokens: 12 },
      steps: [
        { toolCalls: [{ toolName: "search_tasks", args: { q: "Maputo" } }] },
        { toolCalls: [] },
      ],
    });
    const result = await runAgent(fakeModel(), { ...BASE, tools: [searchTasks] });
    expect(result.steps).toBe(2);
    expect(result.toolCalls).toEqual([{ name: "search_tasks", args: { q: "Maputo" } }]);
  });
});

describe("executeToolSafely", () => {
  it("devolve o valor da tool quando corre bem", async () => {
    await expect(executeToolSafely(searchTasks, { q: "x" })).resolves.toEqual({ items: ["tarefa sobre x"] });
  });

  it("nunca lança — devolve erro estruturado", async () => {
    const broken: AgentTool = {
      name: "broken",
      description: "rebenta",
      inputSchema: z.object({}),
      execute: async () => {
        throw new Error("BD indisponível");
      },
    };
    await expect(executeToolSafely(broken, {})).resolves.toEqual({ ok: false, error: "BD indisponível" });
  });

  it("trunca outputs gigantes", async () => {
    const big: AgentTool = {
      name: "big",
      description: "devolve muito",
      inputSchema: z.object({}),
      execute: async () => "x".repeat(10_000),
    };
    const res = (await executeToolSafely(big, {})) as { truncated: boolean; preview: string };
    expect(res.truncated).toBe(true);
    expect(res.preview.length).toBeLessThanOrEqual(6000);
  });
});
