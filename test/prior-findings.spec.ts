import { Option } from "functype"
import { describe, expect, it } from "vitest"

import { PRIOR_FINDINGS_SCHEMA, type PriorFinding, renderPriorFindings } from "../src/prior-findings"

describe("prior findings", () => {
  describe("renderPriorFindings", () => {
    it("should return empty string for None", () => {
      expect(renderPriorFindings(Option.none())).toBe("")
    })

    it("should return empty string for an empty list", () => {
      expect(renderPriorFindings(Option([]))).toBe("")
    })

    it("should render the finding text", () => {
      const out = renderPriorFindings(Option([{ finding: "No severity tiering" }]))
      expect(out).toContain("- No severity tiering")
    })

    it("should include severity and model when present", () => {
      const out = renderPriorFindings(
        Option([{ finding: "Wrong citation", severity: "significant", model: "azure/x" }]),
      )
      expect(out).toContain("- Wrong citation [significant] (raised by azure/x)")
    })

    it("should omit severity and model when absent", () => {
      expect(renderPriorFindings(Option([{ finding: "Bare" }]))).toContain("- Bare\n")
    })

    it("should omit whitespace-only severity and model", () => {
      const out = renderPriorFindings(Option([{ finding: "Bare", severity: "   ", model: "" }]))
      expect(out).not.toContain("[")
      expect(out).not.toContain("raised by")
    })

    it("should instruct reviewers to verify rather than repeat", () => {
      const out = renderPriorFindings(Option([{ finding: "x" }]))
      expect(out).toContain("Do not simply repeat these")
      expect(out).toContain("resolves it")
    })

    it("should render every finding", () => {
      const findings: PriorFinding[] = [{ finding: "one" }, { finding: "two" }, { finding: "three" }]
      const out = renderPriorFindings(Option(findings))
      for (const f of findings) expect(out).toContain(`- ${f.finding}`)
    })
  })

  describe("PRIOR_FINDINGS_SCHEMA", () => {
    it("should accept undefined", () => {
      expect(PRIOR_FINDINGS_SCHEMA.parse(undefined)).toBeUndefined()
    })

    it("should accept entries with only a finding", () => {
      expect(PRIOR_FINDINGS_SCHEMA.parse([{ finding: "a" }])).toEqual([{ finding: "a" }])
    })

    it("should accept the shape a prior round returns", () => {
      const prior = [{ finding: "Wrong citation", severity: "significant", model: "azure/gpt-6-astra" }]
      expect(PRIOR_FINDINGS_SCHEMA.parse(prior)).toEqual(prior)
    })

    it("should reject an entry missing finding", () => {
      expect(() => PRIOR_FINDINGS_SCHEMA.parse([{ severity: "minor" }])).toThrow()
    })
  })
})
