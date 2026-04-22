import { describe, expect, it } from "vitest";

import {
  ParelAuthenticationError,
  ParelBudgetExceededError,
  ParelCapacityExhaustedError,
  ParelConflictError,
  ParelDeploymentFailedError,
  ParelDeploymentNotReadyError,
  ParelError,
  ParelNotFoundError,
  ParelPiiBlockedError,
  ParelProviderError,
  ParelRateLimitError,
  ParelServerError,
  ParelTaskNotCancellableError,
  ParelValidationError,
  parseHttpError,
} from "../src/errors.js";

const fakeHeaders = (entries: Record<string, string> = {}) => ({
  get: (name: string) => entries[name.toLowerCase()] ?? null,
});

describe("parseHttpError", () => {
  it("maps 401 → ParelAuthenticationError with envelope fields", () => {
    const err = parseHttpError(
      401,
      { error: { message: "Invalid key", type: "authentication_error", code: "invalid_api_key", request_id: "req_1" } },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelAuthenticationError);
    expect(err).toBeInstanceOf(ParelError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("invalid_api_key");
    expect(err.type).toBe("authentication_error");
    expect(err.requestId).toBe("req_1");
    expect(err.message).toBe("Invalid key");
  });

  it("maps 402 → ParelBudgetExceededError", () => {
    const err = parseHttpError(
      402,
      { error: { message: "Budget exceeded", type: "billing_error", code: "budget_exceeded" } },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelBudgetExceededError);
    expect(err.status).toBe(402);
  });

  it("maps 404 → ParelNotFoundError", () => {
    const err = parseHttpError(404, { error: { message: "Task not found", code: "not_found" } }, fakeHeaders());
    expect(err).toBeInstanceOf(ParelNotFoundError);
    expect(err.code).toBe("not_found");
  });

  it("maps 409 → ParelConflictError with custom code passthrough", () => {
    const err = parseHttpError(
      409,
      { error: { message: "Task already terminal", code: "task_not_cancellable" } },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelConflictError);
    expect(err.code).toBe("task_not_cancellable");
  });

  it("maps 422 → ParelValidationError with param", () => {
    const err = parseHttpError(
      422,
      { error: { message: "model: field required", code: "validation_error", param: "model" } },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelValidationError);
    expect(err.param).toBe("model");
  });

  it("maps 429 → ParelRateLimitError and extracts Retry-After", () => {
    const err = parseHttpError(
      429,
      { error: { message: "slow down" } },
      fakeHeaders({ "retry-after": "42" }),
    );
    expect(err).toBeInstanceOf(ParelRateLimitError);
    expect((err as ParelRateLimitError).retryAfter).toBe(42);
  });

  it("maps 500 → ParelServerError", () => {
    const err = parseHttpError(503, { error: { message: "down" } }, fakeHeaders());
    expect(err).toBeInstanceOf(ParelServerError);
    expect(err.status).toBe(503);
  });

  it("falls back when response is not an OpenAI envelope", () => {
    const err = parseHttpError(418, "I'm a teapot", fakeHeaders());
    expect(err).toBeInstanceOf(ParelError);
    expect(err.message).toBe("I'm a teapot");
  });

  it("extracts request_id from x-request-id header when body lacks it", () => {
    const err = parseHttpError(
      500,
      { error: { message: "boom" } },
      fakeHeaders({ "x-request-id": "req_header" }),
    );
    expect(err.requestId).toBe("req_header");
  });
});

describe("parseHttpError code-specific subclasses", () => {
  it("code=task_not_cancellable → ParelTaskNotCancellableError (extends Conflict)", () => {
    const err = parseHttpError(
      409,
      {
        error: {
          message: "Task already in terminal state: completed",
          code: "task_not_cancellable",
          type: "invalid_request_error",
        },
      },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelTaskNotCancellableError);
    expect(err).toBeInstanceOf(ParelConflictError);
    expect(err).toBeInstanceOf(ParelError);
    expect(err.code).toBe("task_not_cancellable");
    expect(err.status).toBe(409);
  });

  it("code=pii_blocked → ParelPiiBlockedError (extends Validation)", () => {
    const err = parseHttpError(
      400,
      { error: { message: "PII detected and mode is 'block': email, phone", code: "pii_blocked" } },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelPiiBlockedError);
    expect(err).toBeInstanceOf(ParelValidationError);
    expect(err.code).toBe("pii_blocked");
  });

  it("code=capacity_exhausted → ParelCapacityExhaustedError (extends Server)", () => {
    const err = parseHttpError(
      503,
      { error: { message: "All GPU providers at capacity", code: "capacity_exhausted" } },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelCapacityExhaustedError);
    expect(err).toBeInstanceOf(ParelServerError);
    expect(err.code).toBe("capacity_exhausted");
  });

  it("code=deployment_not_ready → ParelDeploymentNotReadyError (extends Conflict)", () => {
    const err = parseHttpError(
      409,
      { error: { message: "Deployment not ready: starting", code: "deployment_not_ready" } },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelDeploymentNotReadyError);
    expect(err).toBeInstanceOf(ParelConflictError);
  });

  it("code=deployment_failed → ParelDeploymentFailedError", () => {
    const err = parseHttpError(
      502,
      { error: { message: "Deployment crash loop", code: "deployment_failed" } },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelDeploymentFailedError);
  });

  it("code=provider_error → ParelProviderError", () => {
    const err = parseHttpError(
      502,
      { error: { message: "Upstream provider 500", code: "provider_error", type: "upstream_error" } },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelProviderError);
    expect(err.type).toBe("upstream_error");
  });

  it("unknown code falls back to status-based subclass", () => {
    const err = parseHttpError(
      409,
      { error: { message: "some new 409", code: "some_new_code" } },
      fakeHeaders(),
    );
    expect(err).toBeInstanceOf(ParelConflictError);
    expect(err).not.toBeInstanceOf(ParelTaskNotCancellableError);
    expect(err).not.toBeInstanceOf(ParelDeploymentNotReadyError);
    expect(err.code).toBe("some_new_code");
  });
});
