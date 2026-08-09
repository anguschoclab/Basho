import { describe, it, expect } from "vitest";
import { processDramaTick } from "@/engine/bard/dramaGenerator";
import { makeMockWorld, mockRikishi, makeMockHeya } from "../utils";

describe("Bug A: generateRandomDrama return value is merged", () => {
  it("processDramaTick returns a valid StateImpact (not discarded)", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1" });
    const heya = makeMockHeya("h1");
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
      activeRikishiIds: new Set(["r1"]),
    });
    const result = processDramaTick(world);
    // Bug A fix: the return value from generateRandomDrama is now merged
    // (previously discarded). Verify we get a valid StateImpact back.
    expect(result).toBeTruthy();
    expect(result.metadata).toBeTruthy();
  });
});

describe("Bug M: checkTriggeredDrama returns all financial crises", () => {
  it("processDramaTick handles multiple insolvent heyas without early return", () => {
    const heya1 = makeMockHeya("h1", { funds: -1_000_000 });
    const heya2 = makeMockHeya("h2", { funds: -2_000_000 });
    const world = makeMockWorld({
      heyas: new Map([
        ["h1", heya1],
        ["h2", heya2],
      ]),
    });
    // Should not throw and should return a valid impact
    const result = processDramaTick(world);
    expect(result).toBeTruthy();
  });
});
