#!/usr/bin/env node
/**
 * Panel MCP Server
 *
 * Provides LLM council workflow tools for multi-model queries, debates, and reviews.
 * The calling LLM uses these tools to orchestrate multi-model workflows and can
 * synthesize/compile the results itself.
 */

import { program } from "commander"
import { FastMCP } from "fastmcp"
import { List, Option, Try } from "functype"
import { z } from "zod"

import { DEFAULT_DEBATE_ROUNDS, getDefaultModels, MAX_DEBATE_ROUNDS, SERVER_NAME, SERVER_VERSION } from "./constants.js"
import {
  getAvailableModels,
  getConfiguredProviders,
  isProviderConfigured,
  queryModel,
  queryModels,
} from "./providers/index.js"
import {
  type CouncilQueryResult,
  type Critique,
  type CritiqueResult,
  type DebateResult,
  type DebateRound,
  type HealthCheckResult,
  isModelError,
  type ProviderHealth,
} from "./types.js"

// Create the MCP server
const server = new FastMCP({
  name: SERVER_NAME,
  version: SERVER_VERSION,
})

// ============================================================================
// Serialization helpers for List -> JSON
// ============================================================================

/**
 * Convert a result with List fields to plain JSON-serializable object
 */
const serializeCouncilResult = (result: CouncilQueryResult): object => ({
  responses: result.responses.toArray(),
  errors: result.errors.toArray(),
  metadata: {
    ...result.metadata,
    failedModels: result.metadata.failedModels.toArray(),
  },
})

const serializeDebateResult = (result: DebateResult): object => ({
  ...result,
  rounds: result.rounds.toArray(),
})

const serializeCritiqueResult = (result: CritiqueResult): object => ({
  critique: {
    strengths: result.critique.strengths.toArray(),
    weaknesses: result.critique.weaknesses.toArray(),
    suggestions: result.critique.suggestions.toArray(),
    overallAssessment: result.critique.overallAssessment,
  },
  metadata: result.metadata,
})

const serializeHealthResult = (result: HealthCheckResult): object => ({
  ...result,
  providers: result.providers.toArray(),
})

const serializeModelsResult = (result: ReturnType<typeof getAvailableModels>): object => ({
  directProviders: Object.fromEntries(
    Object.entries(result.directProviders).map(([key, value]) => [
      key,
      { configured: value.configured, models: value.models.toArray() },
    ]),
  ),
  openrouter: result.openrouter,
})

// ============================================================================
// Health & Discovery Tools
// ============================================================================

server.addTool({
  name: "health_check",
  description:
    "Check the health status of configured providers. Returns status for each provider and overall system health.",
  parameters: z.object({}),
  execute: async (): Promise<string> => {
    const providers = getConfiguredProviders()

    const healthResults: List<ProviderHealth> = providers.map(
      (provider): ProviderHealth =>
        isProviderConfigured(provider)
          ? { provider, status: "healthy", latencyMs: 0 }
          : { provider, status: "unconfigured" },
    )

    const healthyCount = healthResults.filter((h) => h.status === "healthy").size
    const totalConfigured = healthResults.filter((h) => h.status !== "unconfigured").size

    const status =
      healthyCount === totalConfigured && totalConfigured > 0
        ? ("healthy" as const)
        : healthyCount > 0
          ? ("degraded" as const)
          : ("unhealthy" as const)

    const result: HealthCheckResult = {
      status,
      providers: healthResults,
      timestamp: new Date().toISOString(),
    }

    return JSON.stringify(serializeHealthResult(result), null, 2)
  },
})

server.addTool({
  name: "list_models",
  description:
    "List available models by provider. Shows configured direct providers and their models. OpenRouter provides access to 300+ models when configured.",
  parameters: z.object({
    provider: z
      .enum(["all", "openrouter", "openai", "anthropic", "google", "mistral"])
      .optional()
      .describe("Filter by specific provider, or 'all' for complete list"),
  }),
  execute: async (args): Promise<string> => {
    const allModels = getAvailableModels()

    return Option(args.provider)
      .filter((p) => p !== "all")
      .map((provider) => {
        const providerStatus = allModels.directProviders[provider]
        return JSON.stringify(
          {
            provider,
            configured: providerStatus.configured,
            models: providerStatus.models.toArray(),
            ...(provider === "openrouter" ? { note: allModels.openrouter.note } : {}),
          },
          null,
          2,
        )
      })
      .orElse(JSON.stringify(serializeModelsResult(allModels), null, 2))
  },
})

// ============================================================================
// Query Tools
// ============================================================================

server.addTool({
  name: "query_model",
  description: "Query a single LLM model directly. Use for targeted queries or building custom workflows.",
  parameters: z.object({
    prompt: z.string().describe("The prompt to send to the model"),
    model: z
      .string()
      .describe(
        "Model identifier (e.g., 'openai/gpt-4o', 'anthropic/claude-sonnet-4-20250514', 'openrouter/meta-llama/llama-3.3-70b-instruct')",
      ),
    systemPrompt: z.string().optional().describe("Optional system prompt for context"),
  }),
  execute: async (args): Promise<string> => {
    const result = await queryModel(args.model, args.prompt, args.systemPrompt)
    return JSON.stringify(result, null, 2)
  },
})

server.addTool({
  name: "council_query",
  description:
    "Query multiple LLM models in parallel. Returns all responses for the calling LLM to synthesize, compare, or find consensus. Use when you want diverse perspectives on a question.",
  parameters: z.object({
    prompt: z.string().describe("The prompt to send to all models"),
    models: z
      .array(z.string())
      .optional()
      .describe("Array of model identifiers. Defaults to GPT-4o, Claude Sonnet 4, and Gemini 2.5 Pro"),
    systemPrompt: z.string().optional().describe("Optional shared system prompt for all models"),
  }),
  execute: async (args): Promise<string> => {
    const models = Option(args.models)
      .map((m) => List(m))
      .orElse(getDefaultModels())
    const startTime = Date.now()

    const { responses, errors } = await queryModels(models, args.prompt, args.systemPrompt)

    const result: CouncilQueryResult = {
      responses,
      errors,
      metadata: {
        totalLatencyMs: Date.now() - startTime,
        successCount: responses.size,
        failedModels: errors.map((e) => e.model),
      },
    }

    return JSON.stringify(serializeCouncilResult(result), null, 2)
  },
})

// ============================================================================
// Debate Tool
// ============================================================================

server.addTool({
  name: "debate",
  description:
    "Run a structured adversarial debate between two models on a topic. Returns the full transcript for the calling LLM to analyze, judge, or synthesize key arguments.",
  parameters: z.object({
    topic: z.string().describe("The debate topic or proposition"),
    affirmativeModel: z.string().describe("Model arguing FOR the proposition"),
    negativeModel: z.string().describe("Model arguing AGAINST the proposition"),
    rounds: z
      .number()
      .min(1)
      .max(MAX_DEBATE_ROUNDS)
      .optional()
      .describe(`Number of debate rounds (1-${MAX_DEBATE_ROUNDS}). Default: ${DEFAULT_DEBATE_ROUNDS}`),
  }),
  execute: async (args): Promise<string> => {
    const rounds = Option(args.rounds).orElse(DEFAULT_DEBATE_ROUNDS)
    const startTime = Date.now()
    const debateRoundsArr: DebateRound[] = []
    let previousArguments = ""

    for (let round = 1; round <= rounds; round++) {
      const roundContext =
        round === 1
          ? ""
          : `\n\nPrevious arguments in this debate:\n${previousArguments}\n\nContinue the debate, responding to the opponent's latest points.`

      // Affirmative argues first
      const affirmativePrompt = `You are participating in a formal debate. You are arguing FOR the following proposition:\n\n"${args.topic}"\n\nThis is round ${round} of ${rounds}.${roundContext}\n\nPresent your arguments clearly and persuasively. ${round > 1 ? "Address your opponent's points and strengthen your position." : "Make your opening argument."}`

      const affirmativeResult = await queryModel(args.affirmativeModel, affirmativePrompt)

      if (isModelError(affirmativeResult)) {
        throw new Error(`Affirmative model failed: ${affirmativeResult.error}`)
      }

      // Update context for negative
      const affirmativeArg = `Round ${round} - Affirmative (${args.affirmativeModel}):\n${affirmativeResult.text}`
      previousArguments += (previousArguments ? "\n\n" : "") + affirmativeArg

      // Negative responds
      const negativePrompt = `You are participating in a formal debate. You are arguing AGAINST the following proposition:\n\n"${args.topic}"\n\nThis is round ${round} of ${rounds}.\n\nPrevious arguments in this debate:\n${previousArguments}\n\nPresent your counter-arguments clearly and persuasively. Respond to your opponent's points and make your case against the proposition.`

      const negativeResult = await queryModel(args.negativeModel, negativePrompt)

      if (isModelError(negativeResult)) {
        throw new Error(`Negative model failed: ${negativeResult.error}`)
      }

      // Update context for next round
      const negativeArg = `Round ${round} - Negative (${args.negativeModel}):\n${negativeResult.text}`
      previousArguments += `\n\n${negativeArg}`

      debateRoundsArr.push({
        round,
        affirmative: affirmativeResult.text,
        negative: negativeResult.text,
      })
    }

    const result: DebateResult = {
      topic: args.topic,
      affirmativeModel: args.affirmativeModel,
      negativeModel: args.negativeModel,
      rounds: List(debateRoundsArr),
      metadata: {
        totalExchanges: rounds * 2,
        totalLatencyMs: Date.now() - startTime,
      },
    }

    return JSON.stringify(serializeDebateResult(result), null, 2)
  },
})

// ============================================================================
// Critique Tool
// ============================================================================

server.addTool({
  name: "critique",
  description:
    "Have a model critique a response. Returns structured feedback with strengths, weaknesses, and suggestions. Use to get a second opinion or improve a response.",
  parameters: z.object({
    originalPrompt: z.string().describe("The original prompt that generated the response"),
    response: z.string().describe("The response to critique (from another model or user-provided)"),
    criticModel: z.string().describe("The model to perform the critique"),
    aspects: z
      .array(z.string())
      .optional()
      .describe("Specific aspects to focus on (e.g., ['accuracy', 'completeness', 'clarity'])"),
  }),
  execute: async (args): Promise<string> => {
    const aspectsClause = Option(args.aspects)
      .filter((a) => a.length > 0)
      .map((aspects) => `\n\nFocus particularly on these aspects: ${aspects.join(", ")}`)
      .orElse("")

    const critiquePrompt = `You are a critical reviewer. Analyze the following response to a prompt and provide structured feedback.

Original prompt:
"${args.originalPrompt}"

Response to critique:
"${args.response}"
${aspectsClause}

Provide your critique in the following JSON format:
{
  "strengths": ["list of strong points"],
  "weaknesses": ["list of weak points or issues"],
  "suggestions": ["list of specific improvements"],
  "overallAssessment": "brief overall assessment"
}

Respond ONLY with the JSON object, no additional text.`

    const startTime = Date.now()
    const result = await queryModel(args.criticModel, critiquePrompt)

    if (isModelError(result)) {
      throw new Error(`Critique failed: ${result.error}`)
    }

    // Parse the critique response using Try
    const critique = Try(() => {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = result.text.trim()
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```(?:json)?\n?/g, "").trim()
      }
      return JSON.parse(jsonStr) as {
        strengths?: string[]
        weaknesses?: string[]
        suggestions?: string[]
        overallAssessment?: string
      }
    }).fold(
      (): Critique => ({
        strengths: List.empty(),
        weaknesses: List.empty(),
        suggestions: List.empty(),
        overallAssessment: result.text,
      }),
      (parsed): Critique => ({
        strengths: List(parsed.strengths ?? []),
        weaknesses: List(parsed.weaknesses ?? []),
        suggestions: List(parsed.suggestions ?? []),
        overallAssessment: parsed.overallAssessment ?? result.text,
      }),
    )

    const critiqueResult: CritiqueResult = {
      critique,
      metadata: {
        criticModel: args.criticModel,
        latencyMs: Date.now() - startTime,
      },
    }

    return JSON.stringify(serializeCritiqueResult(critiqueResult), null, 2)
  },
})

// ============================================================================
// CLI Entry Point
// ============================================================================

program
  .name("panel-mcp-server")
  .description("MCP server providing LLM council workflow tools")
  .version(SERVER_VERSION)
  .option("--stdio", "Use stdio transport (default)")
  .option("--http <port>", "Use HTTP transport on specified port")
  .action((options) => {
    const httpPort = Option(options.http)
      .map((portStr) => parseInt(portStr, 10))
      .filter((port) => !isNaN(port))

    if (Option.isSome(httpPort)) {
      const port = httpPort.orElse(3000)
      server.start({
        transportType: "httpStream",
        httpStream: { port },
      })
      console.error(`Panel MCP Server running on http://localhost:${port}`)
    } else {
      server.start({
        transportType: "stdio",
      })
    }
  })

program.parse()
