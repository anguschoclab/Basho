import { describe, it, expect } from "vitest";
import { recruitmentBalanceMultiplier } from "@/engine/systems/generation/competitiveBalance";
import { fillVacanciesForNPCWithBidding } from "@/engine/systems/generation/TalentPoolNPCRecruitment";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import type { TalentPoolWorldState, TalentCandidate, TalentPoolState } from "@/engine/types/talent";
import type { Oyakata } from "@/engine/types/oyakata";

describe("balanced bidding ordering", () => {
  it("weak stable's effective bid can overtake a strong stable's after the handicap", () => {
    const heyas = new Map();
    const rikishi = new Map();
    const strongIds: string[] = [];
    for (let i = 0; i < 8; i++) {
      const r = mockRikishi(`strong-s${i}`, { heyaId: "strong", division: "makuuchi" });
      rikishi.set(r.id, r); strongIds.push(r.id);
    }
    heyas.set("strong", makeMockHeya("strong", { rikishiIds: strongIds }));
    heyas.set("weak", makeMockHeya("weak", { rikishiIds: [] }));
    const world = makeMockWorld({ heyas, rikishi });

    const rawStrongBid = 10_000_000;
    const rawWeakBid = 7_000_000;
    const effStrong = rawStrongBid * recruitmentBalanceMultiplier(world, "strong");
    const effWeak = rawWeakBid * recruitmentBalanceMultiplier(world, "weak");
    expect(effWeak).toBeGreaterThan(effStrong);
  });

  it("fillVacanciesForNPCWithBidding assigns top candidate to weak stable over strong stable after handicap", () => {
    // --- heyas ---
    // Strong stable: 8 sekitori (makuuchi) + lots of funds → gets a handicap < 1
    // Weak stable:   0 sekitori + modest funds → gets a boost > 1
    // Despite the strong stable having more raw funds, the handicap means the
    // weak stable's effective bid wins the single available candidate.

    const strongIds: string[] = [];
    const rikishiMap = new Map();
    for (let i = 0; i < 8; i++) {
      const r = mockRikishi(`strong-s${i}`, { heyaId: "strong", division: "makuuchi" });
      rikishiMap.set(r.id, r);
      strongIds.push(r.id);
    }

    const heyas = new Map();
    // Strong: 50M funds, 8 makuuchi wrestlers
    heyas.set(
      "strong",
      makeMockHeya("strong", { rikishiIds: strongIds, funds: 50_000_000, oyakataId: "oya-strong" })
    );
    // Weak: 5M funds, 0 wrestlers
    heyas.set(
      "weak",
      makeMockHeya("weak", { rikishiIds: [], funds: 5_000_000, oyakataId: "oya-weak" })
    );

    // --- oyakata (minimal, no traits that spike the bid) ---
    const makeOyakata = (id: string, heyaId: string): Oyakata => ({
      id,
      heyaId,
      name: `Master-${id}`,
      shikona: `Shikona-${id}`,
      age: 50,
      archetype: "traditionalist",
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
      yearsInCharge: 5,
    });
    const oyakata = new Map<string, Oyakata>();
    oyakata.set("oya-strong", makeOyakata("oya-strong", "strong"));
    oyakata.set("oya-weak", makeOyakata("oya-weak", "weak"));

    // --- single visible candidate ---
    const candidate: TalentCandidate = {
      candidateId: "cand-1",
      personId: "person-1",
      name: "Test Taro",
      birthYear: 2007,
      originRegion: "JP",
      nationality: "JP",
      visibilityBand: "public",
      reputationSeed: 0.8,
      tags: [],
      availabilityState: "available",
      competingSuitors: [],
      archetype: "hybrid",
      style: "oshi",
      heightPotentialCm: 180,
      weightPotentialKg: 140,
      talentSeed: 85,
      temperament: { discipline: 70, volatility: 20 },
      combatProfile: {
        archetype: "hybrid",
        familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
        preferredGrip: "none",
        preferredGripDepth: "standard",
        statModifiers: {},
      },
    };

    const poolState: TalentPoolState = {
      poolId: "pool-hs",
      poolType: "high_school",
      refreshCadence: "yearly",
      populationCap: 10,
      hiddenReserveCap: 5,
      candidatesVisible: ["cand-1"],
      candidatesHidden: [],
      lastRefreshWeek: 1,
      scarcityBand: "normal",
      qualityBand: "normal",
    };

    const emptyPool: TalentPoolState = {
      poolId: "pool-empty",
      poolType: "university",
      refreshCadence: "yearly",
      populationCap: 10,
      hiddenReserveCap: 5,
      candidatesVisible: [],
      candidatesHidden: [],
      lastRefreshWeek: 1,
      scarcityBand: "normal",
      qualityBand: "normal",
    };

    const talentPool: TalentPoolWorldState = {
      version: "1.0.0",
      lastYearlyRefreshYear: 2025,
      candidates: { "cand-1": candidate },
      pools: {
        high_school: poolState,
        university: { ...emptyPool, poolId: "pool-uni", poolType: "university" },
        foreign: { ...emptyPool, poolId: "pool-for", poolType: "foreign" },
      },
    };

    const world = makeMockWorld({ heyas, rikishi: rikishiMap, oyakata, talentPool });

    // Both stables want 1 vacancy
    const targetHeyas = { strong: 1, weak: 1 };
    const impact = fillVacanciesForNPCWithBidding(world, targetHeyas);

    // The materialized rikishi should have heyaId === "weak" (weak stable wins the bid)
    const materialized = impact.collections?.rikishiToAdd ?? [];
    expect(materialized).toHaveLength(1);
    expect(materialized[0].heyaId).toBe("weak");
  });
});
