import { describe, it, expect } from "vitest";
import { getRecruitmentStrategy } from "@/engine/npcRecruitmentStrategy";
import { makeMockWorld, makeMockHeya } from "../utils";
import type { TalentCandidate } from "@/engine/types/talent";
import type { Oyakata } from "@/engine/types/oyakata";

// Six identical stables (same funds, same oyakata archetype/traits, same roster) bid on
// the same candidate. Under a TRUE-talent read every bid would be byte-identical (bids
// are a deterministic function of heya funds/roster + candidate talentSeed, and none of
// those differ between stables). Once bids are based on each stable's own noisy scouted
// ESTIMATE of the candidate (perceivedTalentSeed), identical stables diverge because the
// noise is seeded per-(heyaId, candidateId).
describe("bidding uses perceived (scouted) talent, not true talent", () => {
  const HEYA_IDS = ["h1", "h2", "h3", "h4", "h5", "h6"];

  function buildWorld() {
    const heyas = new Map(
      HEYA_IDS.map((id) => [id, makeMockHeya(id, { funds: 50_000_000, rikishiIds: [] })])
    );
    const candidate = {
      candidateId: "c1",
      talentSeed: 80,
    } as unknown as TalentCandidate;
    const world = makeMockWorld({
      heyas,
      rikishi: new Map(),
      talentPool: {
        version: "1.0.0",
        lastYearlyRefreshYear: 2025,
        candidates: { c1: candidate },
        pools: {} as never,
      },
    });
    return world;
  }

  function makeOyakata(heyaId: string): Oyakata {
    return {
      id: `oyakata-${heyaId}`,
      heyaId,
      name: `Oyakata-${heyaId}`,
      shikona: `Oyakata-${heyaId}`,
      age: 55,
      archetype: "traditionalist",
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
      yearsInCharge: 5,
    } as Oyakata;
  }

  it("identical stables produce different bids for the same candidate", () => {
    const world = buildWorld();
    const strategy = getRecruitmentStrategy("traditionalist");

    const bids = HEYA_IDS.map((heyaId) => {
      const heya = world.heyas.get(heyaId)!;
      const oyakata = makeOyakata(heyaId);
      return strategy.calculateMaxBid(world, heya, oyakata, "c1", undefined);
    });

    expect(new Set(bids).size).toBeGreaterThan(1);
  });

  it("is deterministic: the same stable bids the same amount every time", () => {
    const world = buildWorld();
    const strategy = getRecruitmentStrategy("traditionalist");
    const heya = world.heyas.get("h1")!;
    const oyakata = makeOyakata("h1");

    const bid1 = strategy.calculateMaxBid(world, heya, oyakata, "c1", undefined);
    const bid2 = strategy.calculateMaxBid(world, heya, oyakata, "c1", undefined);

    expect(bid1).toBe(bid2);
  });
});
