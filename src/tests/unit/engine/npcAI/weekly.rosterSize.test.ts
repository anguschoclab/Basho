import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { makeNPCWeeklyDecision } from "@/engine/npcAI";

/**
 * Characterization coverage for the rosterSize-ratio branch inside
 * applyInjuryRiskReduction: when high-risk rikishi exceed
 * HIGH_RISK_RATIO_THRESHOLD of the roster, punishing intensity is downgraded.
 * Guards the dedup-removal change (rosterSize now reads array length directly).
 */
function setupWorld() {
  const world = makeMockWorld();
  const heya = makeMockHeya("h1", {
    oyakataId: "o1",
    runwayBand: "comfortable",
    rikishiIds: [],
  });
  world.heyas.set("h1", heya);
  world.oyakata.set("o1", {
    id: "o1",
    name: "Oya",
    archetype: "hardliner",
    traits: { ambition: 80, risk: 80, tradition: 50, patience: 20, compassion: 10 },
  } as any);
  world.playerHeyaId = "player";
  return { world, heya };
}

describe("makeNPCWeeklyDecision — rosterSize injury-risk ratio", () => {
  it("downgrades punishing intensity when the high-risk share exceeds the threshold", () => {
    const { world, heya } = setupWorld();
    // All 3 roster members are high-risk -> ratio = 1.0 > threshold
    for (const id of ["r1", "r2", "r3"]) {
      world.rikishi.set(id, mockRikishi(id, { heyaId: "h1", condition: 15, fatigue: 70 }));
    }
    heya.rikishiIds = ["r1", "r2", "r3"];

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.individualProtects.length).toBe(3);
    expect(decision.trainingIntensity).not.toBe("punishing");
  });

  it("does not downgrade when the high-risk share stays under the threshold", () => {
    const { world, heya } = setupWorld();
    world.rikishi.set("r1", mockRikishi("r1", { heyaId: "h1", condition: 15, fatigue: 70 }));
    for (const id of ["r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11"]) {
      world.rikishi.set(id, mockRikishi(id, { heyaId: "h1", condition: 95, fatigue: 5 }));
    }
    heya.rikishiIds = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11"];

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.individualProtects).toContain("r1");
  });
});
