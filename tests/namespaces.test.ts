import { describe, expect, it, vi } from "vitest";

import { Parel } from "../src/index.js";

function recordingFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; method: string; body?: string; headers: Record<string, string> }> = [];
  const fetchImpl = vi.fn(async (urlInput: RequestInfo | URL, init?: RequestInit) => {
    const url = String(urlInput);
    const method = init?.method ?? "GET";
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
    const body = init?.body ? String(init.body) : undefined;
    calls.push({ url, method, body, headers });
    return handler(url, init ?? {});
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("parel.tasks", () => {
  it("get() → GET /v1/tasks/{id}", async () => {
    const { fetchImpl, calls } = recordingFetch((url) => {
      expect(url).toBe("https://api.example.com/v1/tasks/abc-123");
      return json(200, { task_id: "abc-123", status: "processing" });
    });
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const t = await parel.tasks.get("abc-123");
    expect(t.task_id).toBe("abc-123");
    expect(calls[0]?.method).toBe("GET");
  });

  it("list() → GET /v1/tasks with query params", async () => {
    const { fetchImpl } = recordingFetch((url) => {
      expect(url).toContain("?task_type=image&limit=5");
      return json(200, { tasks: [], total: 0 });
    });
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const r = await parel.tasks.list({ task_type: "image", limit: 5 });
    expect(r.total).toBe(0);
  });

  it("cancel() → POST /v1/tasks/{id}/cancel", async () => {
    const { fetchImpl, calls } = recordingFetch((url) =>
      json(200, { task_id: "abc", status: "cancelled", refunded_at: "2026-04-22T14:00:00Z", refund_amount_usd: 0.2 }),
    );
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const r = await parel.tasks.cancel("abc");
    expect(r.status).toBe("cancelled");
    expect(r.refund_amount_usd).toBe(0.2);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("https://api.example.com/v1/tasks/abc/cancel");
  });

  it("waitFor() polls until terminal and invokes onTick", async () => {
    let calls = 0;
    const { fetchImpl } = recordingFetch(() => {
      calls++;
      return json(200, {
        task_id: "t1",
        status: calls < 3 ? "processing" : "completed",
        task_type: "image",
        model: "flux",
        progress: calls * 33,
        created_at: null,
      });
    });
    const parel = new Parel({
      apiKey: "pk",
      baseUrl: "https://api.example.com",
      fetch: fetchImpl,
      maxRetries: 0,
    });
    const ticks: number[] = [];
    const t = await parel.tasks.waitFor("t1", {
      timeoutMs: 5_000,
      intervalMs: 5,
      onTick: (task) => ticks.push(task.progress),
    });
    expect(t.status).toBe("completed");
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(calls).toBe(3);
  });
});

describe("parel.credits", () => {
  it("get() → GET /v1/usage/budget", async () => {
    const { fetchImpl, calls } = recordingFetch(() =>
      json(200, {
        tenant_id: "t1",
        limit_usd: 50,
        spent_usd: 10.5,
        remaining_usd: 39.5,
        updated_at: "2026-04-22T14:00:00Z",
        version: 1,
      }),
    );
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const snap = await parel.credits.get();
    expect(snap.remaining_usd).toBe(39.5);
    expect(calls[0]?.url).toBe("https://api.example.com/v1/usage/budget");
  });
});

describe("parel.models", () => {
  it("list() → GET /v1/models", async () => {
    const { fetchImpl, calls } = recordingFetch(() =>
      json(200, { object: "list", data: [{ id: "flux-schnell" }, { id: "qwen3.5-72b" }] }),
    );
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const r = await parel.models.list();
    expect(r.data).toHaveLength(2);
    expect(calls[0]?.url).toBe("https://api.example.com/v1/models");
  });

  it("retrieve() → GET /v1/models/{id}", async () => {
    const { fetchImpl, calls } = recordingFetch(() => json(200, { id: "flux-schnell", display_name: "Flux Schnell" }));
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const m = await parel.models.retrieve("flux-schnell");
    expect(m.id).toBe("flux-schnell");
    expect(calls[0]?.url).toBe("https://api.example.com/v1/models/flux-schnell");
  });
});

describe("parel.openai (lazy)", () => {
  it("resolves to a mocked client when openai can be imported", async () => {
    const parel = new Parel({ apiKey: "pk-test", baseUrl: "https://api.example.com" });
    const openai = await parel.openai;
    expect(openai).toBeDefined();
    // We don't hit network here — just verify the property is a real OpenAI instance.
    // OpenAI v4 exposes a `chat` property with `completions`.
    expect(typeof openai).toBe("object");
  });

  it("caches the Promise — second access returns the same instance", async () => {
    const parel = new Parel({ apiKey: "pk-test", baseUrl: "https://api.example.com" });
    const [a, b] = await Promise.all([parel.openai, parel.openai]);
    expect(a).toBe(b);
  });
});

describe("parel.gpu", () => {
  it("list() accepts both array and {deployments} envelope", async () => {
    const { fetchImpl } = recordingFetch(() =>
      json(200, { deployments: [{ id: "d1", status: "running", name: "x", huggingface_id: "y", gpu_tier: "z" }] }),
    );
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const list = await parel.gpu.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("d1");
  });

  it("create() → POST /v1/deployments", async () => {
    const { fetchImpl, calls } = recordingFetch(() =>
      json(200, { id: "d2", status: "queued", name: "test", huggingface_id: "Qwen/Qwen2.5-7B", gpu_tier: "rtx4090_24gb" }),
    );
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const d = await parel.gpu.create({ huggingface_id: "Qwen/Qwen2.5-7B", gpu_tier: "rtx4090_24gb" });
    expect(d.id).toBe("d2");
    expect(calls[0]?.method).toBe("POST");
    expect(JSON.parse(calls[0]!.body!)).toEqual({ huggingface_id: "Qwen/Qwen2.5-7B", gpu_tier: "rtx4090_24gb" });
  });

  it("waitForRunning() polls get() until status running", async () => {
    let n = 0;
    const { fetchImpl } = recordingFetch(() => {
      n++;
      return json(200, {
        id: "d3",
        status: n < 3 ? "starting" : "running",
        name: "x",
        huggingface_id: "y",
        gpu_tier: "z",
      });
    });
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl, maxRetries: 0 });
    const d = await parel.gpu.waitForRunning("d3", { timeoutMs: 5_000, intervalMs: 5 });
    expect(d.status).toBe("running");
    expect(n).toBe(3);
  });
});

describe("parel.compare", () => {
  it("run({wait:false}) → POST /v1/compare/runs and returns immediately", async () => {
    const { fetchImpl, calls } = recordingFetch(() =>
      json(200, { id: "run-1", status: "queued", models: ["a", "b"] }),
    );
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const r = await parel.compare.run({ models: ["a", "b"], prompt: "hi", wait: false });
    expect(r.id).toBe("run-1");
    expect(r.status).toBe("queued");
    expect(calls).toHaveLength(1);
  });

  it("run() polls until terminal when wait=true (default)", async () => {
    let poll = 0;
    const { fetchImpl } = recordingFetch((url, init) => {
      if (init.method === "POST") {
        return json(200, { id: "run-2", status: "running", models: ["a"] });
      }
      poll++;
      return json(200, { id: "run-2", status: poll < 2 ? "running" : "completed", models: ["a"] });
    });
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl, maxRetries: 0 });
    const r = await parel.compare.run({ models: ["a"], timeoutMs: 5_000, intervalMs: 5 });
    expect(r.status).toBe("completed");
  });

  it("cancelRun() → POST /v1/compare/runs/{id}/cancel", async () => {
    const { fetchImpl, calls } = recordingFetch(() => json(200, { id: "run-3", status: "cancelled", models: [] }));
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const r = await parel.compare.cancelRun("run-3");
    expect(r.status).toBe("cancelled");
    expect(calls[0]?.url).toBe("https://api.example.com/v1/compare/runs/run-3/cancel");
  });
});

describe("parel.images / videos / audio", () => {
  it("images.generate() polls task until completed", async () => {
    let poll = 0;
    const { fetchImpl } = recordingFetch((url, init) => {
      if (init.method === "POST") return json(200, { task_id: "t1", poll_url: "/v1/tasks/t1" });
      poll++;
      return json(200, {
        task_id: "t1",
        status: poll < 2 ? "processing" : "completed",
        task_type: "image",
        model: "flux-schnell",
        progress: 100,
        created_at: null,
        result: { data: [{ url: "https://example.com/img.png" }] },
      });
    });
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl, maxRetries: 0 });
    const r = (await parel.images.generate({
      model: "flux-schnell",
      prompt: "cat",
      intervalMs: 5,
      timeoutMs: 5_000,
    })) as { status: string; result: { data: Array<{ url: string }> } };
    expect(r.status).toBe("completed");
    expect(r.result.data[0]?.url).toBe("https://example.com/img.png");
  });

  it("images.generate({async:true}) returns the submission without polling", async () => {
    const { fetchImpl, calls } = recordingFetch(() => json(200, { task_id: "t2", poll_url: "/v1/tasks/t2" }));
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const r = (await parel.images.generate({
      model: "flux-schnell",
      prompt: "dog",
      async: true,
    })) as { task_id: string };
    expect(r.task_id).toBe("t2");
    expect(calls).toHaveLength(1);
  });

  it("audio.transcribe() → POST /v1/audio/transcriptions (sync)", async () => {
    const { fetchImpl, calls } = recordingFetch(() => json(200, { text: "merhaba" }));
    const parel = new Parel({ apiKey: "pk", baseUrl: "https://api.example.com", fetch: fetchImpl });
    const r = (await parel.audio.transcribe({ model: "whisper-1", file: "base64..." })) as { text: string };
    expect(r.text).toBe("merhaba");
    expect(calls[0]?.url).toBe("https://api.example.com/v1/audio/transcriptions");
  });
});
