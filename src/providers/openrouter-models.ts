/**
 * OpenRouter Models API
 *
 * Provides dynamic model discovery and search via OpenRouter's API.
 * Models are cached for 1 hour to minimize API calls.
 */

import { List, tryCatchAsync } from "functype"

import type { OpenRouterModel, SearchModelsOptions, SearchModelsResult } from "../types.js"

/**
 * Cache TTL: 1 hour
 */
const CACHE_TTL_MS = 60 * 60 * 1000

/**
 * Cache state using a mutable object pattern
 * eslint-disable-next-line functional/no-let
 */

const cache: { models: List<OpenRouterModel> | null; timestamp: number } = {
  models: null,
  timestamp: 0,
}

/**
 * Raw model from OpenRouter API
 */
type RawOpenRouterModel = {
  readonly id: string
  readonly name?: string
  readonly description?: string
  readonly context_length?: number
  readonly pricing?: {
    readonly prompt?: string
    readonly completion?: string
  }
}

/**
 * Fetch all models from OpenRouter API (no API key required)
 */
export const fetchOpenRouterModels = async (): Promise<List<OpenRouterModel>> => {
  // Return cached if fresh
  if (cache.models && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.models
  }

  const result = await tryCatchAsync(
    async () => {
      const response = await fetch("https://openrouter.ai/api/v1/models")
      if (!response.ok) {
        return Promise.reject(new Error(`OpenRouter API error: ${response.status}`))
      }
      const data = (await response.json()) as { data: RawOpenRouterModel[] }
      return data.data
    },
    (error) => error,
  )

  const models = result.fold(
    () => List.empty<OpenRouterModel>(),
    (data) =>
      List(data).map(
        (m): OpenRouterModel => ({
          id: m.id,
          name: m.name ?? m.id,
          description: m.description,
          contextLength: m.context_length ?? 0,
          pricing: {
            prompt: m.pricing?.prompt ?? "0",
            completion: m.pricing?.completion ?? "0",
          },
          provider: m.id.split("/")[0] ?? "unknown",
        }),
      ),
  )

  // Update cache (using object mutation pattern)
  // eslint-disable-next-line functional/immutable-data
  cache.models = models
  // eslint-disable-next-line functional/immutable-data
  cache.timestamp = Date.now()

  return models
}

/**
 * Check if a model matches a search query
 */
const matchesQuery = (model: OpenRouterModel, query: string): boolean => {
  const lowerQuery = query.toLowerCase()
  return (
    model.id.toLowerCase().includes(lowerQuery) ||
    model.name.toLowerCase().includes(lowerQuery) ||
    (model.description?.toLowerCase().includes(lowerQuery) ?? false)
  )
}

/**
 * Search OpenRouter models with filters
 */
export const searchModels = async (opts: SearchModelsOptions): Promise<SearchModelsResult> => {
  const allModels = await fetchOpenRouterModels()
  const limit = opts.limit ?? 10

  const filtered = allModels
    .filter((m) => !opts.query || matchesQuery(m, opts.query))
    .filter((m) => !opts.provider || m.provider.toLowerCase() === opts.provider.toLowerCase())
    .filter((m) => {
      if (opts.maxPrice === undefined) return true
      const promptPrice = parseFloat(m.pricing.prompt) * 1_000_000
      return promptPrice <= opts.maxPrice
    })
    .filter((m) => {
      if (!opts.freeOnly) return true
      return parseFloat(m.pricing.prompt) === 0
    })

  return {
    models: List(filtered.toArray().slice(0, limit)),
    query: opts.query,
    totalMatches: filtered.size,
  }
}

/**
 * Free models using OpenRouter's auto-routing
 * Uses the free tier auto-router 3 times for diverse responses
 */
const FREE_MODELS = List.of("openrouter/openrouter/free", "openrouter/openrouter/free", "openrouter/openrouter/free")

/**
 * Get free models for council queries
 */
export const getFreeModels = (): Promise<List<string>> => {
  return Promise.resolve(FREE_MODELS)
}

/**
 * Get free models for display
 */
export const getCachedFreeModels = (): Promise<List<string>> => {
  return Promise.resolve(FREE_MODELS)
}

/**
 * Clear cache (useful for testing)
 */
export const clearModelCache = (): void => {
  // eslint-disable-next-line functional/immutable-data
  cache.models = null
  // eslint-disable-next-line functional/immutable-data
  cache.timestamp = 0
}

/**
 * Export for use in constants.ts
 */
export { FREE_MODELS as FALLBACK_FREE_MODELS }
