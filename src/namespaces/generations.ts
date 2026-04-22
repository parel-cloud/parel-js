/**
 * `parel.images` / `parel.videos` / `parel.audio` — async generation helpers.
 *
 * The gateway submits these as SQS-backed tasks; the SDK polls under the hood
 * so callers get a sync return. Opt into the raw task via `{ async: true }` to
 * get `{ task_id, poll_url }` without waiting.
 */

import type { HttpClient } from "../http.js";
import { pollUntilTerminal } from "../polling.js";
import type { Task, TaskStatus } from "../types.js";

const TERMINAL = new Set<TaskStatus>(["completed", "failed", "cancelled"]);

export interface GenerationWaitOptions {
  /** Override default timeout (ms). */
  timeoutMs?: number;
  /** Poll interval (ms). Default 2_000. */
  intervalMs?: number;
  /** External cancel. */
  signal?: AbortSignal;
  /** Invoked on each tick (progress UI). */
  onTick?: (task: Task) => void;
}

export interface AsyncOption {
  /** Return the raw {task_id, poll_url} response without polling. Default false. */
  async?: boolean;
}

export interface TaskSubmission {
  task_id: string;
  poll_url?: string;
  [extra: string]: unknown;
}

function isTaskSubmission(v: unknown): v is TaskSubmission {
  return typeof v === "object" && v !== null && typeof (v as { task_id?: unknown }).task_id === "string";
}

async function submitAndMaybeWait(
  http: HttpClient,
  path: string,
  body: Record<string, unknown>,
  wait: boolean,
  defaultTimeoutMs: number,
  opts: GenerationWaitOptions,
): Promise<Task | TaskSubmission | Record<string, unknown>> {
  const response = await http.request<unknown>({ method: "POST", path, body });

  // Sync-capable providers can respond with the final result directly
  // (200 + {data: [...]}). Only poll when the gateway returned a task handle.
  if (!isTaskSubmission(response)) {
    return response as Record<string, unknown>;
  }

  if (!wait) return response;

  const { timeoutMs = defaultTimeoutMs, intervalMs = 2_000, signal, onTick } = opts;
  const pollOpts = signal ? { timeoutMs, intervalMs, signal } : { timeoutMs, intervalMs };
  const task = await pollUntilTerminal<Task>(
    async () => {
      const t = await http.request<Task>({
        method: "GET",
        path: `/v1/tasks/${encodeURIComponent(response.task_id)}`,
      });
      onTick?.(t);
      return t;
    },
    (t) => TERMINAL.has(t.status),
    pollOpts,
  );

  return task;
}

// ---------------------- images ----------------------

export interface ImageGenerationParams {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  quality?: string;
  style?: string;
  response_format?: string;
  [extra: string]: unknown;
}

export interface ImageEditParams {
  model: string;
  image: string | { url: string } | { b64: string };
  prompt: string;
  mask?: string;
  n?: number;
  size?: string;
  [extra: string]: unknown;
}

export class ImagesNamespace {
  constructor(private readonly http: HttpClient) {}

  /** Submit an image generation. Polls until terminal by default. */
  async generate(
    params: ImageGenerationParams & AsyncOption & GenerationWaitOptions,
  ): Promise<Task | TaskSubmission | Record<string, unknown>> {
    const { async: async_, timeoutMs, intervalMs, signal, onTick, ...body } = params;
    return submitAndMaybeWait(
      this.http,
      "/v1/images/generations",
      body,
      !async_,
      180_000,
      signal ? { timeoutMs, intervalMs, signal, onTick } : { timeoutMs, intervalMs, onTick },
    );
  }

  async edit(
    params: ImageEditParams & AsyncOption & GenerationWaitOptions,
  ): Promise<Task | TaskSubmission | Record<string, unknown>> {
    const { async: async_, timeoutMs, intervalMs, signal, onTick, ...body } = params;
    return submitAndMaybeWait(
      this.http,
      "/v1/images/edits",
      body,
      !async_,
      180_000,
      signal ? { timeoutMs, intervalMs, signal, onTick } : { timeoutMs, intervalMs, onTick },
    );
  }
}

// ---------------------- videos ----------------------

export interface VideoGenerationParams {
  model: string;
  prompt: string;
  duration?: number;
  resolution?: string;
  aspect_ratio?: string;
  [extra: string]: unknown;
}

export class VideosNamespace {
  constructor(private readonly http: HttpClient) {}

  async generate(
    params: VideoGenerationParams & AsyncOption & GenerationWaitOptions,
  ): Promise<Task | TaskSubmission | Record<string, unknown>> {
    const { async: async_, timeoutMs, intervalMs, signal, onTick, ...body } = params;
    return submitAndMaybeWait(
      this.http,
      "/v1/videos/generations",
      body,
      !async_,
      1_800_000,
      signal ? { timeoutMs, intervalMs, signal, onTick } : { timeoutMs, intervalMs, onTick },
    );
  }
}

// ---------------------- audio (tts / stt / music) ----------------------

export interface SpeechParams {
  model: string;
  input: string;
  voice?: string;
  speed?: number;
  response_format?: string;
  [extra: string]: unknown;
}

export interface TranscriptionParams {
  model: string;
  file: string | Blob | Uint8Array;
  response_format?: string;
  language?: string;
  prompt?: string;
  [extra: string]: unknown;
}

export interface MusicParams {
  model: string;
  prompt: string;
  duration?: number;
  [extra: string]: unknown;
}

export class AudioNamespace {
  constructor(private readonly http: HttpClient) {}

  /** TTS (text → speech). Polls if the provider returned a task. */
  async speech(
    params: SpeechParams & AsyncOption & GenerationWaitOptions,
  ): Promise<Task | TaskSubmission | Record<string, unknown>> {
    const { async: async_, timeoutMs, intervalMs, signal, onTick, ...body } = params;
    return submitAndMaybeWait(
      this.http,
      "/v1/audio/speech",
      body,
      !async_,
      120_000,
      signal ? { timeoutMs, intervalMs, signal, onTick } : { timeoutMs, intervalMs, onTick },
    );
  }

  /** STT (speech → text). Gateway returns the transcript sync in most cases. */
  async transcribe(params: TranscriptionParams): Promise<Record<string, unknown>> {
    // Keeping multipart upload out of v0.1 — route accepts JSON with base64
    // file field for small uploads. Larger/multipart support comes in v0.2.
    return this.http.request({
      method: "POST",
      path: "/v1/audio/transcriptions",
      body: params as unknown as Record<string, unknown>,
    });
  }

  /** Music generation (async task). */
  async music(
    params: MusicParams & AsyncOption & GenerationWaitOptions,
  ): Promise<Task | TaskSubmission | Record<string, unknown>> {
    const { async: async_, timeoutMs, intervalMs, signal, onTick, ...body } = params;
    return submitAndMaybeWait(
      this.http,
      "/v1/audio/music",
      body,
      !async_,
      300_000,
      signal ? { timeoutMs, intervalMs, signal, onTick } : { timeoutMs, intervalMs, onTick },
    );
  }
}
