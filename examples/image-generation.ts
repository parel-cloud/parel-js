/**
 * Image generation with async-task auto-polling.
 * Run: PAREL_API_KEY=... npx tsx examples/image-generation.ts
 */

import { Parel } from "../src/index.js";

async function main() {
  const parel = new Parel({ apiKey: process.env.PAREL_API_KEY! });

  const result = (await parel.images.generate({
    model: "flux-schnell",
    prompt: "A minimalist watercolor of Istanbul at dawn, Bosphorus in fog",
    size: "1024x1024",
    onTick: (task) => console.log(`[${task.progress}%] ${task.status}`),
  })) as { status: string; result: { data: Array<{ url: string }> } };

  console.log("Done:", result.result.data[0]?.url);
}

void main();
