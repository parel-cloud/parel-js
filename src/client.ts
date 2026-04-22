/**
 * Parel SDK root client. Instances compose the HTTP layer with all namespaces.
 *
 *   const parel = new Parel({ apiKey: process.env.PAREL_API_KEY });
 *   await parel.credits.get();
 *   await parel.tasks.cancel(taskId);
 *   const openai = await parel.openai;
 *   await openai.chat.completions.create({ model: "qwen3.5-72b", messages: [...] });
 */

import { ParelConfigError } from "./errors.js";
import { HttpClient } from "./http.js";
import { CompareNamespace } from "./namespaces/compare.js";
import { CreditsNamespace } from "./namespaces/credits.js";
import { AudioNamespace, ImagesNamespace, VideosNamespace } from "./namespaces/generations.js";
import { GpuNamespace } from "./namespaces/gpu.js";
import { ModelsNamespace } from "./namespaces/models.js";
import { createOpenAIAsync, type OpenAIClient } from "./namespaces/openai.js";
import { TasksNamespace } from "./namespaces/tasks.js";

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
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
    return proc?.env?.["PAREL_API_KEY"];
  } catch {
    return undefined;
  }
}

export class Parel {
  readonly http: HttpClient;
  readonly baseUrl: string;
  readonly apiKey: string;

  readonly tasks: TasksNamespace;
  readonly credits: CreditsNamespace;
  readonly models: ModelsNamespace;
  readonly gpu: GpuNamespace;
  readonly compare: CompareNamespace;
  readonly images: ImagesNamespace;
  readonly videos: VideosNamespace;
  readonly audio: AudioNamespace;

  private _openai?: Promise<OpenAIClient>;

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

    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.http = new HttpClient({
      apiKey,
      baseUrl,
      timeoutMs,
      maxRetries,
      fetchImpl: options.fetch,
      userAgent: options.userAgent,
    });

    this.tasks = new TasksNamespace(this.http);
    this.credits = new CreditsNamespace(this.http);
    this.models = new ModelsNamespace(this.http);
    this.gpu = new GpuNamespace(this.http);
    this.compare = new CompareNamespace(this.http);
    this.images = new ImagesNamespace(this.http);
    this.videos = new VideosNamespace(this.http);
    this.audio = new AudioNamespace(this.http);
  }

  /**
   * Promise resolving to the official OpenAI client, pre-configured for Parel.
   * Requires the `openai` peer dep. Cached — repeated access returns the same
   * Promise (and therefore same instance).
   *
   *   const openai = await parel.openai;
   *   await openai.chat.completions.create({ model: "...", messages: [...] });
   */
  get openai(): Promise<OpenAIClient> {
    if (!this._openai) {
      this._openai = createOpenAIAsync({ apiKey: this.apiKey, baseUrl: this.baseUrl });
    }
    return this._openai;
  }
}
