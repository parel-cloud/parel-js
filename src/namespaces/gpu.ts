/**
 * `parel.gpu` — BYOM (bring-your-own-model) GPU deployment lifecycle.
 *
 * Wraps the `/v1/deployments/*` + `/v1/gpu-tiers*` + `/v1/hf/*` route surface.
 * Full CRUD + lifecycle actions + chat inference + `waitForRunning` helper.
 */

import type { HttpClient } from "../http.js";
import { pollUntilTerminal } from "../polling.js";
import type { Deployment, DeploymentStatus, GpuTier } from "../types.js";

export interface CreateDeploymentParams {
  huggingface_id: string;
  name?: string;
  gpu_tier: string;
  idle_timeout_minutes?: number;
  budget_limit_usd?: number;
  env?: Record<string, string>;
  [extra: string]: unknown;
}

export interface WaitForRunningOptions {
  /** Total budget in ms. Default 900_000 (15 min). */
  timeoutMs?: number;
  /** Poll interval in ms. Default 10_000 (10s). */
  intervalMs?: number;
  signal?: AbortSignal;
  onTick?: (deployment: Deployment) => void;
}

const RUNNING_TERMINAL = new Set<string>(["running", "error", "stopped", "crashed"]);

export interface HfValidateResponse {
  valid: boolean;
  model_id: string;
  architecture?: string;
  tgi_compatible?: boolean;
  vllm_compatible?: boolean;
  vram_fp16_gb?: number;
  vram_int4_gb?: number;
  recommended_gpu_tier?: string;
  needs_new_vllm?: boolean;
  provider_compat_hint?: string;
  [extra: string]: unknown;
}

export interface PrefetchStatus {
  status: "downloading" | "complete" | "cancelled" | "failed" | "not_found" | string;
  progress?: number;
  size_bytes?: number;
  [extra: string]: unknown;
}

export class GpuNamespace {
  constructor(private readonly http: HttpClient) {}

  // ---------------------- lifecycle ----------------------

  async list(): Promise<Deployment[]> {
    const res = await this.http.request<{ deployments: Deployment[] } | Deployment[]>({
      method: "GET",
      path: "/v1/deployments",
    });
    return Array.isArray(res) ? res : res.deployments;
  }

  async create(params: CreateDeploymentParams): Promise<Deployment> {
    return this.http.request<Deployment>({
      method: "POST",
      path: "/v1/deployments",
      body: params,
    });
  }

  async get(deploymentId: string): Promise<Deployment> {
    return this.http.request<Deployment>({
      method: "GET",
      path: `/v1/deployments/${encodeURIComponent(deploymentId)}`,
    });
  }

  async start(deploymentId: string): Promise<Deployment> {
    return this.http.request<Deployment>({
      method: "POST",
      path: `/v1/deployments/${encodeURIComponent(deploymentId)}/start`,
    });
  }

  async stop(deploymentId: string): Promise<Deployment> {
    return this.http.request<Deployment>({
      method: "POST",
      path: `/v1/deployments/${encodeURIComponent(deploymentId)}/stop`,
    });
  }

  async delete(deploymentId: string): Promise<{ ok: boolean } & Record<string, unknown>> {
    return this.http.request({
      method: "DELETE",
      path: `/v1/deployments/${encodeURIComponent(deploymentId)}`,
    });
  }

  // ---------------------- telemetry ----------------------

  async events(deploymentId: string): Promise<{ events: Array<Record<string, unknown>> }> {
    return this.http.request({
      method: "GET",
      path: `/v1/deployments/${encodeURIComponent(deploymentId)}/events`,
    });
  }

  async metrics(deploymentId: string): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "GET",
      path: `/v1/deployments/${encodeURIComponent(deploymentId)}/metrics`,
    });
  }

  async billing(deploymentId: string): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "GET",
      path: `/v1/deployments/${encodeURIComponent(deploymentId)}/billing`,
    });
  }

  // ---------------------- inference ----------------------

  /**
   * Send a chat.completions-style request to a BYOM deployment's inference
   * endpoint. Use `parel.openai` for general chat against platform models —
   * this route is deployment-scoped.
   */
  async chat(
    deploymentId: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "POST",
      path: `/v1/deployments/${encodeURIComponent(deploymentId)}/chat/completions`,
      body,
    });
  }

  // ---------------------- tiers / preview ----------------------

  async tiers(): Promise<GpuTier[]> {
    const res = await this.http.request<{ tiers: GpuTier[] } | GpuTier[]>({
      method: "GET",
      path: "/v1/gpu-tiers",
    });
    return Array.isArray(res) ? res : res.tiers;
  }

  async tiersLive(): Promise<GpuTier[]> {
    const res = await this.http.request<{ tiers: GpuTier[] } | GpuTier[]>({
      method: "GET",
      path: "/v1/gpu-tiers/live",
    });
    return Array.isArray(res) ? res : res.tiers;
  }

  async preview(params: {
    huggingface_id: string;
    gpu_tier?: string;
  }): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "GET",
      path: "/v1/deployments/preview",
      query: params,
    });
  }

  // ---------------------- HF validate + prefetch ----------------------

  async validateHuggingFace(huggingfaceId: string): Promise<HfValidateResponse> {
    return this.http.request<HfValidateResponse>({
      method: "POST",
      path: "/v1/hf/validate",
      body: { huggingface_id: huggingfaceId },
    });
  }

  async prefetch(huggingfaceId: string): Promise<{ status: string } & Record<string, unknown>> {
    return this.http.request({
      method: "POST",
      path: "/v1/deployments/prefetch",
      body: { huggingface_id: huggingfaceId },
    });
  }

  async prefetchStatus(huggingfaceId: string): Promise<PrefetchStatus> {
    return this.http.request<PrefetchStatus>({
      method: "GET",
      path: `/v1/deployments/prefetch/${encodeURIComponent(huggingfaceId)}`,
    });
  }

  async cancelPrefetch(huggingfaceId: string): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "POST",
      path: `/v1/deployments/prefetch/${encodeURIComponent(huggingfaceId)}/cancel`,
    });
  }

  // ---------------------- polling helper ----------------------

  /**
   * Poll a deployment until it reaches a terminal/steady state (running / error
   * / stopped / crashed) or the deadline expires.
   */
  async waitForRunning(deploymentId: string, opts: WaitForRunningOptions = {}): Promise<Deployment> {
    const { timeoutMs = 900_000, intervalMs = 10_000, signal, onTick } = opts;
    const pollOpts = signal ? { timeoutMs, intervalMs, signal } : { timeoutMs, intervalMs };
    return pollUntilTerminal(
      async () => {
        const dep = await this.get(deploymentId);
        onTick?.(dep);
        return dep;
      },
      (d) => RUNNING_TERMINAL.has(String(d.status)),
      pollOpts,
    );
  }
}

export type { DeploymentStatus };
