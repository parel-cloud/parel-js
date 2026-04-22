import { describe, expect, it, vi } from "vitest";

import {
  ParelAuthenticationError,
  ParelConnectionError,
  ParelRateLimitError,
  ParelTimeoutError,
} from "../src/errors.js";
import { HttpClient } from "../src/http.js";

function makeJsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function buildClient(fetchImpl: typeof globalThis.fetch, overrides: Partial<{ maxRetries: number; timeoutMs: number }> = {}) {
  return new HttpClient({
    apiKey: "pk-test",
    baseUrl: "https://api.example.com",
    timeoutMs: overrides.timeoutMs ?? 5000,
    maxRetries: overrides.maxRetries ?? 2,
    fetchImpl,
  });
}

describe("HttpClient", () => {
  it("sends Authorization and Content-Type headers and parses JSON", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer pk-test");
      expect(headers.get("content-type")).toBe("application/json");
      return makeJsonResponse(200, { ok: true });
    });
    const http = buildClient(fetchMock as unknown as typeof fetch);
    const body = await http.request<{ ok: boolean }>({
      method: "POST",
      path: "/v1/test",
      body: { foo: "bar" },
    });
    expect(body).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("throws typed error on 401", async () => {
    const fetchMock = vi.fn(async () =>
      makeJsonResponse(401, { error: { message: "bad key", code: "invalid_api_key" } }),
    );
    const http = buildClient(fetchMock as unknown as typeof fetch, { maxRetries: 0 });
    await expect(http.request({ method: "GET", path: "/v1/me" })).rejects.toBeInstanceOf(
      ParelAuthenticationError,
    );
  });

  it("retries on 429 for idempotent GET and eventually succeeds", async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      if (calls < 3) {
        return makeJsonResponse(429, { error: { message: "slow" } }, { "retry-after": "0" });
      }
      return makeJsonResponse(200, { ok: true });
    });
    const http = buildClient(fetchMock as unknown as typeof fetch, { maxRetries: 3 });
    const res = await http.request<{ ok: boolean }>({ method: "GET", path: "/v1/models" });
    expect(res).toEqual({ ok: true });
    expect(calls).toBe(3);
  });

  it("does NOT retry POST by default (non-idempotent)", async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      return makeJsonResponse(429, { error: { message: "slow" } }, { "retry-after": "0" });
    });
    const http = buildClient(fetchMock as unknown as typeof fetch, { maxRetries: 3 });
    await expect(
      http.request({ method: "POST", path: "/v1/images/generations", body: { prompt: "x" } }),
    ).rejects.toBeInstanceOf(ParelRateLimitError);
    expect(calls).toBe(1);
  });

  it("surfaces network errors as ParelConnectionError", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const http = buildClient(fetchMock as unknown as typeof fetch, { maxRetries: 0 });
    await expect(http.request({ method: "GET", path: "/v1/models" })).rejects.toBeInstanceOf(
      ParelConnectionError,
    );
  });

  it("throws ParelTimeoutError when request exceeds timeout", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      await new Promise((r, rej) => {
        const signal = init?.signal;
        signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })));
        setTimeout(r, 5000);
      });
      return makeJsonResponse(200, {});
    });
    const http = buildClient(fetchMock as unknown as typeof fetch, { maxRetries: 0, timeoutMs: 50 });
    await expect(http.request({ method: "GET", path: "/v1/models" })).rejects.toBeInstanceOf(
      ParelTimeoutError,
    );
  });

  it("builds query string from query object", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      expect(String(url)).toContain("?task_type=image&limit=10");
      return makeJsonResponse(200, { tasks: [] });
    });
    const http = buildClient(fetchMock as unknown as typeof fetch);
    await http.request({
      method: "GET",
      path: "/v1/tasks",
      query: { task_type: "image", limit: 10, status: null },
    });
  });
});
