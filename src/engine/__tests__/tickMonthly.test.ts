import { describe, it, expect } from "vitest";
import { tickArchetypeDrift } from "../tick/tickMonthly";
import { isBashoMonth } from "../calendar";
import type { Rikishi, ArchetypeEvidenceAccumulator } from "../types/rikishi";

describe("Archetype Drift & Hysteresis Logic Timing", () => {
  it("Test A: Off-Basho Guard (Even Months)", () => {
    const evidence: ArchetypeEvidenceAccumulator = {
      push: { success: 15, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 }
    };
    const r = { id: "test-1", shikona: "Test", tacticalArchetypePrimary: "yotsu", archetypeEvidence: evidence } as Rikishi;

    const state: any = {
      calendar: { month: 2 },
      rikishi: new Map([[r.id, r]])
    };

    tickArchetypeDrift(state);

    // Assert: No drift occurred
    expect(r.tacticalArchetypePrimary).toBe("yotsu");
    // Assert: Evidence is NOT cleared
    expect(evidence.push.success).toBe(15);
  });

  it("Test B: Basho Month Execution (Odd Months)", () => {
    const evidence: ArchetypeEvidenceAccumulator = {
      push: { success: 15, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 }
    };
    const r = { id: "test-1", shikona: "Test", tacticalArchetypePrimary: "yotsu", archetypeEvidence: evidence } as Rikishi;

    const state: any = {
      calendar: { month: 1 },
      rikishi: new Map([[r.id, r]])
    };

    tickArchetypeDrift(state);

    // Assert: Drift IS evaluated and shifted
    expect(r.tacticalArchetypePrimary).toBe("oshi");
    // Assert: Evidence is cleared to zeros
    expect(r.archetypeEvidence.push.success).toBe(0);
  });
});
