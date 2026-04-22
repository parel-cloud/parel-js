# Parel SDK for JavaScript/TypeScript

Official client for [Parel](https://parel.cloud) — 100+ AI models, GPU rental (BYOM), compare, and credits via a single OpenAI-compatible API.

```bash
npm install parel openai
```

> `openai` is an optional peer dependency. The SDK reuses the official OpenAI
> client for LLM/embeddings/vision/moderations so you get streaming, tools,
> and the full OpenAI type surface for free. If you only use BYOM or image/
> video/audio generation, you can skip installing it.

## Quickstart

```ts
import { Parel } from "parel";

const parel = new Parel({ apiKey: process.env.PAREL_API_KEY });

// Budget
const credits = await parel.credits.get();
console.log(`$${credits.remaining_usd} remaining`);

// Model catalogue
const models = await parel.models.list();
```

## Chat / embeddings / vision via OpenAI pass-through

```ts
const openai = await parel.openai; // lazy-loaded peer dep, cached

const completion = await openai.chat.completions.create({
  model: "qwen3.5-72b",
  messages: [{ role: "user", content: "Merhaba, nasılsın?" }],
});
console.log(completion.choices[0].message.content);

// Streaming works too — all OpenAI SDK features pass through.
const stream = await openai.chat.completions.create({
  model: "qwen3.5-72b",
  messages: [{ role: "user", content: "ülkelerimizi say" }],
  stream: true,
});
for await (const chunk of stream) process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
```

## Image generation (async polling, sync return)

```ts
const image = await parel.images.generate({
  model: "flux-schnell",
  prompt: "A cat wearing a fez in Istanbul, watercolor",
  size: "1024x1024",
});
// `image.result.data[0].url` — S3-hosted URL

// Or: get the raw task handle without polling
const task = await parel.images.generate({ model: "flux-schnell", prompt: "...", async: true });
// Later:
const done = await parel.tasks.waitFor(task.task_id, { timeoutMs: 180_000 });
```

## Video generation

```ts
const video = await parel.videos.generate({
  model: "wan-2.6-t2v",
  prompt: "a robot watering plants",
  duration: 5,
  resolution: "1280x720",
  onTick: (task) => console.log(`progress ${task.progress}%`),
});
```

## Text-to-speech and transcription

```ts
// TTS
const speech = await parel.audio.speech({
  model: "elevenlabs-tts",
  input: "Parel'e hoş geldin",
  voice: "alloy",
});

// STT (sync)
const transcript = await parel.audio.transcribe({
  model: "whisper-large-v3-turbo",
  file: base64WavData, // or Blob/Uint8Array
  language: "tr",
});
console.log(transcript.text);
```

## BYOM — deploy your own model on rented GPU

```ts
// 1. Validate the HF repo and get a GPU tier recommendation
const validation = await parel.gpu.validateHuggingFace("meta-llama/Llama-3.1-8B-Instruct");
console.log(validation.recommended_gpu_tier); // e.g. "rtx4090_24gb"

// 2. (Optional) Warm S3 cache in the background for faster first boot
await parel.gpu.prefetch("meta-llama/Llama-3.1-8B-Instruct");

// 3. Create + wait for running
const deployment = await parel.gpu.create({
  huggingface_id: "meta-llama/Llama-3.1-8B-Instruct",
  gpu_tier: validation.recommended_gpu_tier ?? "rtx4090_24gb",
  idle_timeout_minutes: 15,
  budget_limit_usd: 5,
});
await parel.gpu.waitForRunning(deployment.id, {
  onTick: (d) => console.log(`[${d.status}] ${d.name}`),
});

// 4. Inference via deployment-scoped chat
const answer = await parel.gpu.chat(deployment.id, {
  messages: [{ role: "user", content: "Write a haiku about Istanbul" }],
});

// 5. Teardown
await parel.gpu.stop(deployment.id);
// or: await parel.gpu.delete(deployment.id);
```

## Model compare

```ts
const run = await parel.compare.run({
  models: ["qwen3.5-72b", "gpt-4o-mini", "claude-3-5-sonnet"],
  prompt: "Summarize this article in 3 bullets: ...",
  // wait: true (default) polls until terminal
  onTick: (r) => console.log(r.status),
});
console.log(run.results);

// Or submit & poll later
const submitted = await parel.compare.run({ models: [...], prompt: "...", wait: false });
const finished = await parel.compare.getRun(submitted.id);
```

## Task escape hatch

```ts
// Cancel a long-running image/video task and refund credits
const result = await parel.tasks.cancel(taskId);
console.log(`refunded $${result.refund_amount_usd}`);

// Explicit polling
const task = await parel.tasks.waitFor(taskId, { timeoutMs: 600_000, intervalMs: 3_000 });

// List recent tasks
const { tasks } = await parel.tasks.list({ task_type: "video", limit: 20 });
```

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
} from "parel";

try {
  await parel.images.generate({ model: "flux-schnell", prompt: "cat" });
} catch (err) {
  if (err instanceof ParelBudgetExceededError) {
    // Top up credits at https://parel.cloud/billing
  } else if (err instanceof ParelRateLimitError) {
    console.log(`retry after ${err.retryAfter}s`);
  } else if (err instanceof ParelError) {
    console.log(err.status, err.code, err.message, err.requestId);
  } else {
    throw err;
  }
}
```

All errors carry the OpenAI-compatible envelope — `code`, `type`, `message`,
`request_id`, plus the HTTP status — so you can log or triage without
peeking at the raw response.

## Configuration

```ts
new Parel({
  apiKey: "pk-live-...",          // or PAREL_API_KEY env
  baseUrl: "https://api.parel.cloud", // override for self-hosted
  timeoutMs: 60_000,              // per-request timeout
  maxRetries: 2,                  // idempotent verbs on 429/5xx/network
  fetch: globalThis.fetch,        // polyfill slot
  userAgent: "my-app/1.0",        // suffix on User-Agent header
});
```

## Requirements

- **Node.js 18+** (native `fetch` + `AbortController`)
- **openai** peer dep (optional, only needed for `parel.openai.*`)

## Links

- Website: https://parel.cloud
- Dashboard: https://app.parel.cloud
- API reference: https://docs.parel.cloud
- Issues: https://github.com/parel-cloud/parel-js/issues

## License

MIT
