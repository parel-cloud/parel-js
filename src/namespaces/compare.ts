/**
 * `parel.compare` — multi-model head-to-head runs + conversations.
 *
 * Wraps `/v1/compare/*` (14 endpoints). `run()` submits a quick run and polls
 * for results; lower-level methods expose the full API surface.
 */

import type { HttpClient } from "../http.js";
import { pollUntilTerminal } from "../polling.js";
import type { CompareRun } from "../types.js";

export interface QuickRunParams {
  models: string[];
  prompt?: string;
  dataset_id?: string;
  conversation_id?: string;
  name?: string;
  [extra: string]: unknown;
}

export interface RunOptions extends QuickRunParams {
  /** Wait for results (poll until terminal). Default true. */
  wait?: boolean;
  /** Timeout for wait loop, ms. Default 600_000 (10 min). */
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
}

const COMPARE_TERMINAL = new Set<string>(["completed", "failed", "cancelled"]);

export class CompareNamespace {
  constructor(private readonly http: HttpClient) {}

  // ---------------------- runs ----------------------

  /**
   * Submit a compare run. When `wait !== false` (default), poll until the run
   * reaches a terminal state and return the finished CompareRun.
   */
  async run(opts: RunOptions): Promise<CompareRun> {
    const { wait = true, timeoutMs = 600_000, intervalMs = 3_000, signal, ...body } = opts;
    const submitted = await this.http.request<CompareRun>({
      method: "POST",
      path: "/v1/compare/runs",
      body,
    });
    if (!wait) return submitted;
    const pollOpts = signal ? { timeoutMs, intervalMs, signal } : { timeoutMs, intervalMs };
    return pollUntilTerminal(
      () => this.getRun(submitted.id),
      (r) => COMPARE_TERMINAL.has(String(r.status)),
      pollOpts,
    );
  }

  async listRuns(query: { limit?: number; status?: string } = {}): Promise<CompareRun[]> {
    const res = await this.http.request<{ runs: CompareRun[] } | CompareRun[]>({
      method: "GET",
      path: "/v1/compare/runs",
      query,
    });
    return Array.isArray(res) ? res : res.runs;
  }

  async getRun(runId: string): Promise<CompareRun> {
    return this.http.request<CompareRun>({
      method: "GET",
      path: `/v1/compare/runs/${encodeURIComponent(runId)}`,
    });
  }

  async cancelRun(runId: string): Promise<CompareRun> {
    return this.http.request<CompareRun>({
      method: "POST",
      path: `/v1/compare/runs/${encodeURIComponent(runId)}/cancel`,
    });
  }

  async saveRun(runId: string): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "POST",
      path: `/v1/compare/runs/${encodeURIComponent(runId)}/save`,
    });
  }

  async markWinner(runId: string, laneId: string): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "POST",
      path: `/v1/compare/runs/${encodeURIComponent(runId)}/lanes/${encodeURIComponent(laneId)}/winner`,
    });
  }

  // ---------------------- datasets ----------------------

  async createDataset(params: {
    name: string;
    test_cases: Array<Record<string, unknown>>;
    [extra: string]: unknown;
  }): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "POST",
      path: "/v1/compare/datasets",
      body: params,
    });
  }

  async listDatasets(): Promise<Array<Record<string, unknown>>> {
    const res = await this.http.request<
      { datasets: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
    >({ method: "GET", path: "/v1/compare/datasets" });
    return Array.isArray(res) ? res : res.datasets;
  }

  async getDataset(datasetId: string): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "GET",
      path: `/v1/compare/datasets/${encodeURIComponent(datasetId)}`,
    });
  }

  // ---------------------- conversations ----------------------

  async createConversation(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "POST",
      path: "/v1/compare/conversations",
      body: params,
    });
  }

  async listConversations(): Promise<Array<Record<string, unknown>>> {
    const res = await this.http.request<
      { conversations: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
    >({ method: "GET", path: "/v1/compare/conversations" });
    return Array.isArray(res) ? res : res.conversations;
  }

  async getConversation(conversationId: string): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "GET",
      path: `/v1/compare/conversations/${encodeURIComponent(conversationId)}`,
    });
  }

  async addTurn(
    conversationId: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "POST",
      path: `/v1/compare/conversations/${encodeURIComponent(conversationId)}/turns`,
      body,
    });
  }

  async updateConversation(
    conversationId: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "PATCH",
      path: `/v1/compare/conversations/${encodeURIComponent(conversationId)}`,
      body,
    });
  }

  async deleteConversation(conversationId: string): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "DELETE",
      path: `/v1/compare/conversations/${encodeURIComponent(conversationId)}`,
    });
  }
}
