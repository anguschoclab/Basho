import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import {
  sendScout,
  tickScoutMissions,
  SCOUT_TIERS,
  deriveScoutStats,
} from "@/engine/recruitment/scoutMissions";
import type { Staff } from "@/engine/types/staff";

function mkScout(): Staff {
  return {
    id: "scout1",
    heyaId: "h1",
    name: "Scout Kato",
    role: "scout",
    age: 50,
    careerPhase: "senior",
    reputationBand: "respected",
    loyaltyBand: "stable",
    competenceBands: { primary: "strong" },
    fatigue: 0,
    morale: 60,
    scandalExposure: 0,
    yearsAtBeya: 10,
    priorAffiliations: [],
    successorEligible: false,
    skill: 7,
  } as Staff;
}

function mk() {
  const scout = mkScout();
  const heya = MockFactory.createHeya("h1", { funds: 5_000_000, staffIds: ["scout1"] });
  const world = MockFactory.createWorld({
    week: 4,
    heyas: new Map([["h1", heya]]),
    staff: new Map([["scout1", scout]]),
    playerHeyaId: "h1",
  });
  return { world };
}

describe("SEND_SCOUT (P4)", () => {
  it("validates + debits + enqueues a mission", () => {
    const { world } = mk();
    const impact = sendScout(world, "h1", "scout1", "national");
    const heyaUp = impact.entities?.heyaUpdates?.get("h1") as { funds?: number };
    expect(heyaUp?.funds).toBe(5_000_000 - SCOUT_TIERS.national.costYen);
    const missions = impact.worldFields?.activeScoutMissions!;
    expect(missions.length).toBe(1);
    expect(missions[0].tier).toBe("national");
    expect(missions[0].returnsWeek).toBe(4 + SCOUT_TIERS.national.durationWeeks);
  });

  it("rejects a second concurrent mission for the same scout", () => {
    const { world } = mk();
    world.activeScoutMissions = [
      {
        id: "m0",
        heyaId: "h1",
        scoutStaffId: "scout1",
        tier: "local",
        startedWeek: 1,
        returnsWeek: 9,
        costYen: 60_000,
      },
    ];
    expect(sendScout(world, "h1", "scout1", "local").worldFields?.activeScoutMissions).toBeUndefined();
  });

  it("rejects unaffordable missions and non-scout staff", () => {
    const { world } = mk();
    world.heyas.get("h1")!.funds = 10;
    expect(sendScout(world, "h1", "scout1", "international").worldFields?.activeScoutMissions).toBeUndefined();
    const { world: w2 } = mk();
    w2.staff.get("scout1")!.role = "administrator";
    expect(sendScout(w2, "h1", "scout1", "local").worldFields?.activeScoutMissions).toBeUndefined();
  });
});

describe("tickScoutMissions (P4)", () => {
  it("returns due missions and logs a scouting report", () => {
    const { world } = mk();
    world.activeScoutMissions = [
      { id: "m0", heyaId: "h1", scoutStaffId: "scout1", tier: "national", startedWeek: 2, returnsWeek: 4, costYen: 180_000 },
      { id: "m1", heyaId: "h1", scoutStaffId: "scout1", tier: "local", startedWeek: 4, returnsWeek: 9, costYen: 60_000 },
    ];
    const impact = tickScoutMissions(world);
    const remaining = impact.worldFields?.activeScoutMissions!;
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe("m1");
    expect((impact.events ?? []).some((e) => e.type === "RECRUIT_DISCOVERED")).toBe(true);
  });
});

describe("deriveScoutStats", () => {
  it("maps skill to sub-stats", () => {
    const s = deriveScoutStats(mkScout());
    expect(s.network).toBe(7);
    expect(s.evaluation).toBeGreaterThan(0);
    expect(s.negotiation).toBeGreaterThan(0);
  });
});
