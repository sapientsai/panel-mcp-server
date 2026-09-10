/**
 * Carrying findings between review rounds.
 *
 * The tools are deliberately stateless. The models behind them have no memory,
 * so a server-side session would only replay accumulated context on every call
 * while moving the "what still matters" judgement away from the calling LLM,
 * which holds the full conversation. Instead the caller hands back the previous
 * round's findings, which keeps continuity explicit and reproducible.
 */

import { Option } from "functype"
import { z } from "zod"

/**
 * A finding carried forward from an earlier review round.
 */
export type PriorFinding = {
  readonly finding: string
  readonly severity?: string
  readonly model?: string
}

/**
 * Shared schema for the priorFindings parameter on critique and challenge.
 */
export const PRIOR_FINDINGS_SCHEMA = z
  .array(
    z.object({
      finding: z.string().describe("The prior finding text (a 'challenge' or 'weakness' from an earlier round)"),
      severity: z.string().optional().describe("Severity recorded in the prior round, if any"),
      model: z.string().optional().describe("Model that raised it, if known"),
    }),
  )
  .optional()
  .describe(
    "Findings from a previous round on an earlier draft. Reviewers are told to check whether each is resolved rather than repeat it. Pass the entries from the prior response.",
  )

/**
 * Render prior findings into a prompt clause, or "" when there are none.
 *
 * Takes an Option so the nullable value from the tool schema is wrapped once at
 * the call site. Returning "" for the empty case keeps callers free of
 * conditionals — the clause interpolates into the prompt either way.
 */
export const renderPriorFindings = (findings: Option<readonly PriorFinding[]>): string =>
  findings
    .filter((entries) => entries.length > 0)
    .map((entries) => {
      const lines = entries
        .map((entry) => {
          const severity = Option(entry.severity)
            .filter((value) => value.trim().length > 0)
            .map((value) => ` [${value}]`)
            .orElse("")
          const model = Option(entry.model)
            .filter((value) => value.trim().length > 0)
            .map((value) => ` (raised by ${value})`)
            .orElse("")
          return `- ${entry.finding}${severity}${model}`
        })
        .join("\n")

      return `\n\nA previous review round raised the following on an earlier draft:\n${lines}\n\nDo not simply repeat these. For each one, judge whether the current version resolves it, and concentrate your new findings on what remains unresolved or on problems the revision has introduced.`
    })
    .orElse("")
