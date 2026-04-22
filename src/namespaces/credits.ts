/**
 * `parel.credits` — budget snapshot (remaining / limit / spent).
 *
 * Wraps:
 *   GET /v1/usage/budget
 */

import type { HttpClient } from "../http.js";
import type { BudgetSnapshot } from "../types.js";

export class CreditsNamespace {
  constructor(private readonly http: HttpClient) {}

  /** Current budget snapshot: limit, spent, remaining (USD). */
  async get(): Promise<BudgetSnapshot> {
    return this.http.request<BudgetSnapshot>({ method: "GET", path: "/v1/usage/budget" });
  }
}
