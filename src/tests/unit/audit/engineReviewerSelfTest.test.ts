import { describe, it, expect } from "vitest";
import { reviewSource } from "../../../../scripts/engine-reviewer";

describe("F3: engine-reviewer self-test — known-good and known-bad samples", () => {
  it("flags Math.random() usage", () => {
    const violations = reviewSource(
      "const x = Math.random();\n",
      "test.ts",
    );
    expect(violations.some((v) => v.type === "RNG Convention Breach")).toBe(true);
  });

  it("flags dead function calls (processHeyaFinances)", () => {
    const violations = reviewSource(
      "processHeyaFinances();\n",
      "test.ts",
    );
    expect(violations.some((v) => v.type === "Dead Function Call")).toBe(true);
  });

  it("flags dead function calls (tickWeekEconomics)", () => {
    const violations = reviewSource(
      "tickWeekEconomics();\n",
      "test.ts",
    );
    expect(violations.some((v) => v.type === "Dead Function Call")).toBe(true);
  });

  it("flags BardEngine token mismatch (%HEYA_NAME%)", () => {
    const violations = reviewSource(
      "if (token === %HEYA_NAME%) return;\n",
      "test.ts",
    );
    expect(violations.some((v) => v.type === "BardEngine Token Mismatch")).toBe(true);
  });

  it("flags direct world mutation without builder", () => {
    const violations = reviewSource(
      "world.rikishi = new Map();\n",
      "test.ts",
    );
    expect(violations.some((v) => v.type === "Potential Mutable State Leak")).toBe(true);
  });

  it("flags world.push mutation without builder", () => {
    const violations = reviewSource(
      "world.events.push(event);\n",
      "test.ts",
    );
    expect(violations.some((v) => v.type === "Potential Mutable State Leak")).toBe(true);
  });

  it("does NOT flag @world-builder annotated mutations", () => {
    const violations = reviewSource(
      "world.talentPool = {}; // @world-builder\n",
      "test.ts",
    );
    expect(violations.some((v) => v.type === "Potential Mutable State Leak")).toBe(false);
  });

  it("does NOT flag builder.updateWorldField calls", () => {
    const violations = reviewSource(
      'builder.updateWorldField("rikishi", newMap);\n',
      "test.ts",
    );
    expect(violations.some((v) => v.type === "Potential Mutable State Leak")).toBe(false);
  });

  it("does NOT flag structuredClone assignments", () => {
    const violations = reviewSource(
      "world.rikishi = structuredClone(newMap);\n",
      "test.ts",
    );
    expect(violations.some((v) => v.type === "Potential Mutable State Leak")).toBe(false);
  });

  it("does NOT flag comparison reads (===)", () => {
    const violations = reviewSource(
      "if (world.rikishi === expected) return;\n",
      "test.ts",
    );
    expect(violations.some((v) => v.type === "Potential Mutable State Leak")).toBe(false);
  });

  it("does NOT flag string literals containing world.x = y", () => {
    const violations = reviewSource(
      'const msg = "world.rikishi = something";\n',
      "test.ts",
    );
    expect(violations.some((v) => v.type === "Potential Mutable State Leak")).toBe(false);
  });

  it("does NOT flag comments containing world.x = y", () => {
    const violations = reviewSource(
      "// world.rikishi = something\n",
      "test.ts",
    );
    expect(violations.some((v) => v.type === "Potential Mutable State Leak")).toBe(false);
  });

  it("produces 0 false positives on a clean engine file sample", () => {
    const cleanCode = [
      "import { RNGRegistry } from '../core/RNGRegistry';",
      "",
      "export function tick(world: WorldState) {",
      "  const rng = RNGRegistry.getRng(world);",
      "  const rikishi = world.rikishi.get(id);",
      "  if (!rikishi) return;",
      "  builder.updateWorldField('rikishi', updatedMap);",
      "  // world.events = null  — not a real mutation, just a comment",
      "  const label = `world.rikishi has ${world.rikishi.size} entries`;",
      "}",
    ].join("\n");

    const violations = reviewSource(cleanCode, "clean-sample.ts");
    expect(violations).toEqual([]);
  });

  it("detects all violation types in a mixed bad file", () => {
    const badCode = [
      "const r = Math.random();",
      "processHeyaFinances();",
      "world.events.push({ type: 'TEST' });",
      "if (token === %HEYA_NAME%) return;",
    ].join("\n");

    const violations = reviewSource(badCode, "bad-sample.ts");
    expect(violations.length).toBeGreaterThanOrEqual(3);
    const types = violations.map((v) => v.type);
    expect(types).toContain("RNG Convention Breach");
    expect(types).toContain("Dead Function Call");
    expect(types).toContain("Potential Mutable State Leak");
  });
});
