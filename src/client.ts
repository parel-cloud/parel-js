/**
 * Parel SDK root client. Instances compose the HTTP layer with all namespaces.
 *
 *   const parel = new Parel({ apiKey: process.env.PAREL_API_KEY });
 *   await parel.credits();
 *   await parel.images.generate({ model: "flux-schnell", prompt: "cat" });
 */

import { HttpClient } from "./http.js";
import { ParelConfigError } from "./errors.js";

export interface ParelOptions {
  /**
   * API key. If omitted, falls back to `process.env.PAREL_API_KEY` (Node only).
   * Throws `ParelConfigError` when no key can be resolved.
   */
  apiKey?: string;
  /** Base URL including protocol. Default: https://api.parel.cloud */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Default 60_000. */
  timeoutMs?: number;
  /** Max retries for idempotent verbs on 429/5xx/network errors. Default 2. */
  maxRetries?: number;
  /** Custom fetch implementation (useful for tests/mocking). Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Extra User-Agent suffix (e.g. app name). */
  userAgent?: string;
}

const DEFAULT_BASE_URL = "https://api.parel.cloud";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;

function readEnvApiKey(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
    return proc?.env?.["PAREL_API_KEY"];
  } catch {
    return undefined;
  }
}

export class Parel {
  readonly http: HttpClient;
  readonly baseUrl: string;

  constructor(options: ParelOptions = {}) {
    const apiKey = options.apiKey ?? readEnvApiKey();
    if (!apiKey) {
      throw new ParelConfigError(
        "Parel SDK: missing API key. Pass `{ apiKey }` or set PAREL_API_KEY env var.",
      );
    }

    const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    this.baseUrl = baseUrl;
    this.http = new HttpClient({
      apiKey,
      baseUrl,
      timeoutMs,
      maxRetries,
      fetchImpl: options.fetch,
      userAgent: options.userAgent,
    });
  }
}
