import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import {
  isProviderConfigured,
  getConfiguredProviders,
  KNOWN_DIRECT_MODELS,
  SAMPLE_OPENROUTER_MODELS,
} from "../src/providers/config"

describe("provider config", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("isProviderConfigured", () => {
    it("should return false when API key not set", () => {
      delete process.env.OPENROUTER_API_KEY
      delete process.env.OPENAI_API_KEY
      expect(isProviderConfigured("openrouter")).toBe(false)
      expect(isProviderConfigured("openai")).toBe(false)
    })

    it("should return true when API key is set", () => {
      process.env.OPENROUTER_API_KEY = "test-key"
      expect(isProviderConfigured("openrouter")).toBe(true)
    })

    it("should check correct env var for each provider", () => {
      process.env.OPENAI_API_KEY = "test"
      expect(isProviderConfigured("openai")).toBe(true)

      process.env.ANTHROPIC_API_KEY = "test"
      expect(isProviderConfigured("anthropic")).toBe(true)

      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test"
      expect(isProviderConfigured("google")).toBe(true)

      process.env.MISTRAL_API_KEY = "test"
      expect(isProviderConfigured("mistral")).toBe(true)
    })
  })

  describe("getConfiguredProviders", () => {
    it("should return empty List when no providers configured", () => {
      delete process.env.OPENROUTER_API_KEY
      delete process.env.OPENAI_API_KEY
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
      delete process.env.MISTRAL_API_KEY

      const providers = getConfiguredProviders()
      expect(providers.isEmpty).toBe(true)
    })

    it("should return configured providers as List", () => {
      process.env.OPENAI_API_KEY = "test"
      process.env.ANTHROPIC_API_KEY = "test"

      const providers = getConfiguredProviders()
      expect(providers.contains("openai")).toBe(true)
      expect(providers.contains("anthropic")).toBe(true)
      expect(providers.contains("google")).toBe(false)
    })
  })

  describe("model lists", () => {
    it("should have known models for direct providers as Lists", () => {
      expect(KNOWN_DIRECT_MODELS.openai.contains("gpt-4o")).toBe(true)
      expect(KNOWN_DIRECT_MODELS.anthropic.contains("claude-sonnet-4-20250514")).toBe(true)
      expect(KNOWN_DIRECT_MODELS.google.contains("gemini-2.5-pro")).toBe(true)
      expect(KNOWN_DIRECT_MODELS.mistral.contains("mistral-large-latest")).toBe(true)
    })

    it("should have sample OpenRouter models as List", () => {
      expect(SAMPLE_OPENROUTER_MODELS.size).toBeGreaterThan(0)
      expect(SAMPLE_OPENROUTER_MODELS.contains("openai/gpt-4o")).toBe(true)
    })
  })
})
