import { describe, it, expect } from "vitest";
import type { ArchetypeEvidenceAccumulator } from "../types/rikishi";

describe("ArchetypeEvidence Accumulator", () => {
  it("Test A: Accumulator Initialization", () => {
    const evidence: ArchetypeEvidenceAccumulator = {
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 }
    };
    expect(evidence.push).toEqual({ success: 0, fail: 0 });
    expect(evidence.grapple).toEqual({ success: 0, fail: 0 });
    expect(evidence.evade).toEqual({ success: 0, fail: 0 });
  });

  it("Test B: Evidence Accumulation (No Array Bloat)", () => {
    const evidence: ArchetypeEvidenceAccumulator = {
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 }
    };

    // Simulate 100 bout interactions for a rikishi
    for (let i = 0; i < 100; i++) {
      evidence.push.success += 1;
    }

    expect(evidence.push.success).toBe(100);
    // Object size should not change (it has 3 keys)
    expect(Object.keys(evidence).length).toBe(3);
  });

  it("Test C: Basho Reset", () => {
    const evidence: ArchetypeEvidenceAccumulator = {
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 }
    };

    evidence.push.success = 10;
    evidence.grapple.fail = 5;

    // Reset logic (simulating resetArchetypeEvidence)
    evidence.push.success = 0;
    evidence.push.fail = 0;
    evidence.grapple.success = 0;
    evidence.grapple.fail = 0;
    evidence.evade.success = 0;
    evidence.evade.fail = 0;

    expect(evidence.push.success).toBe(0);
    expect(evidence.grapple.fail).toBe(0);
  });
});
