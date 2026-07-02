import { describe, it, expect } from "vitest";
import {
  computeReplacementGap,
  allocateVacancies,
} from "@/engine/systems/generation/RecruitmentController";
import { makeMockWorld, makeMockHeya } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import { TARGET_ROSTER_SIZE, TOTAL_ACTIVE_THRESHOLD } from "@/constants/engine/recruitmentExtended";

describe("computeReplacementGap", () => {
  it("returns target - active when active is below target", () => {
    const world = makeMockWorld({ _populationTarget: 100 } as Partial<WorldState>);
    // makeMockWorld defaults activeRikishiIds to sync with rikishi map (empty → 0 active)
    expect(computeReplacementGap(world)).toBe(100);
  });

  it("returns 0 when active is at target", () => {
    const world = makeMockWorld({ _populationTarget: 0 } as Partial<WorldState>);
    expect(computeReplacementGap(world)).toBe(0);
  });

  it("returns 0 when active is above target", () => {
    const world = makeMockWorld({ _populationTarget: 5 } as Partial<WorldState>);
    // 0 active, target 5 → gap 5; add 10 active to exceed
    const activeIds = new Set<string>();
    for (let i = 0; i < 10; i++) activeIds.add(`r-${i}`);
    world.activeRikishiIds = activeIds;
    expect(computeReplacementGap(world)).toBe(0);
  });

  it("returns 0 when target is unset", () => {
    const world = makeMockWorld();
    expect(computeReplacementGap(world)).toBe(0);
  });
});

describe("allocateVacancies", () => {
  function buildWorld(
    heyaRosters: Array<{ id: string; rosterSize: number; sanctioned?: boolean }>,
    playerHeyaId?: string
  ): WorldState {
    const heyas = new Map<string, Heya>();
    for (const h of heyaRosters) {
      const ids: string[] = [];
      for (let i = 0; i < h.rosterSize; i++) ids.push(`${h.id}-r${i}`);
      heyas.set(
        h.id,
        makeMockHeya(h.id, {
          rikishiIds: ids,
          welfareState: h.sanctioned
            ? {
                welfareRisk: 50,
                activeDiet: "maintenance",
                complianceState: "sanctioned",
                weeksInState: 1,
                lastReviewedWeek: 0,
              }
            : {
                welfareRisk: 10,
                activeDiet: "maintenance",
                complianceState: "compliant",
                weeksInState: 0,
                lastReviewedWeek: 0,
              },
        })
      );
    }
    return makeMockWorld({ heyas, playerHeyaId } as Partial<WorldState>);
  }

  it("excludes the player heya from allocation", () => {
    const world = buildWorld(
      [
        { id: "player", rosterSize: 10 },
        { id: "npc-a", rosterSize: 10 },
      ],
      "player"
    );
    const vacancies = allocateVacancies(world, 20);
    expect(vacancies["player"]).toBeUndefined();
    expect(vacancies["npc-a"]).toBeGreaterThan(0);
  });

  it("excludes sanctioned heyas", () => {
    const world = buildWorld(
      [
        { id: "npc-a", rosterSize: 10 },
        { id: "npc-b", rosterSize: 10, sanctioned: true },
      ],
      "player-x"
    );
    const vacancies = allocateVacancies(world, 20);
    expect(vacancies["npc-b"]).toBeUndefined();
    expect(vacancies["npc-a"]).toBeGreaterThan(0);
  });

  it("sums to min(gap, total headroom) and never exceeds per-heya headroom", () => {
    // TARGET_ROSTER_SIZE = 30; npc-a has 10 (headroom 20), npc-b has 25 (headroom 5)
    const world = buildWorld(
      [
        { id: "npc-a", rosterSize: 10 },
        { id: "npc-b", rosterSize: 25 },
      ],
      "player-x"
    );
    const vacancies = allocateVacancies(world, 50);
    const total = (Object.values(vacancies) as number[]).reduce((a, b) => a + b, 0);
    // total headroom = 20 + 5 = 25, gap 50 → capped at 25
    expect(total).toBe(25);
    expect(vacancies["npc-a"]).toBeLessThanOrEqual(20);
    expect(vacancies["npc-b"]).toBeLessThanOrEqual(5);
  });

  it("gives more vacancies to the most-depleted stable (deterministic)", () => {
    // npc-a: 5 active (headroom 25), npc-b: 20 active (headroom 10)
    const world = buildWorld(
      [
        { id: "npc-a", rosterSize: 5 },
        { id: "npc-b", rosterSize: 20 },
      ],
      "player-x"
    );
    const vacancies = allocateVacancies(world, 10);
    // npc-a has 2.5× the headroom of npc-b → should get more
    expect(vacancies["npc-a"]).toBeGreaterThan(vacancies["npc-b"]);
    // Deterministic: same input → same output
    const vacancies2 = allocateVacancies(world, 10);
    expect(vacancies2).toEqual(vacancies);
  });

  it("returns empty when gap is 0", () => {
    const world = buildWorld([{ id: "npc-a", rosterSize: 10 }], "player-x");
    const vacancies = allocateVacancies(world, 0);
    expect(Object.keys(vacancies).length).toBe(0);
  });

  it("returns empty when all stables are at target", () => {
    const world = buildWorld(
      [
        { id: "npc-a", rosterSize: 30 },
        { id: "npc-b", rosterSize: 30 },
      ],
      "player-x"
    );
    const vacancies = allocateVacancies(world, 10);
    expect(Object.keys(vacancies).length).toBe(0);
  });
});

describe("roster constants equilibrium invariant", () => {
  it("TARGET_ROSTER_SIZE >= ceil(1084 / 45) ≈ 25", () => {
    expect(TARGET_ROSTER_SIZE).toBeGreaterThanOrEqual(Math.ceil(1084 / 45));
  });

  it("TOTAL_ACTIVE_THRESHOLD is in (600, 1084)", () => {
    expect(TOTAL_ACTIVE_THRESHOLD).toBeGreaterThan(600);
    expect(TOTAL_ACTIVE_THRESHOLD).toBeLessThan(1084);
  });
});
