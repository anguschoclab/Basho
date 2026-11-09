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
import { fireStaff, hireStaff, getHeyaStaffBonuses } from "@/engine/economy/staff";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import {
  STAFF_VACANT_SCOUT_PENALTY,
  STAFF_VACANT_NUTRITION_PENALTY,
  STAFF_VACANT_MEDICAL_PENALTY,
} from "@/constants/engine/economic";
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

  it("vacant scout/nutritionist/medical posts drag bonuses below baseline", () => {
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", MockFactory.createHeya("h1", { staffIds: [] })]]),
    });
    const b = getHeyaStaffBonuses(world, "h1");
    expect(b.scouting).toBeCloseTo(STAFF_VACANT_SCOUT_PENALTY, 5);
    expect(b.diet).toBeCloseTo(STAFF_VACANT_NUTRITION_PENALTY, 5);
    expect(b.medical).toBeCloseTo(STAFF_VACANT_MEDICAL_PENALTY, 5);
    expect(b.technique).toBe(1);
    expect(b.conditioning).toBe(1);
  });

  it("filling a post lifts the vacant-post penalty", () => {
    const s = staff({ role: "scout" });
    const heya = MockFactory.createHeya("h1", { staffIds: ["st1"] });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      staff: new Map([["st1", s]]),
    });
    const b = getHeyaStaffBonuses(world, "h1");
    // strong-band scout: 1 + 0.15 = 1.15 (no vacant penalty)
    expect(b.scouting).toBeGreaterThan(1);
    // medical + diet posts still vacant
    expect(b.medical).toBeCloseTo(STAFF_VACANT_MEDICAL_PENALTY, 5);
  });
});

/**
 * V18 — monthly contract-expiry batch integrity.
 *
 * `tickMonthlyStaffContracts` iterates the INPUT `heya.staffIds`; each
 * expiry rewrites `staffIds`/`staffPosts` by filtering the same input
 * snapshot, so when two contracts lapse in one month only the LAST removal
 * survives — the earlier member is deleted from `world.staff` but keeps a
 * dangling id on the heya (and stays seated in its post).
 */
describe("V18 — multiple expired contracts in one month", () => {
  it("two expired staff in one heya are both released — no ghost staffIds", () => {
    const s1 = staff({ id: "st1", contractEndYear: 0, wageYen: 50_000 });
    const s2 = staff({ id: "st2", contractEndYear: 0, wageYen: 50_000 });
    const heya = MockFactory.createHeya("h1", {
      staffIds: ["st1", "st2"],
      staffPosts: { scout: { slots: 2, filledIds: ["st1", "st2"] } },
      funds: 1_000_000,
    });
    const world = MockFactory.createWorld({
      year: 5,
      heyas: new Map([["h1", heya]]),
      staff: new Map([
        ["st1", s1],
        ["st2", s2],
      ]),
    });

    const resolved = resolveImpacts(world, [tickMonthlyStaffContracts(world)]);
    const h = resolved.heyas.get("h1")!;

    expect(h.staffIds ?? []).toEqual([]);
    expect(h.staffPosts?.["scout"]?.filledIds ?? []).toEqual([]);
    expect(resolved.staff.size).toBe(0);
  });
});

/**
 * V18 — staff id reuse after mid-list removal.
 *
 * `hireStaff`/`hireStaffCandidate` mint ids through
 * `generateStaff(seed, role, heyaId, staffIds.length + 1)` — the sequence is
 * the list LENGTH, not a high-water mark. Removing an earlier member makes
 * the next hire re-mint the surviving member's exact RNG label: identical
 * ST-* id AND an identical generated record, which `addStaff` then writes
 * over the live entity while `pushUniqueId` dedupes the id — the heya pays
 * for a hire that never exists.
 */
describe("V18 — staff id reuse after mid-list removal", () => {
  it("hiring after a mid-list removal must not overwrite a live staff entity", () => {
    const world0 = MockFactory.createWorld({
      seed: "v18-staff-ids",
      heyas: new Map([
        ["h1", MockFactory.createHeya("h1", { funds: 10_000_000, staffIds: [] })],
      ]),
    });

    // Two real hires: sequences 1 and 2 → ids id1, id2.
    const w1 = resolveImpacts(world0, [hireStaff(world0, "h1", "scout")]);
    const w2 = resolveImpacts(w1, [hireStaff(w1, "h1", "scout")]);
    const [firstId, secondId] = w2.heyas.get("h1")!.staffIds!;
    expect(w2.staff.size).toBe(2);

    // Remove the earlier hire — next hire reuses sequence 2 → same label
    // → same ST id as the surviving member.
    const w3 = resolveImpacts(w2, [fireStaff(w2, "h1", firstId)]);
    const w4 = resolveImpacts(w3, [hireStaff(w3, "h1", "scout")]);

    // Two paid hires remain on the books: survivor + new hire must be
    // distinct entities — today the roster still lists only the survivor's
    // id and the staff map still holds exactly one record.
    expect(w4.heyas.get("h1")!.staffIds!.length).toBe(2);
    expect(w4.staff.size).toBe(2);
  });
});
