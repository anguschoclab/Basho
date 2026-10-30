import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import {
  deriveStableHarmony,
  harmonyBandFor,
  HARMONY_TRAINING_MULT,
  HARMONY_CRISIS_WEIGHT,
} from "@/engine/welfare/harmony";

function worldWith(morale: number, welfareRisk: number, scandal: number) {
  const heya = MockFactory.createHeya("h1");
  heya.welfareState = { welfareRisk, morale, complianceState: "compliant", weeksInState: 0, activeDiet: "maintenance" };
  heya.scandalScore = scandal;
  return MockFactory.createWorld({
    heyas: new Map([["h1", heya]]),
    staff: new Map(),
    playerHeyaId: "h1",
  });
}

describe("deriveStableHarmony (P2)", () => {
  it("band thresholds", () => {
    expect(harmonyBandFor(10)).toBe("hostile");
    expect(harmonyBandFor(30)).toBe("uneasy");
    expect(harmonyBandFor(55)).toBe("steady");
    expect(harmonyBandFor(80)).toBe("harmonious");
  });

  it("high morale + low risk + no scandal → harmonious", () => {
    const h = deriveStableHarmony(worldWith(90, 5, 0), "h1");
    expect(h.score).toBeGreaterThanOrEqual(70);
    expect(h.band).toBe("harmonious");
  });

  it("low morale + high risk + scandal → hostile/uneasy", () => {
    const h = deriveStableHarmony(worldWith(10, 90, 80), "h1");
    expect(h.score).toBeLessThan(45);
    expect(["hostile", "uneasy"]).toContain(h.band);
  });

  it("deterministic — same inputs same score", () => {
    const w = worldWith(55, 40, 20);
    expect(deriveStableHarmony(w, "h1").score).toBe(deriveStableHarmony(w, "h1").score);
  });

  it("harmony feeds the training context — discord drags, harmony lifts", () => {
    expect(HARMONY_TRAINING_MULT.hostile).toBeLessThan(1);
    expect(HARMONY_TRAINING_MULT.uneasy).toBeLessThan(1);
    expect(HARMONY_TRAINING_MULT.steady).toBe(1);
    expect(HARMONY_TRAINING_MULT.harmonious).toBeGreaterThan(1);
  });

  it("harmony weights the crisis roll — discord breeds crises", () => {
    expect(HARMONY_CRISIS_WEIGHT.hostile).toBeGreaterThan(1);
    expect(HARMONY_CRISIS_WEIGHT.uneasy).toBeGreaterThan(1);
    expect(HARMONY_CRISIS_WEIGHT.steady).toBe(1);
    expect(HARMONY_CRISIS_WEIGHT.harmonious).toBeLessThan(1);
  });
});
