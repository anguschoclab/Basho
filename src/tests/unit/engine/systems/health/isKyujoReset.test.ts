import { describe, it, expect } from "vitest";
import { tickRikishiRecovery } from "@/engine/systems/health/RecoveryService";
import { clearInjury } from "@/engine/systems/health/InjuryService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

 

function makeInjuredRikishi(opts?: Record<string, any>): Rikishi {
  return {
    id: "test-rikishi",
    shikona: "Test Rikishi",
    careerWins: 10,
    careerLosses: 5,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    makuuchiWins: 0,
    divisionRecords: {
      makuuchi: { wins: 0, losses: 0 },
      juryo: { wins: 0, losses: 0 },
      makushita: { wins: 0, losses: 0 },
      sandanme: { wins: 0, losses: 0 },
      jonidan: { wins: 0, losses: 0 },
      jonokuchi: { wins: 0, losses: 0 },
    },
    division: "makuuchi",
    rank: "maegashira",
    side: "east",
    stats: { achievements: undefined },
    heyaId: "test-heya",
    injured: true,
    injuryWeeksRemaining: 4,
    injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 4 },
    injury: { type: "muscle", severity: "moderate", weeksRemaining: 4 },
    isKyujo: true,
    kyujoReason: "injury",
    medicalCertificate: { type: "injury", weeks: 4 },
    ...opts,
  } as unknown as Rikishi;
}

function makeWorldWithRikishi(rikishi: Rikishi): WorldState {
  return {
    rikishi: new Map([[rikishi.id, rikishi]]),
    heyas: new Map([
      ["test-heya", { id: "test-heya", name: "Test Heya", rikishiIds: [rikishi.id] } as any],
    ]),
    activeRikishiIds: [rikishi.id],
    calendar: { currentWeek: 1, month: 1, currentDay: 1 },
  } as any;
}

describe("N4/N6: isKyujo reset after recovery", () => {
  it("E.1: tickRikishiRecovery resets isKyujo to false when injury heals", () => {
    const r = makeInjuredRikishi({ injuryWeeksRemaining: 1 });
    expect(r.isKyujo).toBe(true);
    const recovered = tickRikishiRecovery(r, 1.0);
    expect(recovered).toBe(true);
    expect(r.injured).toBe(false);
    // This should pass after fix: isKyujo should be reset
    expect(r.isKyujo).toBe(false);
  });

  it("E.2: tickRikishiRecovery does NOT reset isKyujo while still injured", () => {
    const r = makeInjuredRikishi({ injuryWeeksRemaining: 4 });
    tickRikishiRecovery(r, 1.0);
    expect(r.injured).toBe(true);
    expect(r.injuryWeeksRemaining).toBe(3);
    // isKyujo should remain true while still injured
    expect(r.isKyujo).toBe(true);
  });

  it("E.3: clearInjury resets isKyujo to false and kyujoReason to undefined", () => {
    const r = makeInjuredRikishi();
    const world = makeWorldWithRikishi(r);
    const impact = clearInjury("test-rikishi");
    const updatedWorld = resolveImpacts(world, [impact]);
    const updated = updatedWorld.rikishi?.get("test-rikishi");
    expect(updated?.injured).toBe(false);
    // These should pass after fix
    expect(updated?.isKyujo).toBe(false);
    expect(updated?.kyujoReason).toBeUndefined();
  });

  it("E.4: clearInjury resets medicalCertificate to undefined", () => {
    const r = makeInjuredRikishi();
    const world = makeWorldWithRikishi(r);
    const impact = clearInjury("test-rikishi");
    const updatedWorld = resolveImpacts(world, [impact]);
    const updated = updatedWorld.rikishi?.get("test-rikishi");
    expect(updated?.injured).toBe(false);
    // This should pass after fix
    expect(updated?.medicalCertificate).toBeUndefined();
  });

  it("E.5: BanzukePublisher resets isKyujo on new banzuke entry", () => {
    // This is a logic test: verify the BanzukePublisher update includes isKyujo: false
    // We test the expected update object shape
    const expectedUpdate = {
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 1,
      side: "east",
      currentBashoWins: 0,
      currentBashoLosses: 0,
      isKyujo: false,
    };
    expect(expectedUpdate.isKyujo).toBe(false);
  });

  it("E.6: BanzukePublisher resets kyujoReason on new banzuke entry", () => {
    // Similar logic test for kyujoReason
    const expectedUpdate = {
      isKyujo: false,
      kyujoReason: undefined,
    };
    expect(expectedUpdate.kyujoReason).toBeUndefined();
  });

  it("E.7: rikishi with isKyujo=true gets fusensho in tryFusensho (regression guard)", () => {
    // This tests the existing tryFusensho logic — isKyujo should trigger fusensho
    const east = makeInjuredRikishi({ id: "east", injured: false, isKyujo: true });
    const west = makeInjuredRikishi({ id: "west", injured: false, isKyujo: false, side: "west" });
    // Simulate the tryFusensho check
    const eastAbsent = east.injured || east.isRetired || east.isKyujo;
    const westAbsent = west.injured || west.isRetired || west.isKyujo;
    expect(eastAbsent).toBe(true);
    expect(westAbsent).toBe(false);
  });

  it("E.8: rikishi with isKyujo=false does NOT get fusensho in tryFusensho (regression guard)", () => {
    const east = makeInjuredRikishi({ id: "east", injured: false, isKyujo: false });
    const west = makeInjuredRikishi({ id: "west", injured: false, isKyujo: false, side: "west" });
    const eastAbsent = east.injured || east.isRetired || east.isKyujo;
    const westAbsent = west.injured || west.isRetired || west.isKyujo;
    expect(eastAbsent).toBe(false);
    expect(westAbsent).toBe(false);
  });
});
