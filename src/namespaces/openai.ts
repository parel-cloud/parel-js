/**
 * `parel.openai` — the official OpenAI client pointed at Parel's gateway.
 *
 * Rather than re-wrap OpenAI's types, we instantiate their client with a custom
 * baseURL. Users get streaming, tools, vision, audio and the full OpenAI type
 * surface for free, while requests hit Parel.
 *
 * `openai` is a peer dependency — the SDK loads it lazily via dynamic import,
 * so users who never touch this namespace don't need it installed.
 *
 * Usage:
 *   const openai = await parel.openai;
 *   const resp = await openai.chat.completions.create({
 *     model: "qwen3.5-72b",
 *     messages: [{ role: "user", content: "hi" }],
 *   });
 *
 * The Promise is cached — subsequent `await parel.openai` accesses resolve
 * synchronously from the same instance.
 */

import { ParelConfigError } from "../errors.js";

// Intentionally `unknown`-typed so this file doesn't hard-depend on the
// openai package's type surface. Users get proper types via the object they
// `await` (tsc infers from the dynamic import when openai is installed).
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenAIClient = any;

export interface OpenAIFactoryOptions {
  apiKey: string;
  baseUrl: string;
}

type OpenAICtor = new (opts: { apiKey: string; baseURL: string }) => OpenAIClient;

let cachedCtor: OpenAICtor | null = null;
let cachedLoadError: unknown = null;

async function loadOpenAICtor(): Promise<OpenAICtor> {
  if (cachedCtor) return cachedCtor;
  if (cachedLoadError) {
    throw new ParelConfigError(
      `The 'openai' peer dependency is required for parel.openai. Install it with \`npm install openai\`. Underlying error: ${String(cachedLoadError)}`,
    );
  }
  try {
    const mod = (await import("openai")) as { default?: unknown; OpenAI?: unknown };
    const candidate = (mod.default ?? mod.OpenAI) as unknown;
    if (typeof candidate !== "function") {
      throw new Error("Imported 'openai' module did not expose a default constructor");
    }
    cachedCtor = candidate as OpenAICtor;
    return cachedCtor;
  } catch (err) {
    cachedLoadError = err;
    throw new ParelConfigError(
      `The 'openai' peer dependency is required for parel.openai. Install it with \`npm install openai\`. Underlying error: ${String(err)}`,
    );
  }
}

/**
 * Build a Promise<OpenAI> that resolves to an instance configured for Parel.
 * Called by the Parel client. The Promise itself is cached on the Parel
 * instance so repeated `await parel.openai` returns the same OpenAI.
 */
export async function createOpenAIAsync(opts: OpenAIFactoryOptions): Promise<OpenAIClient> {
  const Ctor = await loadOpenAICtor();
  return new Ctor({ apiKey: opts.apiKey, baseURL: `${opts.baseUrl}/v1` });
}

/** Reset cached state. Useful for tests. */
export function _resetOpenAIFactory(): void {
  cachedCtor = null;
  cachedLoadError = null;
}
