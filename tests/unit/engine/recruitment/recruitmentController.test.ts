import { describe, it, expect } from "vitest";
import {
  computeReplacementGap,
  allocateVacancies,
} from "@/engine/generation/RecruitmentController";
import { HEYA_ROSTER_TARGETS } from "@/constants/engine/generation";
import { TOTAL_ACTIVE_THRESHOLD } from "@/constants/engine/recruitmentExtended";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

// Test stables get explicit per-heya targets — the controller sums
// `heya.rosterTarget`, not a flat constant.
const TARGET_A = 20;
const TARGET_B = 10;

function targetedHeya(
  id: string,
  target: number,
  overrides?: Partial<Heya>
): Heya {
  return makeMockHeya(id, { rosterTarget: target, ...overrides });
}

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

  it("sums per-heya roster targets — a new stable raises the floor by its own target", () => {
    const heyas = new Map<string, Heya>();
    heyas.set("npc-a", targetedHeya("npc-a", TARGET_A));
    heyas.set("npc-b", targetedHeya("npc-b", TARGET_B));
    const world = makeMockWorld({ heyas, playerHeyaId: "player-x" } as Partial<WorldState>);

    // 20 + 10 = 30 target, 0 active → gap 30
    expect(computeReplacementGap(world)).toBe(30);

    // A just-founded stable joins with its own (small) target → floor +8
    const grown = new Map(world.heyas);
    grown.set("npc-new", targetedHeya("npc-new", 8));
    world.heyas = grown;
    expect(computeReplacementGap(world)).toBe(38);
  });

  it("a merger drops the floor by the departed stable's target", () => {
    const heyas = new Map<string, Heya>();
    heyas.set("npc-a", targetedHeya("npc-a", TARGET_A));
    heyas.set("npc-b", targetedHeya("npc-b", TARGET_B));
    heyas.set("npc-c", targetedHeya("npc-c", 6));
    const world = makeMockWorld({ heyas, playerHeyaId: "player-x" } as Partial<WorldState>);
    expect(computeReplacementGap(world)).toBe(36);

    const shrunk = new Map(world.heyas);
    shrunk.delete("npc-c");
    world.heyas = shrunk;
    expect(computeReplacementGap(world)).toBe(30);
  });

  it("counts sanctioned heyas toward the target (slots exist even when unreachable)", () => {
    const heyas = new Map<string, Heya>();
    heyas.set("npc-a", targetedHeya("npc-a", TARGET_A));
    heyas.set(
      "npc-sanc",
      targetedHeya("npc-sanc", TARGET_B, {
        welfareState: {
          welfareRisk: 90,
          activeDiet: "maintenance",
          complianceState: "sanctioned",
          weeksInState: 20,
          lastReviewedWeek: 0,
        },
      })
    );
    const world = makeMockWorld({ heyas, playerHeyaId: "player-x" } as Partial<WorldState>);
    expect(computeReplacementGap(world)).toBe(30);
  });

  it("excludes the player heya from the target", () => {
    const heyas = new Map<string, Heya>();
    heyas.set("player", targetedHeya("player", 30));
    heyas.set("npc-a", targetedHeya("npc-a", TARGET_A));
    const world = makeMockWorld({ heyas, playerHeyaId: "player" } as Partial<WorldState>);
    expect(computeReplacementGap(world)).toBe(20);
  });
});

describe("allocateVacancies", () => {
  function buildWorld(
    heyaRosters: Array<{ id: string; rosterSize: number; target?: number; sanctioned?: boolean }>,
    playerHeyaId?: string
  ): WorldState {
    const heyas = new Map<string, Heya>();
    for (const h of heyaRosters) {
      const ids: string[] = [];
      for (let i = 0; i < h.rosterSize; i++) ids.push(`${h.id}-r${i}`);
      heyas.set(
        h.id,
        makeMockHeya(h.id, {
          rosterTarget: h.target ?? TARGET_A,
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
    // npc-a target 20, roster 10 → headroom 10; npc-b target 10, roster 9 → headroom 1
    const world = buildWorld(
      [
        { id: "npc-a", rosterSize: 10, target: 20 },
        { id: "npc-b", rosterSize: 9, target: 10 },
      ],
      "player-x"
    );
    const vacancies = allocateVacancies(world, 50);
    const total = (Object.values(vacancies) as number[]).reduce((a, b) => a + b, 0);
    expect(total).toBe(11);
    expect(vacancies["npc-a"]).toBeLessThanOrEqual(10);
    expect(vacancies["npc-b"]).toBeLessThanOrEqual(1);
  });

  it("allocates by per-heya headroom, not a flat ceiling", () => {
    // Same roster size, different targets: the growth-target stable gets the
    // larger share even though a flat cap would treat them identically.
    const world = buildWorld(
      [
        { id: "npc-big", rosterSize: 8, target: 30 }, // headroom 22
        { id: "npc-small", rosterSize: 8, target: 12 }, // headroom 4
      ],
      "player-x"
    );
    const vacancies = allocateVacancies(world, 10);
    expect(vacancies["npc-big"]).toBeGreaterThan(vacancies["npc-small"]);
  });

  it("gives more vacancies to the most-depleted stable (deterministic)", () => {
    // npc-a: 5 active (headroom 15), npc-b: 15 active (headroom 5) — same target
    const world = buildWorld(
      [
        { id: "npc-a", rosterSize: 5, target: TARGET_A },
        { id: "npc-b", rosterSize: 15, target: TARGET_A },
      ],
      "player-x"
    );
    const vacancies = allocateVacancies(world, 10);
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
        { id: "npc-a", rosterSize: 20, target: TARGET_A },
        { id: "npc-b", rosterSize: 20, target: TARGET_A },
      ],
      "player-x"
    );
    const vacancies = allocateVacancies(world, 10);
    expect(Object.keys(vacancies).length).toBe(0);
  });
});

describe("roster constants equilibrium invariant", () => {
  it("per-heya targets sum near the real ~590 population", () => {
    const total = Object.values(HEYA_ROSTER_TARGETS).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(580);
    expect(total).toBeLessThanOrEqual(610);
  });

  it("TOTAL_ACTIVE_THRESHOLD sits below the NPC equilibrium floor", () => {
    // The emergency dump must only fire if the controller itself fails —
    // well under the ~585 NPC-stable target (genesis Σ minus any one stable).
    expect(TOTAL_ACTIVE_THRESHOLD).toBeGreaterThan(300);
    expect(TOTAL_ACTIVE_THRESHOLD).toBeLessThan(550);
  });
});
