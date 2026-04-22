/**
 * `parel.models` — list + retrieve available models.
 *
 * Wraps:
 *   GET /v1/models
 *   GET /v1/models/{id}
 */

import type { HttpClient } from "../http.js";
import type { ModelInfo, ModelListResponse } from "../types.js";

export class ModelsNamespace {
  constructor(private readonly http: HttpClient) {}

  /** Full catalogue available to the current tenant. */
  async list(): Promise<ModelListResponse> {
    return this.http.request<ModelListResponse>({ method: "GET", path: "/v1/models" });
  }

  /** Detail for a single model. */
  async retrieve(modelId: string): Promise<ModelInfo> {
    return this.http.request<ModelInfo>({
      method: "GET",
      path: `/v1/models/${encodeURIComponent(modelId)}`,
    });
  }
}
