import { describe, it, expect } from "vitest";
import { tickWeekTalentPool } from "@/engine/systems/generation/TalentPoolMaintenance";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { TalentPoolWorldState } from "@/engine/types/talent";
import type { Id } from "@/engine/types/common";

function buildWorldWithHiddenPool(opts: {
  activeCount: number;
  populationTarget: number;
  hiddenPerPool: number;
}): WorldState {
  const activeIds = new Set<string>();
  for (let i = 0; i < opts.activeCount; i++) activeIds.add(`r-${i}`);

  // Build talent pool with all candidates hidden, none visible
  const candidates: Record<string, ReturnType<typeof MockFactory.createCandidate>> = {};
  const hiddenHs: string[] = [];
  const hiddenUni: string[] = [];
  const hiddenFor: string[] = [];

  for (let i = 0; i < opts.hiddenPerPool; i++) {
    const cId = `cand-hs-${i}`;
    candidates[cId] = MockFactory.createCandidate(cId as Id, {
      candidateId: cId as Id,
      availabilityState: "available",
    });
    hiddenHs.push(cId);
  }
  for (let i = 0; i < opts.hiddenPerPool; i++) {
    const cId = `cand-uni-${i}`;
    candidates[cId] = MockFactory.createCandidate(cId as Id, {
      candidateId: cId as Id,
      availabilityState: "available",
    });
    hiddenUni.push(cId);
  }
  for (let i = 0; i < opts.hiddenPerPool; i++) {
    const cId = `cand-for-${i}`;
    candidates[cId] = MockFactory.createCandidate(cId as Id, {
      candidateId: cId as Id,
      availabilityState: "available",
    });
    hiddenFor.push(cId);
  }

  const pool: TalentPoolWorldState = MockFactory.createTalentPool({ candidates });
  pool.pools.high_school.candidatesVisible = [];
  pool.pools.high_school.candidatesHidden = hiddenHs;
  pool.pools.university.candidatesVisible = [];
  pool.pools.university.candidatesHidden = hiddenUni;
  pool.pools.foreign.candidatesVisible = [];
  pool.pools.foreign.candidatesHidden = hiddenFor;

  return MockFactory.createWorld({
    seed: "talent-supply-test",
    cyclePhase: "pre_basho",
    week: 10,
    dayIndexGlobal: 70,
    activeRikishiIds: activeIds,
    talentPool: pool,
    _populationTarget: opts.populationTarget,
  });
}

function countVisibleCandidates(world: WorldState): number {
  const tp = world.talentPool;
  if (!tp) return 0;
  let count = 0;
  for (const pt of ["high_school", "university", "foreign"] as const) {
    count += tp.pools[pt].candidatesVisible.length;
  }
  return count;
}

describe("tickWeekTalentPool — gap-aware supply", () => {
  it("reveals enough candidates to cover the gap when below target (above 700)", () => {
    // active=800, target=950 → gap=150. active > 700 so full-dump doesn't fire.
    // Baseline: 20-30 per pool × 3 = 60-90 max, which can't cover 150.
    // All candidates hidden. After tick, visible ≥ 150.
    const world = buildWorldWithHiddenPool({
      activeCount: 800,
      populationTarget: 950,
      hiddenPerPool: 200,
    });

    expect(world.activeRikishiIds.size).toBe(800);
    expect(countVisibleCandidates(world)).toBe(0);

    const impact = tickWeekTalentPool(world);
    const resolved = resolveImpacts(world, [impact]);

    const visible = countVisibleCandidates(resolved);
    expect(visible).toBeGreaterThanOrEqual(150);
  });

  it("still reveals at least 20-30 per pool when at target (baseline)", () => {
    const world = buildWorldWithHiddenPool({
      activeCount: 860,
      populationTarget: 860,
      hiddenPerPool: 100,
    });

    const impact = tickWeekTalentPool(world);
    const resolved = resolveImpacts(world, [impact]);

    // At target, gap=0, so baseline 20-30 per pool → at least 20*3=60
    expect(countVisibleCandidates(resolved)).toBeGreaterThanOrEqual(60);
  });
});
