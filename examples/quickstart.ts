/**
 * Smoke-test the SDK against a real Parel API key. Run:
 *   PAREL_API_KEY=pk-... npx tsx examples/quickstart.ts
 */

import { Parel } from "../src/index.js";

async function main() {
  const parel = new Parel({ apiKey: process.env.PAREL_API_KEY! });

  const credits = await parel.credits.get();
  console.log(`Credits: $${credits.remaining_usd.toFixed(2)} remaining`);

  const models = await parel.models.list();
  console.log(`${models.data.length} models available`);

  const openai = await parel.openai;
  const chat = await openai.chat.completions.create({
    model: "qwen3.5-72b",
    messages: [{ role: "user", content: "Say hi in one word." }],
  });
  console.log("chat:", chat.choices[0]?.message?.content);
}

void main();
