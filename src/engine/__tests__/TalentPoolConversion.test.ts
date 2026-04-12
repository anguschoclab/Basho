import { describe, it, expect, vi } from "vitest";
import { makeMockWorld, makeMockHeya } from "./utils";
import { phase01_week_recruitment } from "../tick/phases/phase01_week_recruitment";
import { resolveImpacts } from "../core/ImpactResolver";
import { WorldState } from "../types/world";
import { TalentCandidate } from "../types/talent";

describe("TalentPoolConversion", () => {
  it("should convert a signed candidate into a Rikishi during the recruitment phase", () => {
    const heyaId = "test-heya";
    const heya = makeMockHeya(heyaId);
    const world = makeMockWorld({
      heyas: new Map([[heyaId, heya]]),
      rikishi: new Map(),
      week: 1,
      year: 2025,
      cyclePhase: "interim",
    });

    const candidateId = "test-candidate";
    const candidate: any = {
      candidateId,
      personId: "test-person",
      name: "Future Sekitori",
      birthYear: 2005,
      nationality: "Japan",
      originRegion: "Tokyo",
      talentSeed: 500,
      availabilityState: "signed",
      competingSuitors: [{ heyaId, offerType: "standard", interestBand: "high", deadlineWeek: 1 }],
      combatProfile: {
        archetype: "oshi",
        statModifiers: {},
      },
      archetype: "oshi",
      temperament: { discipline: 80, volatility: 20 },
    };

    world.talentPool = {
      version: "1.0.0",
      lastYearlyRefreshYear: 2024,
      candidates: { [candidateId]: candidate },
      pools: {
        high_school: {
          poolId: "pool-1",
          poolType: "high_school",
          candidatesVisible: [candidateId],
          candidatesHidden: [],
          refreshCadence: "basho",
          populationCap: 20,
          hiddenReserveCap: 50,
          lastRefreshWeek: 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
        university: {
          poolId: "pool-2",
          poolType: "university",
          candidatesVisible: [],
          candidatesHidden: [],
          refreshCadence: "basho",
          populationCap: 20,
          hiddenReserveCap: 50,
          lastRefreshWeek: 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
        foreign: {
          poolId: "pool-3",
          poolType: "foreign",
          candidatesVisible: [],
          candidatesHidden: [],
          refreshCadence: "basho",
          populationCap: 20,
          hiddenReserveCap: 50,
          lastRefreshWeek: 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
      },
    };

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
