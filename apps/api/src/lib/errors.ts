import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { logger } from "@workdeal/shared/lib/logger";
import { fail } from "./api-response";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    logger.warn(err.message, { code: err.code, status: err.status, requestId: c.get("requestId" as never) as string | undefined });
    return c.json(fail(err.code, err.message, err.details), err.status as ContentfulStatusCode);
  }
  logger.error((err as Error).message ?? "Erro interno", {
    stack: (err as Error).stack,
    requestId: c.get("requestId" as never) as string | undefined,
  });
  return c.json(fail("INTERNAL_ERROR", "Erro interno do servidor"), 500);
};
