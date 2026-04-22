/**
 * `parel.tasks` — async generation task polling + cancellation.
 *
 * Wraps:
 *   GET  /v1/tasks/{id}
 *   GET  /v1/tasks
 *   POST /v1/tasks/{id}/cancel
 */

import type { HttpClient } from "../http.js";
import { pollUntilTerminal } from "../polling.js";
import type { Task, TaskCancelResult } from "../types.js";

export interface ListTasksQuery {
  task_type?: "image" | "video" | "tts" | "music" | "stt";
  status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
  limit?: number;
}

export interface ListTasksResponse {
  tasks: Task[];
  total: number;
}

export interface WaitForOptions {
  /** Total budget in ms. Default 300_000 (5 minutes). */
  timeoutMs?: number;
  /** Poll interval in ms. Default 2_000. */
  intervalMs?: number;
  /** External cancel. */
  signal?: AbortSignal;
  /** Invoked on each tick (progress UI). */
  onTick?: (task: Task) => void;
}

const TERMINAL = new Set<Task["status"]>(["completed", "failed", "cancelled"]);

export class TasksNamespace {
  constructor(private readonly http: HttpClient) {}

  /** Fetch a single task by id. */
  async get(taskId: string): Promise<Task> {
    return this.http.request<Task>({ method: "GET", path: `/v1/tasks/${encodeURIComponent(taskId)}` });
  }

  /** List recent tasks for the authenticated tenant. */
  async list(query: ListTasksQuery = {}): Promise<ListTasksResponse> {
    return this.http.request<ListTasksResponse>({
      method: "GET",
      path: "/v1/tasks",
      query: {
        task_type: query.task_type,
        status: query.status,
        limit: query.limit,
      },
    });
  }

  /**
   * Cancel a pending/processing task and refund credits.
   * - Pending/processing → 200, refund_amount_usd returned.
   * - Already terminal → ParelConflictError (409, code task_not_cancellable).
   * - Wrong tenant / unknown id → ParelNotFoundError (404).
   */
  async cancel(taskId: string): Promise<TaskCancelResult> {
    return this.http.request<TaskCancelResult>({
      method: "POST",
      path: `/v1/tasks/${encodeURIComponent(taskId)}/cancel`,
    });
  }

  /**
   * Poll a task until it reaches a terminal state (completed | failed | cancelled)
   * or the deadline expires (ParelTimeoutError).
   */
  async waitFor(taskId: string, opts: WaitForOptions = {}): Promise<Task> {
    const { timeoutMs = 300_000, intervalMs = 2_000, signal, onTick } = opts;
    const pollOpts = signal ? { timeoutMs, intervalMs, signal } : { timeoutMs, intervalMs };
    return pollUntilTerminal(
      async () => {
        const task = await this.get(taskId);
        onTick?.(task);
        return task;
      },
      (t) => TERMINAL.has(t.status),
      pollOpts,
    );
  }
}
