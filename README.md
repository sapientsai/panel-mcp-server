# Panel MCP Server

An MCP (Model Context Protocol) server that provides LLM council workflow tools for multi-model queries, debates, and reviews.

## Overview

Panel MCP Server enables AI clients (like Claude) to orchestrate multi-model workflows. The calling LLM uses these tools to query multiple models in parallel, run structured debates, get critiques, and then synthesize the results itself.

**Key insight**: The MCP server exposes tools that return structured multi-model responses. The calling LLM decides when/how to use these tools and can further process, compare, or synthesize the collected responses using its own reasoning.

## Features

- **council_query**: Query multiple LLMs in parallel, returning all responses for synthesis
- **debate**: Run structured adversarial debates between two models
- **critique**: Get one model to critique another's response
- **query_model**: Query a single model directly
- **list_models**: Discover available models by provider
- **health_check**: Check provider status and connectivity

## Provider Support

### Dual-Mode Provider System

1. **OpenRouter mode** (recommended): Use `openrouter/` prefix for any of 300+ models
   - `openrouter/anthropic/claude-sonnet-4`
   - `openrouter/openai/gpt-4o`
   - `openrouter/meta-llama/llama-3.3-70b-instruct`

2. **Direct mode**: Use provider prefix for direct API calls (lower latency, no fee)
   - `openai/gpt-4o` - calls OpenAI API directly
   - `anthropic/claude-sonnet-4-20250514` - calls Anthropic API directly
   - `google/gemini-2.5-pro` - calls Google API directly

**Default Panel**: GPT-4o + Claude Sonnet 4 + Gemini 2.5 Pro

## Installation

```bash
npm install panel-mcp-server
# or
pnpm add panel-mcp-server
```

## Configuration

Set at least one API key:

```bash
# Required (at least one)
export OPENROUTER_API_KEY=sk-or-...

# Optional direct providers (lower latency)
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_GENERATIVE_AI_API_KEY=...
export MISTRAL_API_KEY=...

# Optional configuration
export PANEL_DEFAULT_MODELS=gpt-4o,claude-sonnet-4-20250514,gemini-2.5-pro
export PANEL_MAX_CONCURRENT=5
export PANEL_REQUEST_TIMEOUT_MS=60000
```

## Usage

### As MCP Server (stdio)

```bash
panel-mcp-server --stdio
```

### As MCP Server (HTTP)

```bash
panel-mcp-server --http 8080
```

### Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "panel": {
      "command": "npx",
      "args": ["panel-mcp-server", "--stdio"],
      "env": {
        "OPENROUTER_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Tools

### council_query

Query multiple LLM models in parallel. Returns all responses for synthesis.

```typescript
{
  prompt: string,
  models?: string[],  // defaults to GPT-4o, Claude Sonnet 4, Gemini 2.5 Pro
  systemPrompt?: string
}
```

### debate

Run a structured adversarial debate between two models.

```typescript
{
  topic: string,
  affirmativeModel: string,
  negativeModel: string,
  rounds?: number  // 1-5, default: 2
}
```

### critique

Have one model critique a response.

```typescript
{
  originalPrompt: string,
  response: string,
  criticModel: string,
  aspects?: string[]  // e.g., ["accuracy", "completeness"]
}
```

### query_model

Query a single model directly.

```typescript
{
  prompt: string,
  model: string,
  systemPrompt?: string
}
```

### list_models

List available models by provider.

```typescript
{
  provider?: "all" | "openrouter" | "openai" | "anthropic" | "google" | "mistral"
}
```

### health_check

Check provider status.

```typescript
{
}
```

## Development

```bash
# Install dependencies
pnpm install

# Validate (format + lint + test + build)
pnpm validate

# Development mode
pnpm dev

# Run tests
pnpm test
```

## Built With

- [FastMCP](https://github.com/punkpeye/fastmcp) - MCP server framework
- [Vercel AI SDK](https://sdk.vercel.ai/) - LLM provider integrations
- [functype](https://github.com/jordanburke/functype) - Functional programming patterns
- [ts-builds](https://github.com/jordanburke/ts-builds) - TypeScript build tooling

## License

MIT
