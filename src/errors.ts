/**
 * Parel SDK error hierarchy.
 *
 * Base class `ParelError` carries the standard OpenAI-compatible error envelope
 * fields (message, type, code, status, request_id, param). HTTP-status-specific
 * subclasses enable `instanceof` checks in user code:
 *
 *   try { await parel.images.generate(...) }
 *   catch (e) {
 *     if (e instanceof ParelRateLimitError) { ... }
 *     if (e instanceof ParelBudgetExceededError) { ... }
 *   }
 */

export interface ParelErrorOptions {
  code?: string;
  type?: string;
  status?: number;
  requestId?: string;
  param?: string;
  retryAfter?: number;
  raw?: unknown;
}

export class ParelError extends Error {
  readonly code?: string;
  readonly type?: string;
  readonly status?: number;
  readonly requestId?: string;
  readonly param?: string;
  readonly raw?: unknown;

  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message);
    this.name = "ParelError";
    this.code = opts.code;
    this.type = opts.type;
    this.status = opts.status;
    this.requestId = opts.requestId;
    this.param = opts.param;
    this.raw = opts.raw;
  }
}

export class ParelConfigError extends ParelError {
  constructor(message: string) {
    super(message, { code: "config_error" });
    this.name = "ParelConfigError";
  }
}

export class ParelTimeoutError extends ParelError {
  constructor(message: string) {
    super(message, { code: "timeout" });
    this.name = "ParelTimeoutError";
  }
}

export class ParelConnectionError extends ParelError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: "connection_error", raw: cause });
    this.name = "ParelConnectionError";
  }
}

export class ParelAuthenticationError extends ParelError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 401 });
    this.name = "ParelAuthenticationError";
  }
}

export class ParelPermissionError extends ParelError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 403 });
    this.name = "ParelPermissionError";
  }
}

export class ParelNotFoundError extends ParelError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 404 });
    this.name = "ParelNotFoundError";
  }
}

export class ParelConflictError extends ParelError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 409 });
    this.name = "ParelConflictError";
  }
}

export class ParelValidationError extends ParelError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 400 });
    this.name = "ParelValidationError";
  }
}

export class ParelRateLimitError extends ParelError {
  readonly retryAfter?: number;
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 429 });
    this.name = "ParelRateLimitError";
    this.retryAfter = opts.retryAfter;
  }
}

export class ParelBudgetExceededError extends ParelError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 402 });
    this.name = "ParelBudgetExceededError";
  }
}

export class ParelServerError extends ParelError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 500 });
    this.name = "ParelServerError";
  }
}

export class ParelAPIError extends ParelError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, opts);
    this.name = "ParelAPIError";
  }
}

/**
 * Parse an HTTP error response body into a typed ParelError.
 *
 * Expects OpenAI-compatible envelope: `{ "error": { message, type, code, param, request_id } }`.
 * Falls back to `ParelAPIError` when body is opaque or non-envelope.
 *
 * Mapping by HTTP status (primary) + by `error.code` (refinement):
 *   401 → ParelAuthenticationError
 *   402 → ParelBudgetExceededError
 *   403 → ParelPermissionError
 *   404 → ParelNotFoundError
 *   409 → ParelConflictError
 *   422 → ParelValidationError
 *   429 → ParelRateLimitError (retry-after extracted)
 *   4xx (other) → ParelValidationError
 *   5xx → ParelServerError
 */
export function parseHttpError(
  status: number,
  body: unknown,
  headers?: { get(name: string): string | null },
): ParelError {
  const envelope =
    typeof body === "object" && body !== null && "error" in body
      ? (body as { error: Record<string, unknown> }).error
      : null;

  const message =
    (envelope && typeof envelope["message"] === "string" && (envelope["message"] as string)) ||
    (typeof body === "string" && body) ||
    `HTTP ${status}`;

  const code = envelope && typeof envelope["code"] === "string" ? (envelope["code"] as string) : undefined;
  const type = envelope && typeof envelope["type"] === "string" ? (envelope["type"] as string) : undefined;
  const param = envelope && typeof envelope["param"] === "string" ? (envelope["param"] as string) : undefined;
  const requestId =
    (envelope && typeof envelope["request_id"] === "string" && (envelope["request_id"] as string)) ||
    headers?.get("x-request-id") ||
    undefined;

  const opts: ParelErrorOptions = { code, type, status, param, raw: body };
  if (requestId) opts.requestId = requestId;

  if (status === 401) return new ParelAuthenticationError(message, opts);
  if (status === 402) return new ParelBudgetExceededError(message, opts);
  if (status === 403) return new ParelPermissionError(message, opts);
  if (status === 404) return new ParelNotFoundError(message, opts);
  if (status === 409) return new ParelConflictError(message, opts);
  if (status === 422) return new ParelValidationError(message, opts);
  if (status === 429) {
    const retryAfterHeader = headers?.get("retry-after");
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    if (retryAfter !== undefined && Number.isFinite(retryAfter)) {
      opts.retryAfter = retryAfter;
    }
    return new ParelRateLimitError(message, opts);
  }
  if (status >= 400 && status < 500) return new ParelValidationError(message, opts);
  if (status >= 500) return new ParelServerError(message, opts);
  return new ParelAPIError(message, opts);
}
