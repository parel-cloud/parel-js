/**
 * Budget snapshot + cheapest smoke. Run: PAREL_API_KEY=... npx tsx examples/credits.ts
 */

import { Parel, ParelBudgetExceededError } from "../src/index.js";

async function main() {
  const parel = new Parel({ apiKey: process.env.PAREL_API_KEY! });

  const before = await parel.credits.get();
  console.log(`Before: $${before.spent_usd.toFixed(4)} spent / $${before.limit_usd} limit`);

  try {
    const openai = await parel.openai;
    const embed = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "merhaba",
    });
    console.log(`Embedded ${embed.data.length} inputs.`);
  } catch (err) {
    if (err instanceof ParelBudgetExceededError) {
      console.log("Top up credits at https://parel.cloud/billing");
      return;
    }
    throw err;
  }

  const after = await parel.credits.get();
  console.log(`After:  $${after.spent_usd.toFixed(4)} spent`);
  console.log(`Delta:  $${(after.spent_usd - before.spent_usd).toFixed(6)}`);
}

void main();
