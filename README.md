# Parel SDK for JavaScript/TypeScript

Official client for [Parel](https://parel.cloud) — 100+ AI models, GPU rental (BYOM), compare, and credits via a single OpenAI-compatible API.

> **v0.0.1 is a placeholder.** The real SDK (v0.1.0) ships soon. Watch this repo or follow [@parel_cloud](https://parel.cloud) for updates.

## Planned Surface

```ts
import { Parel } from "parel";

const parel = new Parel({ apiKey: process.env.PAREL_API_KEY });

// OpenAI pass-through (chat, embeddings, moderations, vision, tools)
const chat = await parel.openai.chat.completions.create({
  model: "qwen3.5-72b",
  messages: [{ role: "user", content: "Merhaba" }],
});

// Image generation (async task polled under the hood, sync return)
const image = await parel.images.generate({
  model: "flux-schnell",
  prompt: "a cat in istanbul",
});

// BYOM GPU deployment lifecycle
const gpu = await parel.gpu.create({
  huggingface_id: "meta-llama/Llama-3.1-8B-Instruct",
  gpu_tier: "rtx4090_24gb",
});
await parel.gpu.waitForRunning(gpu.id);

// Multi-model compare
const run = await parel.compare.run({
  models: ["qwen3.5-72b", "gpt-4o-mini"],
  prompt: "summarize this article: ...",
});

// Credits
const credits = await parel.credits();
console.log(credits.remaining_usd);

// Task escape hatch
await parel.tasks.cancel(taskId);
```

## Install

```bash
npm install parel openai
```

> `openai` is a peer dependency. The SDK wraps the official OpenAI client so
> you get streaming, tools, vision, and all its types for free.

## License

MIT
