<p align="center">
  <a href="https://parel.cloud">
    <img src="https://raw.githubusercontent.com/parel-cloud/parel-js/main/assets/hero.svg" alt="Parel - Run, use, compare 100+ AI models through one API" width="760"/>
  </a>
</p>

<h1 align="center">@parel-cloud/node</h1>

<p align="center">
  <b>The official Node.js / TypeScript SDK for <a href="https://parel.cloud">Parel</a>.</b><br/>
  100+ AI models (LLMs, image, video, TTS, STT, embeddings) + on-demand GPU rental (BYOM) + multi-model compare, behind one OpenAI-compatible API.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@parel-cloud/node"><img alt="npm" src="https://img.shields.io/npm/v/@parel-cloud/node.svg?color=%230b5fff&label=npm&logo=npm"/></a>
  <a href="https://www.npmjs.com/package/@parel-cloud/node"><img alt="downloads" src="https://img.shields.io/npm/dm/@parel-cloud/node.svg?color=%230b5fff"/></a>
  <a href="https://github.com/parel-cloud/parel-js"><img alt="GitHub" src="https://img.shields.io/github/stars/parel-cloud/parel-js?style=social"/></a>
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-22c55e"/></a>
  <a href="#"><img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white"/></a>
  <a href="#"><img alt="Node.js 18+" src="https://img.shields.io/badge/Node.js-18%2B-43853d?logo=node.js&logoColor=white"/></a>
</p>

<p align="center">
  <a href="https://parel.cloud"><b>parel.cloud</b></a> ·
  <a href="https://app.parel.cloud">Dashboard</a> ·
  <a href="https://docs.parel.cloud">Docs</a> ·
  <a href="https://github.com/parel-cloud/parel-js/issues">Issues</a>
</p>

---

## Install

```bash
npm install @parel-cloud/node openai
```

## Hello world

```ts
import { Parel } from "@parel-cloud/node";

const parel = new Parel(); // reads PAREL_API_KEY
const openai = await parel.openai;

const chat = await openai.chat.completions.create({
  model: "qwen3.5-72b",
  messages: [{ role: "user", content: "Merhaba, bana bir haiku yaz." }],
});
console.log(chat.choices[0].message.content);
```

Sign up at [parel.cloud](https://parel.cloud) and every new account gets **$1 free credit**. That is a few thousand chat tokens, a handful of Flux images, or a one-minute Wan video, on us.

---

## Why @parel-cloud/node

<table>
  <tr>
    <td width="33%" valign="top">
      <b>One client, 100+ models</b><br/>
      Qwen, Llama, Gemma, DeepSeek, GPT, Claude, Gemini, Flux, Kling, Veo, Whisper. Switch the <code>model</code> string, everything else stays the same.
    </td>
    <td width="33%" valign="top">
      <b>OpenAI drop-in</b><br/>
      Reuse the official <code>openai</code> Node SDK. Streaming, tools, vision, JSON mode, audio, moderations all pass through, at Parel prices.
    </td>
    <td width="33%" valign="top">
      <b>BYOM GPU rental</b><br/>
      Deploy any Hugging Face model to RunPod, Modal, or Vast.ai with one call. Parel handles capacity, pricing, health, billing, cleanup.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <b>Async that feels sync</b><br/>
      Image, video, TTS, music are SQS-backed tasks. The SDK polls for you. Opt out with <code>{ async: true }</code> if you want the raw task handle.
    </td>
    <td valign="top">
      <b>Typed errors</b><br/>
      OpenAI-compatible error envelopes map to <code>instanceof</code>-able classes. <code>ParelRateLimitError</code>, <code>ParelBudgetExceededError</code>, <code>ParelConflictError</code>. One line triage.
    </td>
    <td valign="top">
      <b>KVKK friendly</b><br/>
      Opt-in PII masking + Turkish data residency. Qwen for Turkish, Orpheus and Kokoro for Turkish TTS, Whisper Turbo for Turkish STT.
    </td>
  </tr>
</table>

---

## How it works

<p align="center">
  <img alt="Parel architecture: your app uses @parel-cloud/node to call api.parel.cloud which routes to 100+ AI providers" src="https://raw.githubusercontent.com/parel-cloud/parel-js/main/assets/architecture.svg" width="900"/>
</p>

Your app calls `@parel-cloud/node`. The SDK speaks HTTPS + Bearer auth to `api.parel.cloud`. Parel routes the request to the right provider, enforces your budget, handles PII, and returns an OpenAI-shaped response. The SDK never holds vendor keys. You never glue five client libraries together.

---

## Providers

<p align="center">
  <img src="https://parel.cloud/vendor-marks/openai.svg" alt="OpenAI" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/anthropic.svg" alt="Anthropic" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/google.svg" alt="Google" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/gemini.svg" alt="Gemini" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/meta.svg" alt="Meta" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/qwen.svg" alt="Qwen" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/mistral.svg" alt="Mistral" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/deepseek.png" alt="DeepSeek" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/flux.svg" alt="Flux" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/kling.webp" alt="Kling" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/elevenlabs.svg" alt="ElevenLabs" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/moonshot.svg" alt="Moonshot" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/nvidia.svg" alt="NVIDIA" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/bytedance.svg" alt="ByteDance" height="28"/> &nbsp;&nbsp;
  <img src="https://parel.cloud/vendor-marks/cohere.svg" alt="Cohere" height="28"/>
</p>

<p align="center"><sub>and 15 more. Full catalogue: <code>await parel.models.list()</code>.</sub></p>

---

## What you get

| Namespace         | What it does                                                      | Return mode    |
|-------------------|-------------------------------------------------------------------|----------------|
| `parel.openai`    | Chat, embeddings, moderations, vision, tools, streaming, speech   | Sync, streamed |
| `parel.images`    | Image generation and edits                                        | Polled, sync   |
| `parel.videos`    | Text-to-video, image-to-video                                     | Polled, sync   |
| `parel.audio`     | TTS, music, transcription                                         | Polled, sync   |
| `parel.gpu`       | BYOM deploy lifecycle, inference, billing, events, tiers, prefetch| Polled         |
| `parel.compare`   | Multi-model head-to-head, conversations, winner marking           | Polled         |
| `parel.models`    | Catalogue list and detail                                         | Sync           |
| `parel.credits`   | Budget snapshot in USD                                            | Sync           |
| `parel.tasks`     | Poll, wait, list, cancel async jobs                               | Sync           |

---

## Quickstart

### Chat (OpenAI pass-through)

```ts
import { Parel } from "@parel-cloud/node";

const parel = new Parel({ apiKey: process.env.PAREL_API_KEY });
const openai = await parel.openai;

const res = await openai.chat.completions.create({
  model: "qwen3.5-72b",
  messages: [{ role: "user", content: "Why is the sky blue?" }],
});
```

### Streaming

```ts
const stream = await openai.chat.completions.create({
  model: "qwen3.5-72b",
  messages: [{ role: "user", content: "Count to 5." }],
  stream: true,
});
for await (const chunk of stream) process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
```

### Tools and vision

```ts
await openai.chat.completions.create({
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
  tools: [{ type: "function", function: { name: "search_web", parameters: { type: "object", properties: { q: { type: "string" } } } } }],
});
```

### Images

```ts
const image = await parel.images.generate({
  model: "flux-schnell",
  prompt: "A minimalist watercolor of Istanbul at dawn, Bosphorus in fog",
  size: "1024x1024",
  onTick: (t) => console.log(`[${t.progress}%] ${t.status}`),
});
// image.result.data[0].url
```

Fire-and-forget:

```ts
const { task_id } = await parel.images.generate({ model: "flux-schnell", prompt: "...", async: true });
const done = await parel.tasks.waitFor(task_id);
```

### Video

```ts
const video = await parel.videos.generate({
  model: "wan-2.6-t2v",
  prompt: "A robot watering a cherry tree at sunset",
  duration: 5,
  resolution: "1280x720",
  timeoutMs: 30 * 60_000,
});
```

### Speech and transcription

```ts
// TTS
await parel.audio.speech({ model: "elevenlabs-tts", input: "Parel'e hoş geldin", voice: "alloy" });

// STT (Whisper Turbo, Turkish-friendly)
const t = await parel.audio.transcribe({ model: "whisper-large-v3-turbo", file: base64Wav, language: "tr" });
console.log(t.text);
```

### Deploy a Hugging Face model on a rented GPU (BYOM)

```ts
const hf = await parel.gpu.validateHuggingFace("meta-llama/Llama-3.1-8B-Instruct");
// hf.recommended_gpu_tier === "rtx4090_24gb"

await parel.gpu.prefetch("meta-llama/Llama-3.1-8B-Instruct"); // optional, warm S3

const dep = await parel.gpu.create({
  huggingface_id: "meta-llama/Llama-3.1-8B-Instruct",
  gpu_tier: hf.recommended_gpu_tier ?? "rtx4090_24gb",
  idle_timeout_minutes: 15,
  budget_limit_usd: 5,
});

await parel.gpu.waitForRunning(dep.id, { onTick: (d) => console.log(d.status) });

const answer = await parel.gpu.chat(dep.id, {
  messages: [{ role: "user", content: "Write a haiku about Istanbul" }],
  max_tokens: 120,
});

await parel.gpu.stop(dep.id); // or parel.gpu.delete(dep.id)
```

Parel picks the cheapest available GPU across RunPod, Modal, and Vast.ai, handles TGI vs vLLM selection per architecture, enforces your budget cap, and refunds credits on crash loops. You watch `deployment.status` and call `chat`.

### Multi-model compare

```ts
const run = await parel.compare.run({
  models: ["qwen3.5-72b", "gpt-4o-mini", "claude-3-5-sonnet", "gemini-2.5-pro"],
  prompt: "Summarize in 3 bullets: why KVKK compliance matters for Turkish SaaS.",
  timeoutMs: 10 * 60_000,
});
console.log(run.results);
```

### Credits and budget

```ts
const snap = await parel.credits.get();
if (snap.remaining_usd < 1) console.log("top up: https://parel.cloud/billing");
```

### Cancel a running task

```ts
const cancel = await parel.tasks.cancel(taskId);
console.log(`refunded $${cancel.refund_amount_usd}`);
```

---

## Migrate from OpenAI in 30 seconds

```diff
- import OpenAI from "openai";
- const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
+ import { Parel } from "@parel-cloud/node";
+ const parel = new Parel({ apiKey: process.env.PAREL_API_KEY });
+ const openai = await parel.openai;
```

Every OpenAI call keeps working. You gain Qwen, Llama, DeepSeek, Claude, Gemini, Flux, Kling, Veo, Whisper, BYOM GPU, compare, credits, and tasks.

---

## Error handling

```ts
import {
  ParelError,
  ParelAuthenticationError,
  ParelBudgetExceededError,
  ParelRateLimitError,
  ParelConflictError,
  ParelNotFoundError,
  ParelTimeoutError,
  ParelValidationError,
} from "@parel-cloud/node";

try {
  await parel.images.generate({ model: "flux-schnell", prompt: "cat" });
} catch (err) {
  if (err instanceof ParelBudgetExceededError) {
    // 402, top up at parel.cloud/billing
  } else if (err instanceof ParelRateLimitError) {
    await sleep((err.retryAfter ?? 1) * 1000);
  } else if (err instanceof ParelConflictError && err.code === "task_not_cancellable") {
    // cannot cancel, task already completed
  } else if (err instanceof ParelError) {
    console.error(err.status, err.code, err.message, err.requestId);
  } else {
    throw err;
  }
}
```

Every error carries the OpenAI-compatible envelope: `code`, `type`, `message`, `requestId`, HTTP `status`. Attach `requestId` to support tickets for faster triage.

---

## Configuration

```ts
new Parel({
  apiKey: "pk-live-...",              // or PAREL_API_KEY env
  baseUrl: "https://api.parel.cloud", // override for staging or self-hosted
  timeoutMs: 60_000,                  // per-request timeout
  maxRetries: 2,                      // on 429, 5xx, network; idempotent verbs only
  fetch: globalThis.fetch,            // polyfill slot
  userAgent: "my-app/1.0",
});
```

**Retry policy.** `GET`, `HEAD`, `DELETE`, `PUT` retry up to `maxRetries` on `429`, `5xx`, `ParelConnectionError`, `ParelTimeoutError`. `POST` and `PATCH` never auto-retry, so generation calls are never double-charged. Backoff is exponential (500ms, 1s, 2s, 4s, 8s cap) with jitter.

**AbortController.** Every namespace helper accepts an `AbortSignal`. Cancel long polls cleanly:

```ts
const ac = new AbortController();
setTimeout(() => ac.abort(), 60_000);
await parel.images.generate({ model, prompt, signal: ac.signal });
```

---

## Supported models

| Family          | Examples                                                                                 |
|-----------------|------------------------------------------------------------------------------------------|
| LLM (open)      | Qwen3.5 7B/32B/72B, Llama 3.3 70B, DeepSeek V3 671B, DeepSeek R1, Gemma 4 27B, Mistral Large, Nemotron 70B, Phi-4 |
| LLM (closed)    | GPT-4o, GPT-4o-mini, GPT-o1, Claude 3.5 Sonnet, Claude 4 Opus, Gemini 2.5 Pro, Gemini 3.1, Grok 4 |
| Vision          | Qwen3.5-VL 32B, GPT-4o vision, Claude vision, Gemini vision                              |
| Image           | Flux Schnell / Dev / Pro, SDXL Turbo, Recraft V4, Gemini 3.1 Nano Image, DALL-E 3        |
| Video           | Wan 2.6, Kling 3, Veo 3.1, Seedance 1.5, Hailuo 2                                        |
| TTS             | ElevenLabs v2, Orpheus Turkish, Kokoro Turkish, Chatterbox                               |
| STT             | Whisper Large v3 Turbo, Whisper Large v3, Faster-Whisper                                 |
| Embeddings      | text-embedding-3-small / large, bge-large, qwen3-embed                                   |
| Reranking       | bge-reranker, jina-reranker                                                              |
| Moderation      | omni-moderation-latest                                                                   |

Live catalogue and pricing: [parel.cloud/models](https://parel.cloud/models).

---

## Pricing

Prepaid pay-as-you-go in USD. No subscription. No tiers.

* Sign-up bonus: **$1 free credit** on every new account.
* Top-up presets: **$5 / $20 / $50 / $100 / $500** via Lemon Squeezy.
* **Batch tier**: 50% discount for jobs that can wait up to 24 hours.
* BYOM billing is per-second, metered at your chosen GPU tier.

Full pricing: [parel.cloud/pricing](https://parel.cloud/pricing).

---

## FAQ

**Do I need to install `openai`?**
Only for `parel.openai.*`. Images, videos, audio, BYOM, compare, credits, and tasks namespaces work without it.

**Does it work in the browser?**
v0.1 is Node-first (18+). Use a server proxy for browsers today. Never ship API keys to clients. A browser entry point is planned for v0.2.

**Is streaming supported?**
Yes for chat and completions (via `parel.openai`). Generations use polling, not SSE, in v0.1.

**Is there a Python SDK?**
Yes, coming as `@parel-cloud/python` on PyPI. Track at [github.com/parel-cloud/parel-python](https://github.com/parel-cloud/parel-python).

**How do I self-host or point at staging?**
Pass `baseUrl` to the `Parel` constructor. Every path is `/v1/...`.

**Is it KVKK or GDPR compliant?**
Parel ships an opt-in KVKK mode: PII masking + Turkey-resident data. See [docs.parel.cloud/kvkk](https://docs.parel.cloud/kvkk).

**How do I report a bug?**
[github.com/parel-cloud/parel-js/issues](https://github.com/parel-cloud/parel-js/issues). Include your `requestId` from the error.

---

## Roadmap

* **v0.2** - Browser entry, `@parel-cloud/react` hooks, multipart STT, SSE streaming for generations
* **v0.3** - Webhooks, batch tier helpers, OpenAPI-codegen types
* **v1.0** - Stable surface, semver guarantees

Track releases: [github.com/parel-cloud/parel-js/releases](https://github.com/parel-cloud/parel-js/releases).

---

## Links

* Website: [parel.cloud](https://parel.cloud)
* Dashboard: [app.parel.cloud](https://app.parel.cloud)
* API reference: [docs.parel.cloud](https://docs.parel.cloud)
* npm: [npmjs.com/package/@parel-cloud/node](https://www.npmjs.com/package/@parel-cloud/node)
* GitHub: [github.com/parel-cloud/parel-js](https://github.com/parel-cloud/parel-js)

## License

[MIT](./LICENSE) © [Parel Cloud](https://parel.cloud) / Aleonis Teknoloji Ltd. Şti.
