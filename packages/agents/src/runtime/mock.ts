import { ZERO_USAGE } from "../usage.js";
import type { AgentRunResult } from "../types.js";

/** Provider `mock` — dev/CI sem chave de API. O serviço decide o texto devolvido. */
export function mockResult(reply: string): AgentRunResult {
  return {
    text: reply,
    output: undefined,
    model: "mock",
    providerId: "mock",
    status: "ok",
    errorCode: null,
    usage: ZERO_USAGE,
    durationMs: 0,
  };
}