/**
 * OpenRouter Model Fetching and Caching
 *
 * Dynamically fetches available models from OpenRouter's API,
 * with caching and fallback to hardcoded free models.
 */

import { List, Option, tryCatchAsync } from "functype"

import { ENV_KEYS } from "../constants.js"
import { isProviderConfigured } from "./config.js"

/**
 * OpenRouter model response type
 */
type OpenRouterModel = {
  readonly id: string
  readonly name: string
  readonly pricing?: {
    readonly prompt?: string
    readonly completion?: string
  }
  readonly context_length?: number
}

type OpenRouterModelsResponse = {
  readonly data: OpenRouterModel[]
}

/**
 * Cached models state
 */
type CachedModels = {
  readonly freeModels: List<string>
  readonly allModels: List<OpenRouterModel>
  readonly fetchedAt: number
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"

/**
 * Hardcoded fallback free models (used when API is unavailable)
 * Updated Feb 2026 - these should be periodically refreshed
 */
const FALLBACK_FREE_MODELS = List.of(
  "stepfun/step-3.5-flash:free",
  "arcee-ai/trinity-large-preview:free",
  "openrouter/free",
)

/**
 * Module-level cache (mutable ref for caching)
 */

const modelCacheRef: { current: CachedModels | null } = { current: null }

/**
 * Check if a model is free (pricing.prompt is "0" or id ends with :free)
 */
const isFreeModel = (model: OpenRouterModel): boolean => {
  const hasFreePrice = model.pricing?.prompt === "0"
  const hasFreeId = model.id.endsWith(":free")
  return hasFreePrice || hasFreeId
}

/**
 * Select diverse free models (prefer different providers)
 */
const selectDiverseFreeModels = (freeModels: List<OpenRouterModel>, count: number): List<string> => {
  const seenProviders = new Set<string>()
  const selected: string[] = []

  // First pass: select one model per provider
  freeModels.forEach((model) => {
    if (selected.length >= count) return
    const provider = model.id.split("/")[0]
    if (provider && !seenProviders.has(provider)) {
      seenProviders.add(provider)
      selected.push(model.id)
    }
  })

  // Second pass: fill remaining slots if needed
  if (selected.length < count) {
    freeModels.forEach((model) => {
      if (selected.length >= count) return
      if (!selected.includes(model.id)) {
        selected.push(model.id)
      }
    })
  }

  return List(selected)
}

/**
 * Fetch models from OpenRouter API
 */
const fetchOpenRouterModels = async (): Promise<Option<OpenRouterModelsResponse>> => {
  const apiKey = process.env[ENV_KEYS.OPENROUTER_API_KEY]
  if (!apiKey) return Option.none()

  const result = await tryCatchAsync(
    async () => {
      const response = await fetch(OPENROUTER_MODELS_URL, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000), // 10s timeout for model list
      })

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`)
      }

      return (await response.json()) as OpenRouterModelsResponse
    },
    (error) => {
      console.error("Failed to fetch OpenRouter models:", error)
      return null
    },
  )

  return result.fold(
    () => Option.none(),
    (data) => Option(data),
  )
}

/**
 * Refresh the model cache
 */
const refreshCache = async (): Promise<CachedModels> => {
  const response = await fetchOpenRouterModels()

  return response.fold(
    // Fallback: use hardcoded free models
    () => ({
      freeModels: FALLBACK_FREE_MODELS,
      allModels: List.empty<OpenRouterModel>(),
      fetchedAt: Date.now(),
    }),
    // Success: extract free models
    (data) => {
      const allModels = List(data.data)
      const freeModels = allModels.filter(isFreeModel)
      const selectedFree = selectDiverseFreeModels(freeModels, 3)

      return {
        freeModels: selectedFree.size > 0 ? selectedFree : FALLBACK_FREE_MODELS,
        allModels,
        fetchedAt: Date.now(),
      }
    },
  )
}

/**
 * Check if cache is still valid
 */
const isCacheValid = (): boolean => {
  if (!modelCacheRef.current) return false
  return Date.now() - modelCacheRef.current.fetchedAt < CACHE_TTL_MS
}

/**
 * Get free models from OpenRouter (with caching)
 *
 * Returns 3 diverse free models suitable for council queries.
 * Falls back to hardcoded list if API is unavailable.
 */
export const getFreeModels = async (): Promise<List<string>> => {
  if (isCacheValid() && modelCacheRef.current) {
    return modelCacheRef.current.freeModels
  }

  // Only fetch if OpenRouter is configured
  if (!isProviderConfigured("openrouter")) {
    return FALLBACK_FREE_MODELS
  }

  modelCacheRef.current = await refreshCache()
  return modelCacheRef.current.freeModels
}

/**
 * Get cached free models (for list_models display)
 * Non-blocking: returns cached value immediately, triggers background refresh if stale
 */
export const getCachedFreeModels = (): Promise<List<string>> => {
  if (isCacheValid() && modelCacheRef.current) {
    return Promise.resolve(modelCacheRef.current.freeModels)
  }

  // Don't block - return fallback if not cached
  if (!isProviderConfigured("openrouter")) {
    return Promise.resolve(FALLBACK_FREE_MODELS)
  }

  // Trigger background refresh
  void refreshCache().then((cache) => {
    modelCacheRef.current = cache
  })

  return Promise.resolve(modelCacheRef.current?.freeModels ?? FALLBACK_FREE_MODELS)
}

/**
 * Force refresh the cache (useful for testing)
 */
export const refreshFreeModelsCache = async (): Promise<List<string>> => {
  modelCacheRef.current = await refreshCache()
  return modelCacheRef.current.freeModels
}

/**
 * Clear the cache (useful for testing)
 */
export const clearFreeModelsCache = (): void => {
  modelCacheRef.current = null
}

/**
 * Export fallback for use in constants.ts
 */
export { FALLBACK_FREE_MODELS }
