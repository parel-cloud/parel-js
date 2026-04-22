/**
 * Public type definitions shared across namespaces. Mirrors the gateway's
 * Pydantic schemas (see gateway/app/schemas.py) without introducing a runtime
 * validator dep — the SDK trusts the server envelope.
 */

export type TaskStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export type TaskType = "image" | "video" | "tts" | "music" | "stt";

export interface Task {
  task_id: string;
  status: TaskStatus;
  task_type: TaskType | string;
  model: string;
  progress: number;
  created_at: string | null;
  started_at?: string;
  completed_at?: string;
  result?: Record<string, unknown> | null;
  error?: { message: string; type?: string; code?: string };
}

export interface TaskCancelResult {
  task_id: string;
  status: "cancelled";
  refunded_at: string;
  refund_amount_usd: number;
}

export interface BudgetSnapshot {
  tenant_id: string;
  limit_usd: number;
  spent_usd: number;
  remaining_usd: number;
  updated_at: string;
  version: number;
}

export interface ModelInfo {
  id: string;
  display_name?: string;
  model_type?: string;
  provider?: string;
  badges?: string[];
  capabilities?: string[];
  pricing?: Record<string, unknown>;
  status?: string;
  [extra: string]: unknown;
}

export interface ModelListResponse {
  object?: "list";
  data: ModelInfo[];
}

export type DeploymentStatus =
  | "queued"
  | "creating"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "sleeping"
  | "error";

export interface Deployment {
  id: string;
  name: string;
  huggingface_id: string;
  gpu_tier: string;
  provider?: string;
  status: DeploymentStatus | string;
  hourly_cost?: number;
  budget_limit_usd?: number;
  budget_spent_usd?: number;
  idle_timeout_minutes?: number;
  parel_model_id?: string;
  created_at?: string;
  started_at?: string;
  last_request_at?: string;
  error_code?: string;
  error_message?: string;
  [extra: string]: unknown;
}

export interface GpuTier {
  id: string;
  gpu_name: string;
  vram_gb: number;
  price_per_hour_usd: number;
  provider?: string;
  available?: boolean;
  [extra: string]: unknown;
}

export interface CompareRun {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | string;
  prompt?: string;
  models: string[];
  created_at?: string;
  completed_at?: string;
  results?: Record<string, unknown>;
  [extra: string]: unknown;
}
