/**
 * Parel SDK for JavaScript/TypeScript — public entry.
 *
 * Quick start:
 *
 *   import { Parel } from "parel";
 *   const parel = new Parel({ apiKey: process.env.PAREL_API_KEY });
 *   const credits = await parel.credits();
 *
 * Full reference: https://github.com/parel-cloud/parel-node
 */

export { Parel } from "./client.js";
export type { ParelOptions } from "./client.js";

export {
  ParelError,
  ParelAPIError,
  ParelConfigError,
  ParelConnectionError,
  ParelTimeoutError,
  ParelAuthenticationError,
  ParelPermissionError,
  ParelNotFoundError,
  ParelConflictError,
  ParelValidationError,
  ParelRateLimitError,
  ParelBudgetExceededError,
  ParelServerError,
} from "./errors.js";

export type { ParelErrorOptions } from "./errors.js";

export { pollUntilTerminal } from "./polling.js";
export type { PollOptions } from "./polling.js";

export { TasksNamespace } from "./namespaces/tasks.js";
export type { ListTasksQuery, ListTasksResponse, WaitForOptions } from "./namespaces/tasks.js";
export { CreditsNamespace } from "./namespaces/credits.js";
export { ModelsNamespace } from "./namespaces/models.js";
export { GpuNamespace } from "./namespaces/gpu.js";
export type {
  CreateDeploymentParams,
  WaitForRunningOptions,
  HfValidateResponse,
  PrefetchStatus,
} from "./namespaces/gpu.js";
export { CompareNamespace } from "./namespaces/compare.js";
export type { QuickRunParams, RunOptions } from "./namespaces/compare.js";
export { AudioNamespace, ImagesNamespace, VideosNamespace } from "./namespaces/generations.js";
export type {
  ImageGenerationParams,
  ImageEditParams,
  VideoGenerationParams,
  SpeechParams,
  TranscriptionParams,
  MusicParams,
  GenerationWaitOptions,
  AsyncOption,
  TaskSubmission,
} from "./namespaces/generations.js";
export type { OpenAIClient } from "./namespaces/openai.js";

export type {
  Task,
  TaskStatus,
  TaskType,
  TaskCancelResult,
  BudgetSnapshot,
  ModelInfo,
  ModelListResponse,
  Deployment,
  DeploymentStatus,
  GpuTier,
  CompareRun,
} from "./types.js";
