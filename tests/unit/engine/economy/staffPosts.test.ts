import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import {
  STAFF_POST_SLOTS,
  openSlots,
  severanceCost,
  monthlyWageBill,
  refreshStaffCandidatePool,
  hireStaffCandidate,
  tickMonthlyStaffContracts,
  skillFromBands,
} from "@/engine/economy/staffPosts";
import { fireStaff } from "@/engine/economy/staff";
import type { Staff } from "@/engine/types/staff";

function staff(over: Partial<Staff> = {}): Staff {
  return {
    id: "st1",
    heyaId: "h1",
    name: "Test Staffer",
    role: "scout",
    age: 45,
    careerPhase: "established",
    reputationBand: "respected",
    loyaltyBand: "stable",
    competenceBands: { primary: "strong" },
    fatigue: 10,
    morale: 60,
    scandalExposure: 0,
    yearsAtBeya: 5,
    priorAffiliations: [],
    successorEligible: false,
    ...over,
  } as Staff;
}

describe("staff posts (P2)", () => {
  it("slot caps and open slots", () => {
    const s = staff();
    const heya = MockFactory.createHeya("h1", { staffIds: ["st1"] });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      staff: new Map([["st1", s]]),
    });
    expect(STAFF_POST_SLOTS.scout).toBe(2);
    expect(openSlots(world, heya, "scout")).toBe(1);
    expect(openSlots(world, heya, "technique_coach")).toBe(2);
  });

  it("severance is 3 months wage and is charged on fire", () => {
    const s = staff({ wageYen: 100_000 });
    const heya = MockFactory.createHeya("h1", { staffIds: ["st1"], funds: 1_000_000 });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      staff: new Map([["st1", s]]),
    });
    expect(severanceCost(s)).toBe(300_000);
    const impact = fireStaff(world, "h1", "st1");
    const heyaUp = impact.entities?.heyaUpdates?.get("h1") as { funds?: number };
    expect(heyaUp?.funds).toBe(700_000);
  });

  it("monthlyWageBill sums staff wages", () => {
    const s = staff({ wageYen: 120_000 });
    const heya = MockFactory.createHeya("h1", { staffIds: ["st1"] });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      staff: new Map([["st1", s]]),
    });
    expect(monthlyWageBill(world, "h1")).toBe(120_000);
  });

  it("candidate pool refresh is deterministic per (seed, month)", () => {
    const mk = () => {
      const w = MockFactory.createWorld({ year: 1, calendar: { currentWeek: 1, month: 3 } });
      return refreshStaffCandidatePool(w).worldFields?.staffCandidatePool;
    };
    const a = mk();
    const b = mk();
    expect(a?.length).toBeGreaterThan(0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("hireStaffCandidate debits signing fee, adds staff + post, removes from pool", () => {
    const world = MockFactory.createWorld({ year: 1, calendar: { currentWeek: 1, month: 3 } });
    const heya = MockFactory.createHeya("h1", { funds: 10_000_000, staffIds: [] });
    world.heyas = new Map([["h1", heya]]);
    world.playerHeyaId = "h1";
    const pool = refreshStaffCandidatePool(world).worldFields!.staffCandidatePool!;
    world.staffCandidatePool = pool;
    const cand = pool[0];
    const impact = hireStaffCandidate(world, "h1", cand.id);
    const heyaUp = impact.entities?.heyaUpdates?.get("h1") as {
      funds?: number;
      staffIds?: string[];
    };
    expect(heyaUp?.funds).toBe(10_000_000 - cand.wageYen * 2);
    expect(heyaUp?.staffIds?.length).toBe(1);
    expect(impact.collections?.staffToAdd?.length).toBe(1);
  });

  it("expired contracts release staff on monthly tick", () => {
    const s = staff({ wageYen: 50_000, contractEndYear: 0 });
    const heya = MockFactory.createHeya("h1", { staffIds: ["st1"], funds: 1_000_000 });
    const world = MockFactory.createWorld({
      year: 5,
      heyas: new Map([["h1", heya]]),
      staff: new Map([["st1", s]]),
    });
    const impact = tickMonthlyStaffContracts(world);
    const heyaUp = impact.entities?.heyaUpdates?.get("h1") as {
      funds?: number;
      staffIds?: string[];
    };
    expect(heyaUp?.funds).toBe(950_000);
    expect(heyaUp?.staffIds).toEqual([]);
    expect(impact.collections?.staffToRemove).toContain("st1");
  });

  it("skillFromBands maps bands to 0-10", () => {
    expect(skillFromBands({ primary: "monstrous" })).toBe(10);
    expect(skillFromBands({ primary: "feeble" })).toBe(1);
  });
});
