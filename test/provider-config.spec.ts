import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import { isProviderConfigured, getConfiguredProviders } from "../src/providers/config"

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

    it("should treat a whitespace-only key as unset", () => {
      process.env.OPENROUTER_API_KEY = "   "
      expect(isProviderConfigured("openrouter")).toBe(false)
    })

    describe("azure", () => {
      beforeEach(() => {
        delete process.env.AZURE_API_KEY
        delete process.env.AZURE_BASE_URL
      })

      it("should require both key and base URL", () => {
        expect(isProviderConfigured("azure")).toBe(false)

        process.env.AZURE_API_KEY = "test"
        expect(isProviderConfigured("azure")).toBe(false)

        process.env.AZURE_BASE_URL = "https://example.openai.azure.com/openai/v1/"
        expect(isProviderConfigured("azure")).toBe(true)
      })

      it("should not be configured with a base URL but no key", () => {
        process.env.AZURE_BASE_URL = "https://example.openai.azure.com/openai/v1/"
        expect(isProviderConfigured("azure")).toBe(false)
      })
    })
  })

  describe("getConfiguredProviders", () => {
    it("should return empty List when no providers configured", () => {
      delete process.env.OPENROUTER_API_KEY
      delete process.env.OPENAI_API_KEY
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
      delete process.env.MISTRAL_API_KEY
      delete process.env.AZURE_API_KEY
      delete process.env.AZURE_BASE_URL

      const providers = getConfiguredProviders()
      expect(providers.isEmpty).toBe(true)
    })

    it("should include azure only when key and base URL are both set", () => {
      delete process.env.AZURE_BASE_URL
      process.env.AZURE_API_KEY = "test"
      expect(getConfiguredProviders().contains("azure")).toBe(false)

      process.env.AZURE_BASE_URL = "https://example.openai.azure.com/openai/v1/"
      expect(getConfiguredProviders().contains("azure")).toBe(true)
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
})
