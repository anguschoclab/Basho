import { describe, it, expect } from "vitest";
import { phase01_week_staff } from "@/engine/tick/phases/phase01_week_staff";
import { generateStaff } from "@/engine/staff";
import { makeMockWorld, makeMockHeya } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Staff } from "@/engine/types/staff";

function makeStaff(seed: string, heyaId: string, overrides: Partial<Staff> = {}): Staff {
  const s = generateStaff(seed, "technique_coach", heyaId, 1);
  return { ...s, ...overrides };
}

describe("phase01_week_staff — integration (no mocking)", () => {
  it("full pipeline: world with 1 heya, 2 staff, 10 rikishi produces staffUpdates with increased fatigue", () => {
    const s1 = makeStaff("s1", "h1", { fatigue: 20, morale: 50 });
    const s2 = makeStaff("s2", "h1", { fatigue: 10, morale: 60 });
    const rikishiIds = Array.from({ length: 10 }, (_, i) => `r${i}`);
    const heya = makeMockHeya("h1", { staffIds: [s1.id, s2.id], rikishiIds });
    const world = makeMockWorld({
      heyas: new Map([["h1", heya]]),
      staff: new Map([[s1.id, s1], [s2.id, s2]]),
    }) as WorldState;

    const impact = phase01_week_staff(world);
    const updates = impact.entities?.staffUpdates;

    expect(updates).toBeDefined();
    expect(updates!.has(s1.id)).toBe(true);
    expect(updates!.has(s2.id)).toBe(true);

    // 10 rikishi / (2 staff * 4 capacity) = 1.25 loadFactor → overloaded
    // fatigue gain = ceil(1.25 * 2) = 3
    const u1 = updates!.get(s1.id);
    expect(u1?.fatigue).toBe(20 + 3);
  });

  it("empty world (no heyas, no staff) returns empty impact without crashing", () => {
    const world = makeMockWorld() as WorldState;
    const impact = phase01_week_staff(world);
    expect(impact.entities?.staffUpdates).toBeUndefined();
  });

  it("multiple heyas with different load levels update staff independently", () => {
    // Heya A: overloaded (10 rikishi, 2 staff → loadFactor 1.25)
    const sA = makeStaff("sA", "hA", { fatigue: 20, morale: 50 });
    const rikishiA = Array.from({ length: 10 }, (_, i) => `rA${i}`);
    const heyaA = makeMockHeya("hA", { staffIds: [sA.id], rikishiIds: rikishiA });

    // Heya B: normal (2 rikishi, 2 staff → loadFactor 0.25)
    const sB1 = makeStaff("sB1", "hB", { fatigue: 30, morale: 50 });
    const sB2 = makeStaff("sB2", "hB", { fatigue: 25, morale: 50 });
    const heyaB = makeMockHeya("hB", { staffIds: [sB1.id, sB2.id], rikishiIds: ["rB1", "rB2"] });

    const world = makeMockWorld({
      heyas: new Map([["hA", heyaA], ["hB", heyaB]]),
      staff: new Map([[sA.id, sA], [sB1.id, sB1], [sB2.id, sB2]]),
    }) as WorldState;

    const impact = phase01_week_staff(world);
    const updates = impact.entities?.staffUpdates!;

    // Heya A: overloaded → fatigue increases
    const uA = updates.get(sA.id);
    expect(uA!.fatigue).toBeGreaterThan(sA.fatigue);

    // Heya B: not overloaded → fatigue decreases
    const uB1 = updates.get(sB1.id);
    expect(uB1!.fatigue).toBeLessThan(sB1.fatigue);
  });
});
