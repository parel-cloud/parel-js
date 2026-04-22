# Parel SDK for JavaScript and TypeScript

[![npm version](https://img.shields.io/npm/v/parel.svg?color=blue&label=npm)](https://www.npmjs.com/package/parel)
[![npm downloads](https://img.shields.io/npm/dm/parel.svg?color=blue)](https://www.npmjs.com/package/parel)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![GitHub Repo](https://img.shields.io/badge/github-parel--cloud%2Fparel--js-181717?logo=github)](https://github.com/parel-cloud/parel-js)

> The official TypeScript/JavaScript SDK for **[Parel](https://parel.cloud)** — 100+ AI models (LLMs, image, video, TTS, STT, embeddings), on-demand GPU rental (BYOM), and multi-model compare via a single OpenAI-compatible API.

Drop-in replacement for the OpenAI Node SDK. Point it at Parel, get Qwen, Llama, Gemma, DeepSeek, Flux, Kling, Veo, Whisper, and dozens more — plus rent a GPU and deploy your own Hugging Face model in one call.

```bash
npm install @parel-cloud/node openai
```

```ts
import { Parel } from "@parel-cloud/node";

const parel = new Parel(); // uses PAREL_API_KEY from env
const openai = await parel.openai;

const res = await openai.chat.completions.create({
  model: "qwen3.5-72b",
  messages: [{ role: "user", content: "Merhaba!" }],
});
console.log(res.choices[0].message.content);
```

---

## Why Parel SDK

- **One client, 100+ models.** Switch between OpenAI, Anthropic, Google, Qwen, Llama, DeepSeek, Flux, Kling, ElevenLabs, Whisper without rewriting code.
- **OpenAI-compatible.** Reuse the official `openai` Node SDK — streaming, tools, vision, audio, moderations, and all future OpenAI types pass through untouched.
- **BYOM GPU rental.** Deploy any Hugging Face model to a rented GPU (RunPod / Modal / Vast.ai) with one call. Full lifecycle: create, start, stop, inference, billing, events, metrics.
- **Async that feels sync.** Image, video, and TTS generations are SQS-backed tasks; the SDK polls for you and returns the final result. Opt into raw task handles when you want them.
- **Typed errors.** OpenAI-compatible error envelopes mapped to `instanceof`-able classes (`ParelRateLimitError`, `ParelBudgetExceededError`, `ParelConflictError`, …) so triage is one line of code.
- **Turkish-friendly.** Gateway supports KVKK mode with PII masking and data residency in Turkey — opt in per request.
- **Zero runtime dependencies.** Single peer dep on `openai`, ESM + CJS dual build, strict TypeScript, Node 18+.

---

## Table of Contents

- [Installation](#installation)
- [Quickstart](#quickstart)
- [What is Parel?](#what-is-parel)
- [Feature Matrix](#feature-matrix)
- [Authentication](#authentication)
- [Chat, Embeddings, Vision, Tools, Streaming](#chat-embeddings-vision-tools-streaming-via-openai-pass-through)
- [Image Generation](#image-generation)
- [Video Generation](#video-generation)
- [Text-to-Speech and Transcription](#text-to-speech-and-transcription)
- [BYOM — Bring Your Own Model](#byom--bring-your-own-model-gpu-rental)
- [Model Compare](#model-compare)
- [Credits and Budget](#credits-and-budget)
- [Tasks (cancel, wait, list)](#tasks-cancel-wait-list)
- [Error Handling](#error-handling)
- [Configuration](#configuration)
- [Supported Models](#supported-models)
- [OpenAI SDK Compatibility](#openai-sdk-compatibility)
- [FAQ](#faq)
- [Roadmap](#roadmap)
- [Links](#links)
- [License](#license)

---

## Installation

```bash
npm install @parel-cloud/node openai
# or
pnpm add parel openai
# or
yarn add parel openai
```

- **Node.js 18+** required (native `fetch`, `AbortController`, `Response`).
- `openai` is an optional peer dependency — only needed if you use `parel.openai.*`. BYOM, image / video / audio generation, compare, credits, and tasks namespaces work without it.

---

## Quickstart

```ts
import { Parel } from "@parel-cloud/node";

const parel = new Parel({ apiKey: process.env.PAREL_API_KEY });

// Budget snapshot
const credits = await parel.credits.get();
console.log(`$${credits.remaining_usd.toFixed(2)} remaining`);

// Model catalogue
const { data: models } = await parel.models.list();
console.log(`${models.length} models available`);
```

Get an API key: [parel.cloud/signup](https://parel.cloud) (every new account gets **$1 free credit**).

---

## What is Parel?

[Parel](https://parel.cloud) is an AI model and GPU platform built for developers and Turkish companies. Think of it as a single API that replaces `openai`, `anthropic`, `google-genai`, `replicate`, `fal`, `elevenlabs`, and `runpod` all at once.

Highlights:

- **OpenAI drop-in** — change `base_url` to `https://api.parel.cloud/v1`, reuse your OpenAI code.
- **KVKK mode** — PII masking + data residency in Turkey for regulated workloads.
- **Prepaid USD pricing** — pay-as-you-go, no tiers. Top up `$5` / `$20` / `$50` / `$100` / `$500`.
- **Batch tier** — 50 % discount for jobs delivered within 24 hours.
- **Deploy your own model on rented GPU** — RunPod, Modal, and Vast.ai backends with automatic failover.

Learn more: [parel.cloud](https://parel.cloud) · [docs.parel.cloud](https://docs.parel.cloud) · [app.parel.cloud](https://app.parel.cloud).

---

## Feature Matrix

| Namespace           | What it does                                      | Backed by                                       | Sync / Async |
| ------------------- | ------------------------------------------------- | ----------------------------------------------- | ------------ |
| `parel.openai`      | Chat, embeddings, moderations, vision, tools, audio (speech), streaming | Official `openai` v4/v5 SDK pointed at Parel    | Sync         |
| `parel.images`      | Image generation + image edits                     | Flux, SDXL, Recraft, Gemini Nano, DALL·E, etc.  | Polled       |
| `parel.videos`      | Text-to-video / image-to-video                     | Kling, Veo, Wan, Seedance, Hailuo              | Polled       |
| `parel.audio`       | Text-to-speech, music, transcription (STT)         | ElevenLabs, Orpheus, Kokoro, Whisper Large v3  | Polled / sync |
| `parel.gpu`         | BYOM GPU deployment lifecycle + inference          | RunPod, Modal, Vast.ai                          | Polled       |
| `parel.compare`     | Multi-model head-to-head + conversations           | Parel compare engine                            | Polled       |
| `parel.models`      | Catalogue list + retrieve                          | Parel registry                                  | Sync         |
| `parel.credits`     | Budget snapshot (remaining / spent / limit USD)    | Parel billing                                   | Sync         |
| `parel.tasks`       | Poll, wait, list, cancel async generation tasks    | Parel task queue                                | Sync         |

---

## Authentication

```ts
const parel = new Parel({ apiKey: "pk-live-..." });
// or
process.env.PAREL_API_KEY = "pk-live-...";
const parel = new Parel();
```

Generate keys at [app.parel.cloud → API Keys](https://app.parel.cloud). Keys are tenant-scoped; budget and rate limits apply per tenant.

---

## Chat, Embeddings, Vision, Tools, Streaming (via OpenAI pass-through)

`parel.openai` is a lazy-loaded instance of the official OpenAI client, pre-configured with Parel's base URL. Everything OpenAI's SDK does works — at Parel prices.

### Basic chat

```ts
const openai = await parel.openai;

const completion = await openai.chat.completions.create({
  model: "qwen3.5-72b",
  messages: [{ role: "user", content: "Why is the sky blue?" }],
});
```

### Streaming

```ts
const stream = await openai.chat.completions.create({
  model: "qwen3.5-72b",
  messages: [{ role: "user", content: "Count to 5 slowly" }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
```

### Tools / function calling

```ts
const res = await openai.chat.completions.create({
  model: "qwen3.5-72b",
  messages: [{ role: "user", content: "What's the weather in Istanbul?" }],
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        parameters: { type: "object", properties: { city: { type: "string" } } },
      },
    },
  ],
});
```

### Vision

```ts
const res = await openai.chat.completions.create({
  model: "qwen3.5-vl-32b",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What's in this image?" },
        { type: "image_url", image_url: { url: "https://example.com/cat.jpg" } },
      ],
    },
  ],
});
```

### Embeddings

```ts
const emb = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: ["merhaba", "dünya"],
});
```

### Moderations

```ts
const mod = await openai.moderations.create({
  model: "omni-moderation-latest",
  input: "some user-generated content",
});
```

### Speech

```ts
const audio = await openai.audio.speech.create({
  model: "elevenlabs-tts",
  voice: "alloy",
  input: "Parel'e hoş geldin.",
});
const buffer = Buffer.from(await audio.arrayBuffer());
await fs.writeFile("out.mp3", buffer);
```

See the [OpenAI Node SDK docs](https://github.com/openai/openai-node) for the full type surface — everything works.

---

## Image Generation

The gateway submits image jobs as SQS-backed tasks. By default, the SDK polls until the task is complete and returns the final result.

```ts
const result = await parel.images.generate({
  model: "flux-schnell",
  prompt: "A minimalist watercolor of Istanbul at dawn, Bosphorus in fog",
  size: "1024x1024",
  n: 1,
  onTick: (task) => console.log(`[${task.progress}%] ${task.status}`),
});
// result.result.data[0].url → hosted PNG
```

### Fire-and-forget mode

```ts
const submission = await parel.images.generate({
  model: "flux-schnell",
  prompt: "a neon cyberpunk cat",
  async: true,
});
// submission.task_id → poll yourself, or:
const done = await parel.tasks.waitFor(submission.task_id);
```

### Image edits

```ts
const edit = await parel.images.edit({
  model: "recraft-v4-edit",
  image: { url: "https://example.com/portrait.png" },
  prompt: "add a red fez",
});
```

**Models:** `flux-schnell` · `flux-dev` · `flux-pro` · `sdxl-turbo` · `recraft-v4` · `gemini-3.1-image` · `dall-e-3` · …

---

## Video Generation

Video tasks can take 5–30 minutes — the SDK polls with exponential intervals and raises `ParelTimeoutError` if the deadline expires.

```ts
const video = await parel.videos.generate({
  model: "wan-2.6-t2v",
  prompt: "A robot tending a cherry tree in Kyoto",
  duration: 5,
  resolution: "1280x720",
  aspect_ratio: "16:9",
  timeoutMs: 30 * 60_000,
  onTick: (t) => console.log(`${t.progress}%`),
});
// video.result.data[0].url → MP4
```

**Models:** `wan-2.6-t2v` · `kling-3` · `veo-3.1` · `seedance-1.5` · `hailuo-2` · …

---

## Text-to-Speech and Transcription

### TTS

```ts
const speech = await parel.audio.speech({
  model: "elevenlabs-tts",
  input: "Parel API'si ile bir dakikada modelini deploy et.",
  voice: "alloy",
  speed: 1.0,
});
```

Turkish-native voices: `orpheus-tr` · `kokoro-tr` · `chatterbox`.

### Music

```ts
const music = await parel.audio.music({
  model: "elevenlabs-music",
  prompt: "upbeat jazz piano, 120 bpm",
  duration: 30,
});
```

### Speech-to-text (Whisper)

```ts
const transcript = await parel.audio.transcribe({
  model: "whisper-large-v3-turbo",
  file: base64WavData,
  language: "tr",
  response_format: "json",
});
console.log(transcript.text);
```

---

## BYOM — Bring Your Own Model (GPU rental)

Rent a GPU on RunPod / Modal / Vast.ai and deploy any Hugging Face model. Parel handles the provider selection, health checks, billing, and cleanup.

```ts
// 1. Validate the model and get a GPU tier recommendation
const hf = await parel.gpu.validateHuggingFace("meta-llama/Llama-3.1-8B-Instruct");
console.log(hf.recommended_gpu_tier); // e.g. "rtx4090_24gb"
console.log(hf.vram_fp16_gb);         // e.g. 16
console.log(hf.needs_new_vllm);       // e.g. false

// 2. Optional: warm the S3 cache in the background so the first boot is faster
await parel.gpu.prefetch("meta-llama/Llama-3.1-8B-Instruct");

// 3. Create the deployment
const dep = await parel.gpu.create({
  huggingface_id: "meta-llama/Llama-3.1-8B-Instruct",
  gpu_tier: hf.recommended_gpu_tier ?? "rtx4090_24gb",
  idle_timeout_minutes: 15, // stop billing after idle
  budget_limit_usd: 5,      // hard stop when exceeded
});

// 4. Wait until it's running
await parel.gpu.waitForRunning(dep.id, {
  timeoutMs: 15 * 60_000,
  onTick: (d) => console.log(`[${d.status}] ${d.name}`),
});

// 5. Inference — OpenAI-compatible chat body
const answer = await parel.gpu.chat(dep.id, {
  messages: [{ role: "user", content: "Write a haiku about Istanbul" }],
  max_tokens: 200,
});

// 6. Cleanup
await parel.gpu.stop(dep.id);     // keep snapshot, resumable
// await parel.gpu.delete(dep.id); // full teardown
```

### GPU tiers

```ts
const tiers = await parel.gpu.tiers();
// [{ id: "rtx4090_24gb", gpu_name: "RTX 4090", vram_gb: 24, price_per_hour_usd: 0.44, ... }]
```

Supported: RTX 3090 / 4090 / 5090, A40, A6000 Ada, A100 40/80, H100 80/94, H200. See [docs](https://docs.parel.cloud) for the live catalogue.

---

## Model Compare

Run the same prompt across multiple models and get ranked results.

```ts
const run = await parel.compare.run({
  models: ["qwen3.5-72b", "gpt-4o-mini", "claude-3-5-sonnet", "gemini-2.5-pro"],
  prompt: "Summarize in 3 bullets: why KVKK compliance matters for Turkish SaaS",
  timeoutMs: 10 * 60_000,
  onTick: (r) => console.log(r.status),
});
console.log(run.results);
```

Multi-turn conversations:

```ts
const conv = await parel.compare.createConversation({ models: ["a", "b"] });
await parel.compare.addTurn(conv.id, { role: "user", content: "Hello" });
```

---

## Credits and Budget

```ts
const snap = await parel.credits.get();
// { limit_usd, spent_usd, remaining_usd, updated_at, version, tenant_id }

if (snap.remaining_usd < 1) {
  console.log("Top up: https://parel.cloud/billing");
}
```

Budget caps are enforced gateway-side — the SDK surfaces `ParelBudgetExceededError` (HTTP 402) when you're out.

---

## Tasks (cancel, wait, list)

```ts
// Cancel a task that's still pending or processing (refunds the credit)
const cancel = await parel.tasks.cancel(taskId);
console.log(`refunded $${cancel.refund_amount_usd}`);

// Poll until terminal
const done = await parel.tasks.waitFor(taskId, {
  timeoutMs: 600_000,
  intervalMs: 3_000,
  onTick: (t) => console.log(t.progress),
});

// List recent tasks
const { tasks } = await parel.tasks.list({ task_type: "video", limit: 20 });

// Fetch one
const task = await parel.tasks.get(taskId);
```

---

## Error Handling

All errors inherit from `ParelError` and carry the OpenAI-compatible envelope (`code`, `type`, `message`, `request_id`, HTTP `status`).

```ts
import {
  ParelError,
  ParelAuthenticationError,
  ParelPermissionError,
  ParelBudgetExceededError,
  ParelRateLimitError,
  ParelConflictError,
  ParelNotFoundError,
  ParelValidationError,
  ParelTimeoutError,
  ParelConnectionError,
  ParelServerError,
} from "@parel-cloud/node";

try {
  await parel.images.generate({ model: "flux-schnell", prompt: "cat" });
} catch (err) {
  if (err instanceof ParelBudgetExceededError) {
    // 402 — top up at https://parel.cloud/billing
  } else if (err instanceof ParelRateLimitError) {
    // 429 — respect err.retryAfter (seconds)
    await sleep(err.retryAfter! * 1000);
  } else if (err instanceof ParelConflictError && err.code === "task_not_cancellable") {
    // 409 on /tasks/{id}/cancel when task already completed
  } else if (err instanceof ParelTimeoutError) {
    // polling/request deadline exceeded
  } else if (err instanceof ParelError) {
    console.error(err.status, err.code, err.message, err.requestId);
  } else {
    throw err;
  }
}
```

Every error includes `requestId` — attach it to support tickets for faster triage.

---

## Configuration

```ts
new Parel({
  apiKey: "pk-live-...",              // or PAREL_API_KEY env
  baseUrl: "https://api.parel.cloud", // override for self-hosted or staging
  timeoutMs: 60_000,                  // per-request timeout
  maxRetries: 2,                      // on 429 / 5xx / network, idempotent verbs only
  fetch: globalThis.fetch,            // polyfill slot
  userAgent: "my-app/1.0",            // appended to User-Agent
});
```

### Retries

- Retries: only `GET`, `HEAD`, `DELETE`, `PUT`. `POST` / `PATCH` never retried automatically (to avoid double-charging generations).
- Backoff: exponential (500 ms → 1 s → 2 s → 4 s → 8 s cap) with ±30 % jitter.
- Triggers: HTTP `429`, `5xx`, `ParelConnectionError`, `ParelTimeoutError`.

### AbortController

Every namespace helper accepts an `AbortSignal` — cancel polling loops cleanly from upstream.

```ts
const ac = new AbortController();
setTimeout(() => ac.abort(), 60_000);
await parel.images.generate({ model, prompt, signal: ac.signal });
```

---

## Supported Models

Parel continually adds providers. A current snapshot (see `parel.models.list()` for the live catalogue):

**LLMs (open)**  · Qwen3.5 8B/14B/32B/72B · Qwen3.5-VL 32B · Llama 3.3 70B · DeepSeek V3 671B · DeepSeek R1 · Gemma 4 27B · Mistral Large · Nemotron 70B · Phi-4

**LLMs (closed)**  · GPT-4o · GPT-4o-mini · GPT-o1 · Claude 3.5 Sonnet · Claude 4 Opus · Gemini 2.5 Pro · Gemini 3.1 · Grok 4

**Image**  · Flux Schnell / Dev / Pro · SDXL Turbo · Recraft V4 · Gemini 3.1 Nano Image · DALL·E 3

**Video**  · Wan 2.6 · Kling 3 · Veo 3.1 · Seedance 1.5 · Hailuo 2

**Audio (TTS)**  · ElevenLabs v2 · Orpheus Turkish · Kokoro Turkish · Chatterbox

**Audio (STT)**  · Whisper Large v3 Turbo · Whisper Large v3 · Faster-Whisper

**Embeddings**  · text-embedding-3-small / large · bge-large · qwen3-embed

**Reranking**  · bge-reranker · jina-reranker

**Moderation**  · omni-moderation-latest

Full list and pricing: [parel.cloud/models](https://parel.cloud/models).

---

## OpenAI SDK Compatibility

If you have an existing OpenAI integration, switching to Parel is a one-line change:

```diff
- const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
+ const openai = new OpenAI({
+   apiKey: process.env.PAREL_API_KEY,
+   baseURL: "https://api.parel.cloud/v1",
+ });
```

Or use Parel SDK to get everything plus BYOM / compare / tasks / credits:

```ts
const parel = new Parel();
const openai = await parel.openai; // already pointed at Parel
```

Every OpenAI route is pass-through:

- `chat.completions.create` (including streaming, tools, vision, JSON mode)
- `embeddings.create`
- `moderations.create`
- `audio.speech.create`
- `audio.transcriptions.create`
- `images.generate`
- `images.edit`
- `models.list`
- `completions.create` (legacy)

---

## FAQ

**Q: Do I need an `openai` install?**
Only for `parel.openai.*`. Everything else (BYOM, images, videos, audio, compare, credits, tasks) works without it.

**Q: Can I use this in the browser?**
v0.1 is Node-first (18+). A browser entry point with redirected CORS is planned for v0.2. Use a server-side proxy for browsers today — never ship your Parel API key to a client.

**Q: Does it support streaming?**
Yes — via `parel.openai` (OpenAI SDK). Generation namespaces (images/videos/audio/gpu) use SQS polling, not SSE, in v0.1.

**Q: Is there a Python SDK?**
Python SDK (`parel` on PyPI) is coming. Track progress at [github.com/parel-cloud/parel-python](https://github.com/parel-cloud/parel-python).

**Q: How do I self-host or use staging?**
Pass `baseUrl` to the `Parel` constructor. All paths are `/v1/...` relative.

**Q: Is it KVKK / GDPR compliant?**
Parel offers a **KVKK mode** with PII masking and Turkey-resident data. Enable per request via headers — see [docs.parel.cloud/kvkk](https://docs.parel.cloud/kvkk).

**Q: What about pricing?**
Prepaid pay-as-you-go in USD — no subscription. Batch tier gives 50 % off for async jobs delivered within 24 hours. See [parel.cloud/pricing](https://parel.cloud/pricing).

**Q: How do I report a bug?**
[github.com/parel-cloud/parel-js/issues](https://github.com/parel-cloud/parel-js/issues). Include your `requestId` from the error.

---

## Roadmap

- **v0.2** — Browser entry point, `@parel-cloud/react` hooks, multipart file upload for STT, SSE streaming for generations.
- **v0.3** — Webhooks, batch tier helpers, schema-validated types via OpenAPI codegen.
- **v1.0** — Stable API surface, semver guarantees.

Track releases: [github.com/parel-cloud/parel-js/releases](https://github.com/parel-cloud/parel-js/releases).

---

## Links

- Website: [parel.cloud](https://parel.cloud)
- Dashboard: [app.parel.cloud](https://app.parel.cloud)
- API reference: [docs.parel.cloud](https://docs.parel.cloud)
- npm package: [npmjs.com/package/parel](https://www.npmjs.com/package/parel)
- GitHub: [github.com/parel-cloud/parel-js](https://github.com/parel-cloud/parel-js)
- Issues: [github.com/parel-cloud/parel-js/issues](https://github.com/parel-cloud/parel-js/issues)

---

## License

[MIT](./LICENSE) © [Parel Cloud](https://parel.cloud) / Aleonis Teknoloji Ltd. Şti.
