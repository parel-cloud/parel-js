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

// --------------------------------------------------------------------------
// Code-specific subclasses (refinement — match by error.code first, then status)
// These enable `err instanceof ParelTaskNotCancellableError` etc. while
// still satisfying `err instanceof ParelConflictError` / `ParelError`.
// --------------------------------------------------------------------------

export class ParelTaskNotCancellableError extends ParelConflictError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, code: opts.code ?? "task_not_cancellable" });
    this.name = "ParelTaskNotCancellableError";
  }
}

export class ParelPiiBlockedError extends ParelValidationError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, code: opts.code ?? "pii_blocked" });
    this.name = "ParelPiiBlockedError";
  }
}

export class ParelCapacityExhaustedError extends ParelServerError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 503, code: opts.code ?? "capacity_exhausted" });
    this.name = "ParelCapacityExhaustedError";
  }
}

export class ParelDeploymentNotReadyError extends ParelConflictError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, code: opts.code ?? "deployment_not_ready" });
    this.name = "ParelDeploymentNotReadyError";
  }
}

export class ParelDeploymentFailedError extends ParelError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 502, code: opts.code ?? "deployment_failed" });
    this.name = "ParelDeploymentFailedError";
  }
}

export class ParelProviderError extends ParelError {
  constructor(message: string, opts: ParelErrorOptions = {}) {
    super(message, { ...opts, status: opts.status ?? 502, code: opts.code ?? "provider_error" });
    this.name = "ParelProviderError";
  }
}

/**
 * Parse an HTTP error response body into a typed ParelError.
 *
 * Expects OpenAI-compatible envelope: `{ "error": { message, type, code, param, request_id } }`.
 * Falls back to `ParelAPIError` when body is opaque or non-envelope.
 *
 * Resolution order:
 *   1. By `error.code` — specific subclass (task_not_cancellable, pii_blocked,
 *      capacity_exhausted, deployment_not_ready, deployment_failed, provider_error)
 *   2. By HTTP status — generic subclass (401 auth, 402 budget, 403 perm, 404 not
 *      found, 409 conflict, 422 validation, 429 rate limit, 4xx validation, 5xx server)
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

  // 1. Code-specific subclasses (checked before status mapping so these beat
  //    the generic ParelConflictError / ParelServerError).
  if (code === "task_not_cancellable") return new ParelTaskNotCancellableError(message, opts);
  if (code === "pii_blocked") return new ParelPiiBlockedError(message, opts);
  if (code === "capacity_exhausted") return new ParelCapacityExhaustedError(message, opts);
  if (code === "deployment_not_ready") return new ParelDeploymentNotReadyError(message, opts);
  if (code === "deployment_failed") return new ParelDeploymentFailedError(message, opts);
  if (code === "provider_error") return new ParelProviderError(message, opts);

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
