/**
 * designBible.test.ts
 * ===================
 * Phase 5 gate: mechanical design-bible conformance.
 * Runs scripts/designScan.ts RULES over production source and asserts zero
 * violations. Fix the source, not this test.
 */
import { describe, it, expect } from "vitest";
import { scanDesignViolations } from "../../../../scripts/designScan";

describe("Design bible — mechanical conformance gate", () => {
  const violations = scanDesignViolations();

  it("has zero P0 violations (raw hex/rgb colors, gradients, banned fonts, raw palette classes)", () => {
    const p0 = violations.filter((v) => v.severity === "P0");
    expect(
      p0.map((v) => `${v.file}:${v.line} [${v.rule}] ${v.snippet}`).join("\n"),
      `P0 design violations (${p0.length})`
    ).toBe("");
  });

  it("has zero P1 violations (glassmorphism, arbitrary text sizes)", () => {
    const p1 = violations.filter((v) => v.severity === "P1");
    expect(
      p1.map((v) => `${v.file}:${v.line} [${v.rule}] ${v.snippet}`).join("\n"),
      `P1 design violations (${p1.length})`
    ).toBe("");
  });

  it("has zero P2 violations (italic numerals, oversized tracking, generic pills, screaming copy)", () => {
    const p2 = violations.filter((v) => v.severity === "P2");
    expect(
      p2.map((v) => `${v.file}:${v.line} [${v.rule}] ${v.snippet}`).join("\n"),
      `P2 design violations (${p2.length})`
    ).toBe("");
  });
});
