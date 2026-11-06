import { describe, it, expect } from "vitest";
import { phase01_week_recruitment } from "@/engine/tick/phases/phase01_week_recruitment";
import { allocateVacancies } from "@/engine/generation/RecruitmentController";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { TalentPoolWorldState } from "@/engine/types/talent";
import type { Id } from "@/engine/types/common";

const POPULATION_TARGET = 120;
const NPC_HEYAS = 5;
const ROSTER_PER_HEYA = 20; // >15 organic target, <30 backfill cap — the stall zone

/**
 * Steady-state world: every NPC stable sits at 20 rostered rikishi — above the
 * organic recruitment target (MAX_ROSTER_SIZE=15) but below the backfill cap
 * (TARGET_ROSTER_SIZE=30). The weekly NPC AI has therefore written
 * `shouldBid: false` into every heya's bid policy, exactly as it does in live
 * sims once rosters pass 15.
 */
function buildStallWorld(): WorldState {
  const heyas = new Map<Id, Heya>();
  const rikishi = new Map();
  const activeIds = new Set<string>();
  const oyakata = new Map();
  const npcBidPolicies: NonNullable<WorldState["npcBidPolicies"]> = {};

  for (let i = 0; i <= NPC_HEYAS; i++) {
    const heyaId = `heya-${i}` as Id;
    const ids: string[] = [];
    const count = i === 0 ? 0 : ROSTER_PER_HEYA;
    for (let j = 0; j < count; j++) {
      const rId = `${heyaId}-r${j}`;
      rikishi.set(rId, MockFactory.createRikishi(rId, { heyaId }));
      ids.push(rId);
      activeIds.add(rId);
    }
    const heya = MockFactory.createHeya(heyaId, {
      oyakataId: `oyakata-${heyaId}` as Id,
      rikishiIds: ids,
    });
    heyas.set(heyaId, heya);
    oyakata.set(heya.oyakataId, MockFactory.createOyakata(heya.oyakataId, { heyaId }));
    if (i > 0) {
      npcBidPolicies[heyaId] = {
        shouldBid: false,
        maxBid: 0,
        bidStrategy: "conservative",
      };
    }
  }

  const candidates: Record<string, ReturnType<typeof MockFactory.createCandidate>> = {};
  const visible: string[] = [];
  for (let i = 0; i < 300; i++) {
    const cId = `cand-${i}`;
    candidates[cId] = MockFactory.createCandidate(cId as Id, {
      candidateId: cId as Id,
      availabilityState: "available",
    });
    visible.push(cId);
  }
  const pool: TalentPoolWorldState = MockFactory.createTalentPool({ candidates });
  pool.pools.high_school.candidatesVisible = visible.slice(0, 100);
  pool.pools.university.candidatesVisible = visible.slice(100, 200);
  pool.pools.foreign.candidatesVisible = visible.slice(200);

  return MockFactory.createWorld({
    seed: "backfill-stall-seed",
    cyclePhase: "interim",
    week: 10,
    dayIndexGlobal: 70,
    playerHeyaId: "heya-0" as Id,
    heyas,
    rikishi,
    activeRikishiIds: activeIds,
    oyakata,
    talentPool: pool,
    npcBidPolicies,
    _populationTarget: POPULATION_TARGET,
  });
}

describe("backfill intake vs. organic bid policies", () => {
  it("weekly replacement backfill materializes recruits even when NPC policies say shouldBid=false", () => {
    let world = buildStallWorld();
    // Active = 100 (5 NPC heyas × 20), target = 120 → gap = 20
    expect(world.activeRikishiIds.size).toBe(100);

    const impact = phase01_week_recruitment(world);
    world = resolveImpacts(world, [impact]);

    // The demographic backfill must not be starved by organic "don't recruit"
    // policies — the gate exists for organic bidding, not system backfill.
    expect(world.activeRikishiIds.size).toBeGreaterThan(100);
  });

  it("allocateVacancies skips heyas under a recruitment freeze", () => {
    const world = buildStallWorld();
    const frozenId = "heya-1" as Id;
    const frozen = world.heyas.get(frozenId)!;
    const heyas = new Map(world.heyas);
    heyas.set(frozenId, {
      ...frozen,
      welfareState: {
        ...frozen.welfareState,
        sanctions: { recruitmentFreezeWeeks: 4 },
      },
    } as Heya);
    const frozenWorld = { ...world, heyas };

    const alloc = allocateVacancies(frozenWorld, 50);
    expect(alloc[frozenId]).toBeUndefined();
    expect(Object.values(alloc).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it("organic monthly fill still respects shouldBid=false", async () => {
    const { fillVacanciesForNPCWithBidding } = await import(
      "@/engine/generation/TalentPoolNPCRecruitment"
    );
    const world = buildStallWorld();
    // Direct organic call: every heya has a no-bid policy → zero bids → zero signings
    const impact = fillVacanciesForNPCWithBidding(world, {
      "heya-1": 5,
      "heya-2": 5,
    });
    const next = resolveImpacts(world, [impact]);
    expect(next.activeRikishiIds.size).toBe(100);
  });
});
