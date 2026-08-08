import { describe, it, expect } from "vitest";
import { tickStaffWeek, generateStaff } from "@/engine/staff";
import { makeMockWorld, makeMockHeya } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Staff } from "@/engine/types/staff";
import {
  STAFF_FATIGUE_GAIN_MULTIPLIER,
  STAFF_OVERLOAD_MORALE_PENALTY,
  STAFF_NORMAL_MORALE_PENALTY,
  STAFF_FATIGUE_RECOVERY,
  STAFF_MORALE_RECOVERY,
  STAFF_MORALE_DECAY,
} from "@/constants/engine/economy";

function makeStaffWithOverrides(
  seed: string,
  heyaId: string,
  overrides: Partial<Staff> = {}
): Staff {
  const s = generateStaff(seed, "technique_coach", heyaId, 1);
  return { ...s, ...overrides };
}

function buildWorld(
  heyas: Map<string, ReturnType<typeof makeMockHeya>>,
  staffMap: Map<string, Staff>
): WorldState {
  return makeMockWorld({
    heyas,
    staff: staffMap,
  });
}

describe("tickStaffWeek — guard clauses", () => {
  it("returns empty impact when world.staff is undefined", () => {
    const world = makeMockWorld({ staff: undefined as any });
    const impact = tickStaffWeek(world);
    expect(impact.entities?.staffUpdates).toBeUndefined();
  });

  it("returns empty impact when world.heyas is undefined", () => {
    const world = makeMockWorld({ heyas: undefined as any });
    const impact = tickStaffWeek(world);
    expect(impact.entities?.staffUpdates).toBeUndefined();
  });

  it("returns empty impact when heya has no staff", () => {
    const heya = makeMockHeya("h1", { staffIds: [], rikishiIds: ["r1"] });
    const world = buildWorld(new Map([["h1", heya]]), new Map());
    const impact = tickStaffWeek(world);
    expect(impact.entities?.staffUpdates).toBeUndefined();
  });
});

describe("tickStaffWeek — under-load (no overload)", () => {
  it("decreases fatigue by STAFF_FATIGUE_RECOVERY and keeps morale when fatigue >= STAFF_LOW_FATIGUE_THRESHOLD", () => {
    const staff = makeStaffWithOverrides("s1", "h1", { fatigue: 30, morale: 50 });
    const heya = makeMockHeya("h1", { staffIds: [staff.id], rikishiIds: ["r1", "r2"] });
    const world = buildWorld(new Map([["h1", heya]]), new Map([[staff.id, staff]]));

    const impact = tickStaffWeek(world);
    const update = impact.entities?.staffUpdates?.get(staff.id);

    expect(update?.fatigue).toBe(30 - STAFF_FATIGUE_RECOVERY);
    expect(update?.morale).toBe(50);
  });

  it("increases morale by STAFF_MORALE_RECOVERY when fatigue < STAFF_LOW_FATIGUE_THRESHOLD", () => {
    const staff = makeStaffWithOverrides("s2", "h1", { fatigue: 10, morale: 50 });
    const heya = makeMockHeya("h1", { staffIds: [staff.id], rikishiIds: ["r1"] });
    const world = buildWorld(new Map([["h1", heya]]), new Map([[staff.id, staff]]));

    const impact = tickStaffWeek(world);
    const update = impact.entities?.staffUpdates?.get(staff.id);

    expect(update?.fatigue).toBe(Math.max(0, 10 - STAFF_FATIGUE_RECOVERY));
    expect(update?.morale).toBe(50 + STAFF_MORALE_RECOVERY);
  });
});

describe("tickStaffWeek — overload", () => {
  it("increases fatigue and drops morale by STAFF_OVERLOAD_MORALE_PENALTY when loadFactor > STAFF_OVERLOAD_THRESHOLD", () => {
    // 1 staff, capacity = 4, 10 rikishi → loadFactor = 2.5 > 1.5
    const staff = makeStaffWithOverrides("s3", "h1", { fatigue: 20, morale: 60 });
    const rikishiIds = Array.from({ length: 10 }, (_, i) => `r${i}`);
    const heya = makeMockHeya("h1", { staffIds: [staff.id], rikishiIds });
    const world = buildWorld(new Map([["h1", heya]]), new Map([[staff.id, staff]]));

    const impact = tickStaffWeek(world);
    const update = impact.entities?.staffUpdates?.get(staff.id);

    const expectedFatigueGain = Math.ceil(2.5 * STAFF_FATIGUE_GAIN_MULTIPLIER);
    expect(update?.fatigue).toBe(20 + expectedFatigueGain);
    expect(update?.morale).toBe(60 - STAFF_OVERLOAD_MORALE_PENALTY);
  });

  it("drops morale by STAFF_NORMAL_MORALE_PENALTY when overloaded but loadFactor <= STAFF_OVERLOAD_THRESHOLD", () => {
    // 1 staff, capacity = 4, 5 rikishi → loadFactor = 1.25 <= 1.5
    const staff = makeStaffWithOverrides("s4", "h1", { fatigue: 20, morale: 60 });
    const rikishiIds = Array.from({ length: 5 }, (_, i) => `r${i}`);
    const heya = makeMockHeya("h1", { staffIds: [staff.id], rikishiIds });
    const world = buildWorld(new Map([["h1", heya]]), new Map([[staff.id, staff]]));

    const impact = tickStaffWeek(world);
    const update = impact.entities?.staffUpdates?.get(staff.id);

    expect(update?.morale).toBe(60 - STAFF_NORMAL_MORALE_PENALTY);
  });
});

describe("tickStaffWeek — high morale decay", () => {
  it("decays morale by STAFF_MORALE_DECAY when morale > STAFF_HIGH_MORALE_THRESHOLD and not overloaded", () => {
    const staff = makeStaffWithOverrides("s5", "h1", { fatigue: 30, morale: 80 });
    const heya = makeMockHeya("h1", { staffIds: [staff.id], rikishiIds: ["r1"] });
    const world = buildWorld(new Map([["h1", heya]]), new Map([[staff.id, staff]]));

    const impact = tickStaffWeek(world);
    const update = impact.entities?.staffUpdates?.get(staff.id);

    // fatigue 30 >= 20 so morale stays 80, then decay: 80 - 0.1 = 79.9
    expect(update?.morale).toBe(80 - STAFF_MORALE_DECAY);
  });
});

describe("tickStaffWeek — retired staff skipped", () => {
  it("does not update staff with careerPhase 'retired'", () => {
    const staff = makeStaffWithOverrides("s6", "h1", {
      fatigue: 30,
      morale: 50,
      careerPhase: "retired",
    });
    const heya = makeMockHeya("h1", { staffIds: [staff.id], rikishiIds: ["r1"] });
    const world = buildWorld(new Map([["h1", heya]]), new Map([[staff.id, staff]]));

    const impact = tickStaffWeek(world);
    expect(impact.entities?.staffUpdates?.has(staff.id) ?? false).toBe(false);
  });
});

describe("tickStaffWeek — clamping", () => {
  it("clamps fatigue at 100 under extreme overload", () => {
    const staff = makeStaffWithOverrides("s7", "h1", { fatigue: 98, morale: 50 });
    const rikishiIds = Array.from({ length: 10 }, (_, i) => `r${i}`);
    const heya = makeMockHeya("h1", { staffIds: [staff.id], rikishiIds });
    const world = buildWorld(new Map([["h1", heya]]), new Map([[staff.id, staff]]));

    const impact = tickStaffWeek(world);
    const update = impact.entities?.staffUpdates?.get(staff.id);

    expect(update?.fatigue).toBe(100);
  });

  it("clamps morale at 0 under extreme overload", () => {
    const staff = makeStaffWithOverrides("s8", "h1", { fatigue: 20, morale: 1 });
    const rikishiIds = Array.from({ length: 10 }, (_, i) => `r${i}`);
    const heya = makeMockHeya("h1", { staffIds: [staff.id], rikishiIds });
    const world = buildWorld(new Map([["h1", heya]]), new Map([[staff.id, staff]]));

    const impact = tickStaffWeek(world);
    const update = impact.entities?.staffUpdates?.get(staff.id);

    expect(update?.morale).toBe(0);
  });

  it("clamps morale at 100 during recovery (low fatigue)", () => {
    const staff = makeStaffWithOverrides("s9", "h1", { fatigue: 10, morale: 100 });
    const heya = makeMockHeya("h1", { staffIds: [staff.id], rikishiIds: ["r1"] });
    const world = buildWorld(new Map([["h1", heya]]), new Map([[staff.id, staff]]));

    const impact = tickStaffWeek(world);
    const update = impact.entities?.staffUpdates?.get(staff.id);

    // fatigue 10 < 20 so morale = min(100, 100 + 1) = 100
    // then high morale decay: 100 > 70 and not overloaded → 100 - 0.1 = 99.9
    expect(update?.morale).toBe(100 - STAFF_MORALE_DECAY);
  });
});
