export const ok = <T>(data: T, meta?: Record<string, unknown>) => ({ success: true, data, meta });

export const fail = (code: string, message: string, details?: unknown) => ({
  success: false,
  error: { code, message, details },
});
