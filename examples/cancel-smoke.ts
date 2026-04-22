/**
 * Smoke-test POST /v1/tasks/{id}/cancel (Prep 1).
 * Run: PAREL_API_KEY=pk-... npx tsx examples/cancel-smoke.ts
 */

import {
  Parel,
  ParelError,
  ParelNotFoundError,
  ParelValidationError,
} from "../src/index.js";

async function main() {
  const parel = new Parel({ apiKey: process.env.PAREL_API_KEY! });

  // Non-existent UUID → 404 ParelNotFoundError
  try {
    await parel.tasks.cancel("00000000-0000-0000-0000-000000000000");
    console.log("[FAIL] non-existent should have thrown");
  } catch (err) {
    if (err instanceof ParelNotFoundError) {
      console.log(`[OK] non-existent → 404 ${err.code}: ${err.message}`);
    } else if (err instanceof ParelError) {
      console.log(`[UNEXPECTED] ${err.constructor.name} (status=${err.status}): ${err.message}`);
    } else {
      throw err;
    }
  }

  // Invalid UUID format → 400 ParelValidationError
  try {
    await parel.tasks.cancel("not-a-uuid");
    console.log("[FAIL] invalid uuid should have thrown");
  } catch (err) {
    if (err instanceof ParelValidationError) {
      console.log(`[OK] invalid uuid → 400 ${err.code}: ${err.message}`);
    } else if (err instanceof ParelError) {
      console.log(`[UNEXPECTED] ${err.constructor.name} (status=${err.status}): ${err.message}`);
    } else {
      throw err;
    }
  }
}

void main();
