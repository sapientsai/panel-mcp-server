import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { List } from "functype"

import {
  DEFAULT_PANEL_MODELS,
  DEFAULT_MAX_CONCURRENT,
  DEFAULT_REQUEST_TIMEOUT_MS,
  SERVER_NAME,
  SERVER_VERSION,
  getDefaultModels,
  getMaxConcurrent,
  getRequestTimeout,
} from "../src/constants"

describe("constants", () => {
  describe("default values", () => {
    it("should have default panel models as List", () => {
      expect(DEFAULT_PANEL_MODELS.size).toBe(3)
      expect(DEFAULT_PANEL_MODELS.contains("openai/gpt-4o")).toBe(true)
      expect(DEFAULT_PANEL_MODELS.contains("anthropic/claude-sonnet-4-20250514")).toBe(true)
      expect(DEFAULT_PANEL_MODELS.contains("google/gemini-2.5-pro")).toBe(true)
    })

    it("should have sensible defaults", () => {
      expect(DEFAULT_MAX_CONCURRENT).toBe(5)
      expect(DEFAULT_REQUEST_TIMEOUT_MS).toBe(60_000)
    })

    it("should have server metadata", () => {
      expect(SERVER_NAME).toBe("panel-mcp-server")
      expect(SERVER_VERSION).toBe("1.0.0")
    })
  })

  describe("getDefaultModels", () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it("should return default models when env not set", () => {
      delete process.env.PANEL_DEFAULT_MODELS
      const models = getDefaultModels()
      expect(models.toArray()).toEqual(DEFAULT_PANEL_MODELS.toArray())
    })

    it("should parse models from environment", () => {
      process.env.PANEL_DEFAULT_MODELS = "openai/gpt-4,anthropic/claude-3"
      const models = getDefaultModels()
      expect(models.toArray()).toEqual(["openai/gpt-4", "anthropic/claude-3"])
    })
  })

  describe("getMaxConcurrent", () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it("should return default when env not set", () => {
      delete process.env.PANEL_MAX_CONCURRENT
      expect(getMaxConcurrent()).toBe(DEFAULT_MAX_CONCURRENT)
    })

    it("should parse from environment", () => {
      process.env.PANEL_MAX_CONCURRENT = "10"
      expect(getMaxConcurrent()).toBe(10)
    })

    it("should return default for invalid values", () => {
      process.env.PANEL_MAX_CONCURRENT = "invalid"
      expect(getMaxConcurrent()).toBe(DEFAULT_MAX_CONCURRENT)
    })
  })

  describe("getRequestTimeout", () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it("should return default when env not set", () => {
      delete process.env.PANEL_REQUEST_TIMEOUT_MS
      expect(getRequestTimeout()).toBe(DEFAULT_REQUEST_TIMEOUT_MS)
    })

    it("should parse from environment", () => {
      process.env.PANEL_REQUEST_TIMEOUT_MS = "30000"
      expect(getRequestTimeout()).toBe(30000)
    })
  })
})
