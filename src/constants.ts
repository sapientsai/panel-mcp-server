/**
 * Panel MCP Server Configuration Constants
 *
 * All configuration is self-documenting with sensible defaults.
 * Override via environment variables as noted.
 */

import { List, Option } from "functype"

import { FALLBACK_FREE_MODELS, getFreeModels } from "./providers/openrouter-models.js"

/**
 * Default panel of models for council queries.
 * Balanced selection of capability, cost, and provider diversity.
 *
 * Override: PANEL_DEFAULT_MODELS (comma-separated list)
 * Use "free" as a special value to dynamically fetch free OpenRouter models.
 */
export const DEFAULT_PANEL_MODELS = List.of(
  "openai/gpt-4o",
  "anthropic/claude-sonnet-4-20250514",
  "google/gemini-2.5-pro",
)

/**
 * Maximum concurrent requests per provider.
 * Prevents rate limiting while allowing parallel execution.
 *
 * Override: PANEL_MAX_CONCURRENT
 */
export const DEFAULT_MAX_CONCURRENT = 5

/**
 * Request timeout in milliseconds.
 * Long enough for complex queries, short enough to fail fast.
 *
 * Override: PANEL_REQUEST_TIMEOUT_MS
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 60_000

/**
 * Maximum debate rounds allowed.
 * Prevents runaway costs while allowing substantive debates.
 */
export const MAX_DEBATE_ROUNDS = 5

/**
 * Default debate rounds if not specified.
 */
export const DEFAULT_DEBATE_ROUNDS = 2

/**
 * Server metadata
 */
export const SERVER_NAME = "panel-mcp-server"
export const SERVER_VERSION = "1.0.0"

/**
 * Provider prefixes for model resolution
 */
export const PROVIDER_PREFIXES = {
  openrouter: "openrouter/",
  openai: "openai/",
  anthropic: "anthropic/",
  google: "google/",
  mistral: "mistral/",
} as const

/**
 * Environment variable names
 */
export const ENV_KEYS = {
  OPENROUTER_API_KEY: "OPENROUTER_API_KEY",
  OPENAI_API_KEY: "OPENAI_API_KEY",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  GOOGLE_API_KEY: "GOOGLE_GENERATIVE_AI_API_KEY",
  MISTRAL_API_KEY: "MISTRAL_API_KEY",
  DEFAULT_MODELS: "PANEL_DEFAULT_MODELS",
  MAX_CONCURRENT: "PANEL_MAX_CONCURRENT",
  REQUEST_TIMEOUT: "PANEL_REQUEST_TIMEOUT_MS",
} as const

/**
 * Sentinel value indicating dynamic free models should be fetched
 */
export const FREE_MODELS_SENTINEL = "free" as const

/**
 * Check if environment is configured for free models
 */
export const isUsingFreeModels = (): boolean =>
  Option(process.env[ENV_KEYS.DEFAULT_MODELS])
    .map((v) => v.trim().toLowerCase() === FREE_MODELS_SENTINEL)
    .orElse(false)

/**
 * Get configured default models from environment or use defaults.
 * Special value "free" dynamically fetches free models from OpenRouter.
 *
 * Note: This is the synchronous version that returns fallback free models
 * when "free" is configured. Use getDefaultModelsAsync for dynamic fetching.
 */
export const getDefaultModels = (): List<string> =>
  Option(process.env[ENV_KEYS.DEFAULT_MODELS])
    .map((envModels) => {
      const trimmed = envModels.trim().toLowerCase()
      // Special "free" keyword returns fallback free models synchronously
      if (trimmed === FREE_MODELS_SENTINEL) {
        return FALLBACK_FREE_MODELS
      }
      return List(
        envModels
          .split(",")
          .map((m) => m.trim())
          .filter((m) => m.length > 0),
      )
    })
    .orElse(DEFAULT_PANEL_MODELS)

/**
 * Get configured default models from environment or use defaults (async version).
 * Special value "free" dynamically fetches free models from OpenRouter API.
 */
export const getDefaultModelsAsync = async (): Promise<List<string>> => {
  const envModels = process.env[ENV_KEYS.DEFAULT_MODELS]

  if (!envModels) {
    return DEFAULT_PANEL_MODELS
  }

  const trimmed = envModels.trim().toLowerCase()

  // Special "free" keyword fetches dynamic free models
  if (trimmed === FREE_MODELS_SENTINEL) {
    return getFreeModels()
  }

  return List(
    envModels
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0),
  )
}

/**
 * Get max concurrent requests from environment or use default
 */
export const getMaxConcurrent = (): number =>
  Option(process.env[ENV_KEYS.MAX_CONCURRENT])
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n) && n > 0)
    .orElse(DEFAULT_MAX_CONCURRENT)

/**
 * Get request timeout from environment or use default
 */
export const getRequestTimeout = (): number =>
  Option(process.env[ENV_KEYS.REQUEST_TIMEOUT])
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n) && n > 0)
    .orElse(DEFAULT_REQUEST_TIMEOUT_MS)

/**
 * Default challenger models for the challenge tool (sync version).
 * Uses the same models as council queries (respects PANEL_DEFAULT_MODELS).
 */
export const getDefaultChallengerModels = (): List<string> => getDefaultModels()

/**
 * Default challenger models for the challenge tool (async version).
 * Uses the same models as council queries (respects PANEL_DEFAULT_MODELS).
 */
export const getDefaultChallengerModelsAsync = (): Promise<List<string>> => getDefaultModelsAsync()

/**
 * All available challenge types for stress-testing
 */
export const ALL_CHALLENGE_TYPES = ["logical", "factual", "completeness", "edge_cases", "alternatives"] as const
