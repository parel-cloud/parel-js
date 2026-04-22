/**
 * Parel SDK for JavaScript/TypeScript — public entry.
 *
 * Quick start:
 *
 *   import { Parel } from "parel";
 *   const parel = new Parel({ apiKey: process.env.PAREL_API_KEY });
 *   const credits = await parel.credits();
 *
 * Full reference: https://github.com/parel-cloud/parel-js
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
