/**
 * Provider configuration from environment variables
 */

import { List, Match, Option } from "functype"

import { ENV_KEYS } from "../constants.js"
import type { ProviderType } from "../types.js"

/**
 * All provider types
 */
export const ALL_PROVIDERS: List<ProviderType> = List.of(
  "openrouter",
  "openai",
  "anthropic",
  "google",
  "mistral",
  "azure",
)

/**
 * Get the environment variable key for a provider
 */
const getEnvKeyForProvider = (provider: ProviderType): string =>
  Match(provider)
    .case("openrouter", () => ENV_KEYS.OPENROUTER_API_KEY)
    .case("openai", () => ENV_KEYS.OPENAI_API_KEY)
    .case("anthropic", () => ENV_KEYS.ANTHROPIC_API_KEY)
    .case("google", () => ENV_KEYS.GOOGLE_API_KEY)
    .case("mistral", () => ENV_KEYS.MISTRAL_API_KEY)
    .case("azure", () => ENV_KEYS.AZURE_API_KEY)
    .exhaustive()

/**
 * Check if an environment variable holds a usable value.
 * Whitespace-only counts as unset, so a blank passthrough (e.g. "${VAR:-}"
 * expanding to "") never registers a provider as configured.
 */
const hasEnvValue = (key: string): boolean =>
  Option(process.env[key])
    .map((value) => value.trim().length > 0)
    .orElse(false)

/**
 * Check if a provider is configured (has API key)
 *
 * Azure is the exception: it needs a key *and* a base URL, because the resource
 * endpoint cannot be derived. Requiring both keeps health_check honest — a key
 * without a URL cannot serve a request.
 */
export const isProviderConfigured = (provider: ProviderType): boolean =>
  provider === "azure"
    ? hasEnvValue(ENV_KEYS.AZURE_API_KEY) && hasEnvValue(ENV_KEYS.AZURE_BASE_URL)
    : hasEnvValue(getEnvKeyForProvider(provider))

/**
 * Get all configured providers
 */
export const getConfiguredProviders = (): List<ProviderType> => ALL_PROVIDERS.filter(isProviderConfigured)
