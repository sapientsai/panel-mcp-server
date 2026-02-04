/**
 * Panel MCP Server Configuration Constants
 *
 * All configuration is self-documenting with sensible defaults.
 * Override via environment variables as noted.
 */

import { List, Option } from "functype"

/**
 * Default panel of models for council queries.
 * Balanced selection of capability, cost, and provider diversity.
 *
 * Override: PANEL_DEFAULT_MODELS (comma-separated list)
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
 * Get configured default models from environment or use defaults
 */
export const getDefaultModels = (): List<string> =>
  Option(process.env[ENV_KEYS.DEFAULT_MODELS])
    .map((envModels) =>
      List(
        envModels
          .split(",")
          .map((m) => m.trim())
          .filter((m) => m.length > 0),
      ),
    )
    .orElse(DEFAULT_PANEL_MODELS)

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
 * Default challenger models for the challenge tool.
 * Same balanced selection as council queries.
 *
 * Override: PANEL_DEFAULT_CHALLENGERS (comma-separated list)
 */
export const DEFAULT_CHALLENGER_MODELS = List.of(
  "openai/gpt-4o",
  "anthropic/claude-sonnet-4-20250514",
  "google/gemini-2.5-pro",
)

/**
 * All available challenge types for stress-testing
 */
export const ALL_CHALLENGE_TYPES = ["logical", "factual", "completeness", "edge_cases", "alternatives"] as const
