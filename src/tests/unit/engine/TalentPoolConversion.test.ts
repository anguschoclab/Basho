import { describe, it, expect } from "vitest";
import { MockFactory } from "../../helpers/utils/MockFactory";
import { phase01_week_recruitment } from "@/engine/tick/phases/phase01_week_recruitment";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

describe("TalentPoolConversion", () => {
  it("should convert a signed candidate into a Rikishi during the recruitment phase", () => {
    const heyaId = "test-heya";
    const heya = MockFactory.createHeya(heyaId);
    const world = MockFactory.createWorld({
      heyas: new Map([[heyaId, heya]]),
      rikishi: new Map(),
      week: 1,
      year: 2025,
      cyclePhase: "interim",
    });

    const candidateId = "test-candidate";
    const candidate = MockFactory.createCandidate(candidateId, {
      personId: "test-person",
      name: "Future Sekitori",
      birthYear: 2005,
      nationality: "Japan",
      originRegion: "Tokyo",
      talentSeed: 500,
      availabilityState: "signed",
      competingSuitors: [{ heyaId, offerType: "standard", interestBand: "high", deadlineWeek: 1 }],
      archetype: "oshi",
      temperament: { discipline: 80, volatility: 20 },
    });

    const talentPool = MockFactory.createTalentPool({
      lastYearlyRefreshYear: 2024,
      candidates: { [candidateId]: candidate },
    });
    talentPool.pools.high_school.candidatesVisible = [candidateId];
    world.talentPool = talentPool;

    // Run the recruitment phase
    const impact = phase01_week_recruitment(world);
    const nextWorld = resolveImpacts(world, [impact]);

    // Verify candidate is removed from talent pool
    expect(nextWorld.talentPool?.candidates[candidateId]).toBeUndefined();
    expect(nextWorld.talentPool?.pools.high_school.candidatesVisible).not.toContain(candidateId);

    // Verify Rikishi is added to the world
    const rikishiId = candidate.personId;
    const rikishi = nextWorld.rikishi.get(rikishiId);
    expect(rikishi).toBeDefined();
    expect(rikishi?.shikona).toBe("Future Sekitori");
    expect(rikishi?.heyaId).toBe(heyaId);

    // Verify Heya roster is updated
    const updatedHeya = nextWorld.heyas.get(heyaId);
    expect(updatedHeya?.rikishiIds).toContain(rikishiId);
  });
});
