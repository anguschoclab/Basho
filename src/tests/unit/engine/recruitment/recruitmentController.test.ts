import { describe, it, expect } from "vitest";
import { computeReplacementGap } from "@/engine/systems/generation/RecruitmentController";
import { makeMockWorld } from "../utils";
import type { WorldState } from "@/engine/types/world";

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
