import { describe, expect, it } from "vitest";

import { ParelTimeoutError } from "../src/errors.js";
import { pollUntilTerminal } from "../src/polling.js";

describe("pollUntilTerminal", () => {
  it("returns the first terminal value", async () => {
    let ticks = 0;
    const value = await pollUntilTerminal(
      async () => {
        ticks++;
        return { status: ticks < 3 ? "processing" : "completed", n: ticks };
      },
      (v) => v.status === "completed",
      { timeoutMs: 1_000, intervalMs: 5 },
    );
    expect(value.status).toBe("completed");
    expect(value.n).toBe(3);
  });

  it("throws ParelTimeoutError when deadline expires", async () => {
    await expect(
      pollUntilTerminal(
        async () => ({ status: "processing" as const }),
        (v) => v.status === "completed",
        { timeoutMs: 30, intervalMs: 5 },
      ),
    ).rejects.toBeInstanceOf(ParelTimeoutError);
  });

  it("honors external AbortSignal", async () => {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 20);
    await expect(
      pollUntilTerminal(
        async () => ({ status: "processing" as const }),
        (v) => v.status === "completed",
        { timeoutMs: 5_000, intervalMs: 5, signal: ac.signal },
      ),
    ).rejects.toBeInstanceOf(ParelTimeoutError);
  });

  it("calls onTick each iteration", async () => {
    let ticks = 0;
    await pollUntilTerminal(
      async () => ({ status: "completed" as const }),
      (v) => v.status === "completed",
      { timeoutMs: 1000, intervalMs: 5, onTick: () => ticks++ },
    );
    expect(ticks).toBe(1);
  });
});
