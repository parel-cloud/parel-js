/**
 * Low-level HTTP client used by all Parel SDK namespaces.
 *
 * Responsibilities:
 *   - Attach auth header (Bearer <apiKey>)
 *   - JSON serialize/deserialize
 *   - Enforce per-request timeout via AbortController
 *   - Exponential backoff retry on 5xx + 429 + network errors (idempotent verbs)
 *   - Surface typed errors from `parseHttpError`
 */

import { parseHttpError, ParelConnectionError, ParelError, ParelTimeoutError } from "./errors.js";

export interface HttpClientOptions {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  fetchImpl?: typeof globalThis.fetch;
  userAgent?: string;
}

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /**
   * Override per-request timeout. Defaults to client's timeoutMs.
   * Set to `0` to disable the client-side timeout for this call
   * (e.g. long polling); the underlying fetch still has its own timeout.
   */
  timeoutMs?: number;
  /** Override retry count. Defaults to client's maxRetries for idempotent verbs, 0 for POST/PATCH. */
  maxRetries?: number;
}

const DEFAULT_USER_AGENT = "parel-js/0.1.0";

const IDEMPOTENT = new Set(["GET", "HEAD", "DELETE", "PUT"]);

function buildQuery(q: RequestOptions["query"]): string {
  if (!q) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new ParelTimeoutError("aborted"));
      },
      { once: true },
    );
  });
}

function backoffMs(attempt: number): number {
  // 500ms, 1s, 2s, 4s capped at 8s, with +/-30% jitter
  const base = Math.min(500 * Math.pow(2, attempt), 8000);
  const jitter = base * (0.7 + Math.random() * 0.6);
  return Math.round(jitter);
}

function shouldRetry(status: number): boolean {
  // Retry server errors and rate limits. 402/409/4xx are deterministic.
  return status === 429 || (status >= 500 && status < 600);
}

async function readBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (!res.body) return null;
  const text = await res.text();
  if (!text) return null;
  if (ct.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

export class HttpClient {
  private readonly opts: HttpClientOptions;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly userAgent: string;

  constructor(opts: HttpClientOptions) {
    this.opts = opts;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    this.userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
    if (!this.fetchImpl) {
      throw new Error(
        "No fetch implementation found. Parel SDK requires Node.js 18+ or a polyfill (e.g. `undici`).",
      );
    }
  }

  async request<T = unknown>(opts: RequestOptions): Promise<T> {
    const maxRetries =
      opts.maxRetries ??
      (IDEMPOTENT.has(opts.method) ? this.opts.maxRetries : 0);

    let lastError: unknown = undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.dispatch<T>(opts);
      } catch (err) {
        lastError = err;
        const retryable = this.isRetryable(err) && attempt < maxRetries;
        if (!retryable) throw err;
        await sleep(backoffMs(attempt), opts.signal);
      }
    }
    throw lastError;
  }

  private isRetryable(err: unknown): boolean {
    if (err instanceof ParelConnectionError) return true;
    if (err instanceof ParelTimeoutError) return true;
    if (err instanceof ParelError && err.status && shouldRetry(err.status)) return true;
    return false;
  }

  private async dispatch<T>(opts: RequestOptions): Promise<T> {
    const url = `${this.opts.baseUrl}${opts.path}${buildQuery(opts.query)}`;
    const timeoutMs = opts.timeoutMs ?? this.opts.timeoutMs;

    const controller = new AbortController();
    let timedOut = false;
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs)
        : null;

    const userSignal = opts.signal;
    const onUserAbort = () => controller.abort();
    userSignal?.addEventListener("abort", onUserAbort, { once: true });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.opts.apiKey}`,
      "User-Agent": this.userAgent,
      Accept: "application/json",
      ...(opts.headers ?? {}),
    };

    let bodyInit: BodyInit | undefined;
    if (opts.body !== undefined) {
      if (typeof opts.body === "string" || opts.body instanceof Uint8Array || opts.body instanceof Blob) {
        bodyInit = opts.body as BodyInit;
      } else {
        headers["Content-Type"] ??= "application/json";
        bodyInit = JSON.stringify(opts.body);
      }
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: opts.method,
        headers,
        body: bodyInit,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (timedOut || (err instanceof Error && err.name === "AbortError")) {
        throw new ParelTimeoutError(`Request timed out after ${timeoutMs}ms`);
      }
      throw new ParelConnectionError(
        err instanceof Error ? err.message : `Network error`,
        err,
      );
    } finally {
      if (timer) clearTimeout(timer);
      userSignal?.removeEventListener("abort", onUserAbort);
    }

    if (res.ok) {
      const body = await readBody(res);
      return body as T;
    }

    const errBody = await readBody(res);
    throw parseHttpError(res.status, errBody, res.headers);
  }
}
