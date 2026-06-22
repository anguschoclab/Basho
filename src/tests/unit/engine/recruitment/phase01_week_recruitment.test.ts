/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { phase01_week_recruitment } from "@/engine/tick/phases/phase01_week_recruitment";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Id } from "@/engine/types/common";
import type { TalentPoolWorldState } from "@/engine/types/talent";

function buildWorldWithPool(opts: {
  activeCount: number;
  populationTarget: number;
  visibleCandidates: number;
  heyaCount?: number;
  rosterSize?: number;
}): WorldState {
  const heyaCount = opts.heyaCount ?? 3;
  const rosterSize = opts.rosterSize ?? 10;
  const heyas = new Map<Id, Heya>();
  const rikishi = new Map();
  const activeIds = new Set<string>();

  // Player heya is first; NPC heyas follow
  for (let i = 0; i < heyaCount; i++) {
    const heyaId = `heya-${i}` as Id;
    const ids: string[] = [];
    for (let j = 0; j < rosterSize; j++) {
      const rId = `${heyaId}-r${j}`;
      const r = MockFactory.createRikishi(rId, { heyaId });
      rikishi.set(rId, r);
      ids.push(rId);
      activeIds.add(rId);
    }
    heyas.set(
      heyaId,
      MockFactory.createHeya(heyaId, {
        oyakataId: `oyakata-${heyaId}` as Id,
        rikishiIds: ids,
      })
    );
  }

  // Add extra active rikishi to reach activeCount (assigned to npc heya-1)
  const npcHeya = heyas.get("heya-1")!;
  while (activeIds.size < opts.activeCount) {
    const rId = `extra-r-${activeIds.size}`;
    const r = MockFactory.createRikishi(rId, { heyaId: "heya-1" as Id });
    rikishi.set(rId, r);
    activeIds.add(rId);
    (npcHeya.rikishiIds as string[]).push(rId);
  }

  // Oyakata for each heya
  const oyakata = new Map();
  for (const heya of heyas.values()) {
    oyakata.set(heya.oyakataId, MockFactory.createOyakata(heya.oyakataId, { heyaId: heya.id }));
  }

  // Build talent pool with visible available candidates
  const candidates: Record<string, ReturnType<typeof MockFactory.createCandidate>> = {};
  const visibleIds: string[] = [];
  for (let i = 0; i < opts.visibleCandidates; i++) {
    const cId = `cand-${i}`;
    candidates[cId] = MockFactory.createCandidate(cId as Id, {
      candidateId: cId as Id,
      availabilityState: "available",
    });
    visibleIds.push(cId);
  }

  const pool: TalentPoolWorldState = MockFactory.createTalentPool({
    candidates,
  });
  pool.pools.high_school.candidatesVisible = visibleIds;

  return MockFactory.createWorld({
    seed: "phase01-recruit-test",
    cyclePhase: "pre_basho",
    week: 10,
    dayIndexGlobal: 70,
    playerHeyaId: "heya-0" as Id,
    heyas,
    rikishi,
    activeRikishiIds: activeIds,
    oyakata,
    talentPool: pool,
    _populationTarget: opts.populationTarget,
    _interimDaysRemaining: 0,
  });
}

describe("phase01_week_recruitment — controller-driven replacement", () => {
  it("recruits outside interim when active < _populationTarget (above 800)", () => {
    // active=900, target=1000, above TOTAL_ACTIVE_THRESHOLD(800), not interim
    const world = buildWorldWithPool({
      activeCount: 900,
      populationTarget: 1000,
      visibleCandidates: 50,
      heyaCount: 3,
      rosterSize: 10,
    });

    const before = world.activeRikishiIds.size;
    expect(before).toBe(900);
    expect(world.cyclePhase).toBe("pre_basho");

    const impact = phase01_week_recruitment(world);
    const resolved = resolveImpacts(world, [impact]);

    expect(resolved.activeRikishiIds.size).toBeGreaterThan(before);
  });

  it("does not recruit when active === _populationTarget", () => {
    const world = buildWorldWithPool({
      activeCount: 1000,
      populationTarget: 1000,
      visibleCandidates: 50,
      heyaCount: 3,
      rosterSize: 10,
    });

    const before = world.activeRikishiIds.size;
    const impact = phase01_week_recruitment(world);
    const resolved = resolveImpacts(world, [impact]);

    // Active should not grow from NPC auto-fill (mentor loop may run but no new rikishi)
    expect(resolved.activeRikishiIds.size).toBe(before);
  });
});
