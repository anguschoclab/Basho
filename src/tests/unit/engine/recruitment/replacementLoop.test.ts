/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { phase01_week_recruitment } from "@/engine/tick/phases/phase01_week_recruitment";
import { tickWeekTalentPool } from "@/engine/systems/generation/TalentPoolMaintenance";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { TalentPoolWorldState } from "@/engine/types/talent";
import type { Id } from "@/engine/types/common";

const POPULATION_TARGET = 60;
const HEYA_COUNT = 6; // 5 NPC + 1 player
const ATTRACTION_PER_CYCLE = 5; // active rikishi removed per cycle to simulate attrition
const CYCLES = 12;

function buildStabilityWorld(): WorldState {
  const heyas = new Map<Id, Heya>();
  const rikishi = new Map();
  const activeIds = new Set<string>();
  const oyakata = new Map();

  // Player heya first, then 5 NPC heyas
  for (let i = 0; i < HEYA_COUNT; i++) {
    const heyaId = `heya-${i}` as Id;
    const ids: string[] = [];
    // Distribute target across 5 NPC heyas (player excluded from auto-fill)
    const perHeya = i === 0 ? 0 : POPULATION_TARGET / (HEYA_COUNT - 1);
    for (let j = 0; j < perHeya; j++) {
      const rId = `${heyaId}-r${j}`;
      const r = MockFactory.createRikishi(rId, { heyaId });
      rikishi.set(rId, r);
      ids.push(rId);
      activeIds.add(rId);
    }
    const heya = MockFactory.createHeya(heyaId, {
      oyakataId: `oyakata-${heyaId}` as Id,
      rikishiIds: ids,
    });
    heyas.set(heyaId, heya);
    oyakata.set(heya.oyakataId, MockFactory.createOyakata(heya.oyakataId, { heyaId }));
  }

  // Build a large hidden candidate pool so supply never runs dry
  const candidates: Record<string, ReturnType<typeof MockFactory.createCandidate>> = {};
  const hiddenHs: string[] = [];
  const hiddenUni: string[] = [];
  const hiddenFor: string[] = [];

  for (let i = 0; i < 300; i++) {
    const cId = `cand-hs-${i}`;
    candidates[cId] = MockFactory.createCandidate(cId as Id, {
      candidateId: cId as Id,
      availabilityState: "available",
    });
    hiddenHs.push(cId);
  }
  for (let i = 0; i < 300; i++) {
    const cId = `cand-uni-${i}`;
    candidates[cId] = MockFactory.createCandidate(cId as Id, {
      candidateId: cId as Id,
      availabilityState: "available",
    });
    hiddenUni.push(cId);
  }
  for (let i = 0; i < 300; i++) {
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
    seed: "stability-test-seed",
    cyclePhase: "pre_basho",
    week: 1,
    dayIndexGlobal: 0,
    playerHeyaId: "heya-0" as Id,
    heyas,
    rikishi,
    activeRikishiIds: activeIds,
    oyakata,
    talentPool: pool,
    _populationTarget: POPULATION_TARGET,
  });
}

function simulateAttrition(world: WorldState, count: number): void {
  // Remove `count` active rikishi to simulate retirements.
  const ids = Array.from(world.activeRikishiIds);
  for (let i = 0; i < count && i < ids.length; i++) {
    const id = ids[i];
    world.activeRikishiIds.delete(id);
    const r = world.rikishi.get(id);
    if (r) {
      r.isRetired = true;
      // Remove from heya roster
      const heya = world.heyas.get(r.heyaId);
      if (heya) {
        heya.rikishiIds = (heya.rikishiIds || []).filter((rid) => rid !== id);
      }
    }
  }
}

describe("closed-loop population stability", () => {
  it("active population stays within ±10% of target across attrition cycles", () => {
    let world = buildStabilityWorld();
    const initialActive = world.activeRikishiIds.size;
    expect(initialActive).toBe(POPULATION_TARGET);

    for (let cycle = 0; cycle < CYCLES; cycle++) {
      // 1. Simulate attrition: remove K active rikishi
      simulateAttrition(world, ATTRACTION_PER_CYCLE);

      // 2. Reveal candidates via talent pool tick
      const tpImpact = tickWeekTalentPool(world);
      world = resolveImpacts(world, [tpImpact]);

      // 3. Run recruitment phase
      const recruitImpact = phase01_week_recruitment(world);
      world = resolveImpacts(world, [recruitImpact]);

      // 4. Advance week
      world = { ...world, week: world.week + 1, dayIndexGlobal: world.dayIndexGlobal + 7 };
    }

    const finalActive = world.activeRikishiIds.size;
    const lowerBound = POPULATION_TARGET * 0.9;
    const upperBound = POPULATION_TARGET * 1.1;

    expect(finalActive).toBeGreaterThanOrEqual(lowerBound);
    expect(finalActive).toBeLessThanOrEqual(upperBound);
  });

  it("is deterministic: same seed produces same final active count", () => {
    function runOnce(): number {
      let world = buildStabilityWorld();
      for (let cycle = 0; cycle < CYCLES; cycle++) {
        simulateAttrition(world, ATTRACTION_PER_CYCLE);
        const tpImpact = tickWeekTalentPool(world);
        world = resolveImpacts(world, [tpImpact]);
        const recruitImpact = phase01_week_recruitment(world);
        world = resolveImpacts(world, [recruitImpact]);
        world = { ...world, week: world.week + 1, dayIndexGlobal: world.dayIndexGlobal + 7 };
      }
      return world.activeRikishiIds.size;
    }

    const run1 = runOnce();
    const run2 = runOnce();
    expect(run1).toBe(run2);
  });
});
