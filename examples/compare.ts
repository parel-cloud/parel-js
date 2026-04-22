/**
 * Multi-model compare run. Run: PAREL_API_KEY=... npx tsx examples/compare.ts
 */

import { Parel } from "../src/index.js";

async function main() {
  const parel = new Parel({ apiKey: process.env.PAREL_API_KEY! });

  const run = await parel.compare.run({
    models: ["qwen3.5-72b", "gpt-4o-mini", "claude-3-5-sonnet"],
    prompt: "Summarize in 3 bullets: why KVKK compliance matters for Turkish SaaS companies.",
    intervalMs: 3_000,
    timeoutMs: 5 * 60_000,
  });

  console.log("status:", run.status);
  console.log("results:", JSON.stringify(run.results, null, 2));
}

void main();
