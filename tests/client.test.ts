import { describe, expect, it } from "vitest";

import { Parel, ParelConfigError } from "../src/index.js";

describe("Parel client", () => {
  it("throws ParelConfigError when no apiKey and no PAREL_API_KEY", () => {
    const prev = process.env["PAREL_API_KEY"];
    delete process.env["PAREL_API_KEY"];
    expect(() => new Parel()).toThrow(ParelConfigError);
    if (prev !== undefined) process.env["PAREL_API_KEY"] = prev;
  });

  it("picks up PAREL_API_KEY from env", () => {
    const prev = process.env["PAREL_API_KEY"];
    process.env["PAREL_API_KEY"] = "pk-test-env";
    const p = new Parel();
    expect(p.baseUrl).toBe("https://api.parel.cloud");
    if (prev !== undefined) {
      process.env["PAREL_API_KEY"] = prev;
    } else {
      delete process.env["PAREL_API_KEY"];
    }
  });

  it("strips trailing slashes from baseUrl", () => {
    const p = new Parel({ apiKey: "pk-test", baseUrl: "https://gw.example.com///" });
    expect(p.baseUrl).toBe("https://gw.example.com");
  });

  it("accepts custom fetch (used by http client)", () => {
    const customFetch = (() => new Response("{}")) as unknown as typeof fetch;
    const p = new Parel({ apiKey: "pk-test", fetch: customFetch });
    expect(p.http).toBeDefined();
  });
});
