/**
 * Logger estruturado mínimo — WS0.
 * Usa `requestId` do middleware quando disponível.
 * Trocar por Pino/Winston quando volume justificar.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  route?: string;
  userId?: string;
  durationMs?: number;
  status?: number;
  [k: string]: unknown;
}

function log(level: LogLevel, message: string, ctx: LogContext = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...ctx,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => log("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext) => log("error", msg, ctx),
};
