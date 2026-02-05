/**
 * OpenRouter Free Models
 *
 * Uses OpenRouter's free auto-router for council queries.
 * The auto-router automatically selects from available free models,
 * providing diversity without needing to track specific model IDs.
 */

import { List } from "functype"

/**
 * Free models using OpenRouter's auto-routing
 * Uses the free tier auto-router 3 times for diverse responses
 * This is more robust than tracking specific free model IDs
 */
const FREE_MODELS = List.of("openrouter/openrouter/free", "openrouter/openrouter/free", "openrouter/openrouter/free")

/**
 * Get free models for council queries
 *
 * Returns OpenRouter's free auto-router 3 times for diverse responses.
 * The auto-router handles selecting available free models automatically.
 */
export const getFreeModels = (): Promise<List<string>> => {
  return Promise.resolve(FREE_MODELS)
}

/**
 * Get free models for list_models display
 */
export const getCachedFreeModels = (): Promise<List<string>> => {
  return Promise.resolve(FREE_MODELS)
}

/**
 * Export for use in constants.ts
 */
export { FREE_MODELS as FALLBACK_FREE_MODELS }
