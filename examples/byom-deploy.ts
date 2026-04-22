/**
 * End-to-end BYOM (bring-your-own-model) deploy + inference + teardown.
 * Run: PAREL_API_KEY=... npx tsx examples/byom-deploy.ts
 *
 * WARNING: real GPU rental. A running deployment costs $0.24–$0.74/hr.
 *          This script tears down at the end; SIGINT keyboard abort will
 *          leak the pod. Run `parel.gpu.delete(id)` manually if needed.
 */

import { Parel } from "../src/index.js";

async function main() {
  const parel = new Parel({ apiKey: process.env.PAREL_API_KEY! });

  const model = "meta-llama/Llama-3.1-8B-Instruct";
  const validation = await parel.gpu.validateHuggingFace(model);
  console.log("tier:", validation.recommended_gpu_tier);

  const deployment = await parel.gpu.create({
    huggingface_id: model,
    gpu_tier: validation.recommended_gpu_tier ?? "rtx4090_24gb",
    idle_timeout_minutes: 15,
    budget_limit_usd: 2,
  });
  console.log("deployment id:", deployment.id);

  try {
    await parel.gpu.waitForRunning(deployment.id, {
      onTick: (d) => console.log(`[${d.status}]`),
    });

    const chat = (await parel.gpu.chat(deployment.id, {
      messages: [{ role: "user", content: "Write a two-line haiku about Istanbul." }],
      max_tokens: 80,
    })) as { choices: Array<{ message: { content: string } }> };
    console.log(chat.choices[0]?.message?.content);
  } finally {
    console.log("stopping...");
    await parel.gpu.stop(deployment.id);
  }
}

void main();
