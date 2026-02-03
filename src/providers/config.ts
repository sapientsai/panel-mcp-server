/**
 * Provider configuration from environment variables
 */

import { List, Match, Option } from "functype"

import { ENV_KEYS } from "../constants.js"
import type { ProviderType } from "../types.js"

/**
 * All provider types
 */
export const ALL_PROVIDERS: List<ProviderType> = List.of("openrouter", "openai", "anthropic", "google", "mistral")

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
    .exhaustive()

/**
 * Check if a provider is configured (has API key)
 */
export const isProviderConfigured = (provider: ProviderType): boolean =>
  Option(process.env[getEnvKeyForProvider(provider)])
    .map((key) => key.length > 0)
    .orElse(false)

/**
 * Get all configured providers
 */
export const getConfiguredProviders = (): List<ProviderType> => ALL_PROVIDERS.filter(isProviderConfigured)

/**
 * Known models for direct providers (subset of available models)
 * These are commonly used models - actual availability depends on API key permissions
 */
export const KNOWN_DIRECT_MODELS: Record<Exclude<ProviderType, "openrouter">, List<string>> = {
  openai: List.of("gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "o1", "o1-mini", "o3-mini"),
  anthropic: List.of(
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
  ),
  google: List.of("gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"),
  mistral: List.of("mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "codestral-latest"),
}

/**
 * Sample OpenRouter models (they support 300+ models)
 */
export const SAMPLE_OPENROUTER_MODELS = List.of(
  "openai/gpt-4o",
  "anthropic/claude-sonnet-4-20250514",
  "google/gemini-2.5-pro",
  "meta-llama/llama-3.3-70b-instruct",
  "deepseek/deepseek-chat",
  "qwen/qwen-2.5-72b-instruct",
  "mistralai/mistral-large-latest",
)
