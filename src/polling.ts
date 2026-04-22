/**
 * Generic polling helper used by task-bound namespaces (images, videos, audio,
 * gpu lifecycle). Callers supply a fetcher + terminal-state predicate; the
 * helper drives the loop with jittered interval and a hard deadline.
 */

import { ParelTimeoutError } from "./errors.js";

export interface PollOptions {
  /** Total time budget in ms. Throws ParelTimeoutError on expiry. */
  timeoutMs: number;
  /** Initial poll interval in ms. */
  intervalMs: number;
  /** Max interval after exponential growth. Default 10_000. */
  maxIntervalMs?: number;
  /** Multiplier for interval after each poll. Default 1 (fixed interval). */
  intervalMultiplier?: number;
  /** External cancel hook. */
  signal?: AbortSignal;
  /** Invoked on every poll (useful for progress UI). */
  onTick?: () => void;
}

const DEFAULTS = {
  intervalMs: 2_000,
  maxIntervalMs: 10_000,
  intervalMultiplier: 1,
} as const;

/**
 * Poll `fetcher` until `isTerminal(value)` returns true or deadline expires.
 *
 * Returns the final value. Throws `ParelTimeoutError` on timeout or abort.
 * Any error thrown by `fetcher` bubbles up (no retry wrapper here — use
 * HttpClient's retry for transient failures).
 */
export async function pollUntilTerminal<T>(
  fetcher: () => Promise<T>,
  isTerminal: (v: T) => boolean,
  opts: PollOptions,
): Promise<T> {
  const {
    timeoutMs,
    signal,
    intervalMs = DEFAULTS.intervalMs,
    maxIntervalMs = DEFAULTS.maxIntervalMs,
    intervalMultiplier = DEFAULTS.intervalMultiplier,
    onTick,
  } = opts;

  const deadline = Date.now() + timeoutMs;
  let nextInterval = intervalMs;

  while (true) {
    if (signal?.aborted) throw new ParelTimeoutError("polling aborted");

    onTick?.();
    const value = await fetcher();
    if (isTerminal(value)) return value;

    if (Date.now() >= deadline) {
      throw new ParelTimeoutError(`Polling did not reach terminal state within ${timeoutMs}ms`);
    }

    const remaining = deadline - Date.now();
    const wait = Math.min(nextInterval, remaining + 50);
    await sleep(wait, signal);
    nextInterval = Math.min(nextInterval * intervalMultiplier, maxIntervalMs);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ParelTimeoutError("aborted"));
      return;
    }
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
