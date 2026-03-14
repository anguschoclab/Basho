/**
 * talentpool.test.ts
 * Tests for the scouting and talent pool generation system
 */

import { describe, it, expect } from "vitest";
import {
  ensureTalentPools,
  refreshYearlyCohort,
  listVisibleCandidates,
  getCandidate,
  scoutPool,
  scoutCandidate,
  canSignCandidate,
  offerCandidate,
  getForeignCountInHeya,
  FOREIGN_RIKISHI_LIMIT_PER_HEYA,
  reinjectToTalentPool,
  retireStaleCandidates,
} from "../talentpool";
import {
  calculateScoutingLevel,
  getConfidenceFromLevel,
  getConfidenceLevel,
  getEstimatedValue,
  createScoutedView,
  recordObservation,
  type ScoutedRikishi,
} from "../scouting";
import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Oyakata } from "../types/oyakata";
import type { TalentCandidate } from "../types/talent";

// ============================================================================
// TEST HELPERS
// ============================================================================

function makeWorld(overrides: Partial<any> = {}): WorldState {
  const heya: Heya = {
    id: "player-heya",
    name: "Player Heya",
    oyakataId: "oyakata1",
    rikishiIds: ["r1"],
    statureBand: "established",
    prestigeBand: "respected",
    facilitiesBand: "adequate",
    koenkaiBand: "moderate",
    runwayBand: "comfortable",
    reputation: 60,
    funds: 10_000_000,
    scandalScore: 0,
    governanceStatus: "good_standing",
    facilities: { training: 50, recovery: 50, nutrition: 50 },
    riskIndicators: { financial: false, governance: false, rivalry: false },
  } as Heya;

  const oyakata: Oyakata = {
    id: "oyakata1",
    heyaId: "player-heya",
    name: "Test Oyakata",
    age: 55,
    archetype: "traditionalist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    yearsInCharge: 10,
  } as Oyakata;

  const rikishiMap = new Map([
    ["r1", {
      id: "r1",
      shikona: "TestRikishi",
      rank: "maegashira",
      division: "makuuchi",
      side: "east",
      heyaId: "player-heya",
      nationality: "Japan",
      height: 180,
      weight: 130,
      power: 60,
      speed: 55,
      balance: 65,
      technique: 58,
      aggression: 50,
      experience: 40,
      fatigue: 10,
      injured: false,
      isRetired: false,
    }],
  ]);

  return {
    seed: 42,
    year: 2024,
    week: 10,
    dayIndexGlobal: 70,
    calendar: { year: 2024, month: 3, currentDay: 15, currentWeek: 10 },
    cyclePhase: "interim",
    currentBashoName: "haru",
    currentBasho: null,
    rikishi: rikishiMap,
    heyas: new Map([["player-heya", heya]]),
    oyakata: new Map([["oyakata1", oyakata]]),
    playerHeyaId: "player-heya",
    events: { version: "1.0.0", log: [], dedupe: {} },
    rivalriesState: { pairs: [], lastUpdatedWeek: 0, nextRivalryId: 1 },
    ...overrides,
  } as unknown as WorldState;
}

// ============================================================================
// TALENT POOL INITIALIZATION
// ============================================================================

describe("Talent Pool: Initialization", () => {
  it("should create talent pools on first access", () => {
    const world = makeWorld();
    const tp = ensureTalentPools(world);

    expect(tp).toBeDefined();
    expect(tp.version).toBe("1.0.0");
    expect(tp.pools.high_school).toBeDefined();
    expect(tp.pools.university).toBeDefined();
    expect(tp.pools.foreign).toBeDefined();
  });

  it("should generate candidates on initialization", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const candidates = Object.values((world as any).talentPool.candidates);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it("should be deterministic with same seed", () => {
    const world1 = makeWorld({ seed: 123 });
    const world2 = makeWorld({ seed: 123 });

    ensureTalentPools(world1);
    ensureTalentPools(world2);

    const c1 = Object.keys((world1 as any).talentPool.candidates).sort();
    const c2 = Object.keys((world2 as any).talentPool.candidates).sort();

    expect(c1).toEqual(c2);
  });

  it("should produce different candidates for different seeds", () => {
    const world1 = makeWorld({ seed: 100 });
    const world2 = makeWorld({ seed: 200 });

    ensureTalentPools(world1);
    ensureTalentPools(world2);

    const c1 = Object.keys((world1 as any).talentPool.candidates);
    const c2 = Object.keys((world2 as any).talentPool.candidates);

    // Candidate IDs should differ
    expect(c1[0]).not.toBe(c2[0]);
  });
});

// ============================================================================
// CANDIDATE GENERATION
// ============================================================================

describe("Talent Pool: Candidate Properties", () => {
  it("should generate candidates with valid archetypes", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const candidates = Object.values((world as any).talentPool.candidates) as TalentCandidate[];
    const validArchetypes = [
      "oshi_specialist", "yotsu_specialist", "speedster", "trickster",
      "all_rounder", "hybrid_oshi_yotsu", "counter_specialist"
    ];

    for (const c of candidates.slice(0, 10)) {
      expect(validArchetypes).toContain(c.archetype);
    }
  });

  it("should set style consistent with archetype", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const candidates = Object.values((world as any).talentPool.candidates) as TalentCandidate[];

    for (const c of candidates.slice(0, 10)) {
      if (c.archetype.includes("oshi")) expect(c.style).toBe("oshi");
      else if (c.archetype.includes("yotsu")) expect(c.style).toBe("yotsu");
      else expect(c.style).toBe("hybrid");
    }
  });

  it("should generate talentSeed within valid range", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const candidates = Object.values((world as any).talentPool.candidates) as TalentCandidate[];
    for (const c of candidates) {
      expect(c.talentSeed).toBeGreaterThanOrEqual(10);
      expect(c.talentSeed).toBeLessThanOrEqual(100);
    }
  });

  it("should generate foreign candidates from foreign regions", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const tp = (world as any).talentPool;
    const foreignPool = tp.pools.foreign;
    const foreignIds = [...foreignPool.candidatesVisible, ...foreignPool.candidatesHidden];

    for (const id of foreignIds.slice(0, 5)) {
      const c = tp.candidates[id] as TalentCandidate;
      if (c) expect(c.nationality).not.toBe("Japan");
    }
  });
});

// ============================================================================
// LISTING & VISIBILITY
// ============================================================================

describe("Talent Pool: Visibility", () => {
  it("should list visible candidates", () => {
    const world = makeWorld();
    const visible = listVisibleCandidates(world, "high_school");

    expect(Array.isArray(visible)).toBe(true);
    // Should have some visible (public/rumored) candidates
  });

  it("should retrieve specific candidate by ID", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const tp = (world as any).talentPool;
    const firstId = Object.keys(tp.candidates)[0];
    const candidate = getCandidate(world, firstId);

    expect(candidate).toBeDefined();
    expect(candidate?.candidateId).toBe(firstId);
  });

  it("should return null for unknown candidate", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const candidate = getCandidate(world, "nonexistent-id");
    expect(candidate).toBeNull();
  });
});

// ============================================================================
// SCOUTING MECHANICS
// ============================================================================

describe("Talent Pool: Scouting", () => {
  it("should reveal hidden candidates when scouting a pool", () => {
    const world = makeWorld({ funds: 10_000_000 });

    const result = scoutPool(world, "high_school", { revealCount: 2 });

    expect(result.revealed.length).toBeGreaterThanOrEqual(0);
    expect(result.spent).toBeGreaterThan(0);
  });

  it("should deduct scouting cost from heya funds", () => {
    const world = makeWorld();
    const initialFunds = world.heyas.get("player-heya")!.funds;

    scoutPool(world, "high_school", { cost: 100_000 });

    expect(world.heyas.get("player-heya")!.funds).toBe(initialFunds - 100_000);
  });

  it("should fail scouting if funds insufficient", () => {
    const world = makeWorld();
    world.heyas.get("player-heya")!.funds = 0;

    const result = scoutPool(world, "high_school", { cost: 100_000 });

    expect(result.revealed.length).toBe(0);
    expect(result.spent).toBe(0);
  });

  it("should increase scouting level on individual candidate", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const tp = (world as any).talentPool;
    const firstId = Object.keys(tp.candidates)[0];

    const result = scoutCandidate(world, firstId, { effort: 2, cost: 50_000 });

    expect(result.ok).toBe(true);
    expect(result.scoutingLevel).toBeGreaterThan(0);
  });
});

// ============================================================================
// FOG OF WAR: SCOUTING SYSTEM
// ============================================================================

describe("Scouting: Confidence Levels", () => {
  it("should return 100 scouting level for owned rikishi", () => {
    expect(calculateScoutingLevel(true, 0, "none")).toBe(100);
  });

  it("should calculate level from observations and investment", () => {
    expect(calculateScoutingLevel(false, 0, "none")).toBe(0);
    expect(calculateScoutingLevel(false, 5, "none")).toBe(10);
    expect(calculateScoutingLevel(false, 5, "standard")).toBe(50);
    expect(calculateScoutingLevel(false, 15, "deep")).toBe(90);
  });

  it("should cap scouting level based on observations", () => {
    // The calculateScoutingLevel caps passive base at 30, deep adds 60, total 90.
    // It doesn't reach 100 unless owned.
    expect(calculateScoutingLevel(false, 100, "deep")).toBeLessThanOrEqual(100);
    expect(calculateScoutingLevel(false, 100, "deep")).toBe(90);
  });

  it("should map levels to confidence bands correctly", () => {
    expect(getConfidenceFromLevel(0)).toBe("unknown");
    expect(getConfidenceFromLevel(15)).toBe("low");
    expect(getConfidenceFromLevel(40)).toBe("medium");
    expect(getConfidenceFromLevel(70)).toBe("high");
    expect(getConfidenceFromLevel(95)).toBe("certain");
  });
});

describe("Scouting: Estimated Values (Fog of War)", () => {
  it("should return true value at certain confidence", () => {
    const result = getEstimatedValue(75, "certain", "test-seed");
    expect(result).toBe(75);
  });

  it("should return midpoint at unknown confidence", () => {
    const result = getEstimatedValue(75, "unknown", "test-seed");
    expect(result).toBe(50);
  });

  it("should produce value within error range at medium confidence", () => {
    const result = getEstimatedValue(60, "medium", "test-seed-123");
    // Max 20% error = 20 points on 0-100 scale
    expect(result).toBeGreaterThanOrEqual(40);
    expect(result).toBeLessThanOrEqual(80);
  });

  it("should produce tighter estimates at high confidence", () => {
    // Run multiple seeds and check variance is small
    const estimates = Array.from({ length: 10 }, (_, i) =>
      getEstimatedValue(60, "high", `seed-${i}`)
    );

    for (const est of estimates) {
      // Max 9% error = 9 points
      expect(est).toBeGreaterThanOrEqual(51);
      expect(est).toBeLessThanOrEqual(69);
    }
  });

  it("should be deterministic for same seed", () => {
    const a = getEstimatedValue(60, "medium", "fixed-seed");
    const b = getEstimatedValue(60, "medium", "fixed-seed");
    expect(a).toBe(b);
  });
});

describe("Scouting: View Creation", () => {
  it("should create a scouted view for owned rikishi", () => {
    const rikishi = {
      id: "r1",
      shikona: "Test",
      heyaId: "player-heya",
      rank: "maegashira",
      side: "east",
      height: 180,
      weight: 130,
      power: 70,
      speed: 60,
      balance: 65,
      technique: 55,
      aggression: 50,
      experience: 40,
    } as any;

    const view = createScoutedView(rikishi, "player-heya", 0, "none", 10);

    expect(view.isOwned).toBe(true);
    expect(view.scoutingLevel).toBe(100);
  });

  it("should create a scouted view for rival rikishi", () => {
    const rikishi = {
      id: "r2",
      shikona: "Rival",
      heyaId: "other-heya",
      rank: "ozeki",
      side: "west",
      height: 185,
      weight: 150,
      power: 80,
      speed: 50,
      balance: 75,
      technique: 70,
      aggression: 60,
      experience: 70,
    } as any;

    const view = createScoutedView(rikishi, "player-heya", 3, "standard", 10);

    expect(view.isOwned).toBe(false);
    expect(view.scoutingLevel).toBeGreaterThan(0);
    expect(view.scoutingLevel).toBeLessThan(100);
  });

  it("recordObservation should increase scouting level", () => {
    const initial: ScoutedRikishi = {
      rikishiId: "r2",
      publicInfo: { id: "r2", shikona: "Test", rank: "maegashira", height: 180, weight: 130 },
      isOwned: false,
      timesObserved: 2,
      lastObservedWeek: 5,
      scoutingInvestment: "light",
      scoutingLevel: calculateScoutingLevel(false, 2, "light"),
      attributes: { power: 70, speed: 60, balance: 65, technique: 55, aggression: 50, experience: 40 },
    };

    const updated = recordObservation(initial, 10);

    expect(updated.timesObserved).toBe(3);
    expect(updated.lastObservedWeek).toBe(10);
    expect(updated.scoutingLevel).toBeGreaterThan(initial.scoutingLevel);
  });
});

// ============================================================================
// SIGNING & FOREIGN QUOTA
// ============================================================================

describe("Talent Pool: Signing Eligibility", () => {
  it("should allow signing available candidate", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const tp = (world as any).talentPool;
    const cand = Object.values(tp.candidates)[0] as TalentCandidate;
    cand.availabilityState = "available";

    const result = canSignCandidate(world, "player-heya", cand);
    expect(result.ok).toBe(true);
  });

  it("should reject signed/withdrawn candidates", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const tp = (world as any).talentPool;
    const cand = Object.values(tp.candidates)[0] as TalentCandidate;
    cand.availabilityState = "signed";

    const result = canSignCandidate(world, "player-heya", cand);
    expect(result.ok).toBe(false);
  });

  it("should enforce foreign rikishi quota", () => {
    const world = makeWorld();
    // Mark existing rikishi as foreign
    const r1 = world.rikishi.get("r1")!;
    (r1 as any).nationality = "Mongolia";

    ensureTalentPools(world);

    const tp = (world as any).talentPool;
    // Find a foreign candidate
    const foreignCand = Object.values(tp.candidates).find(
      (c: any) => c.nationality !== "Japan"
    ) as TalentCandidate;

    if (foreignCand) {
      foreignCand.availabilityState = "available";
      const result = canSignCandidate(world, "player-heya", foreignCand);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("Foreigner");
    }
  });

  it("should count foreign rikishi in a heya", () => {
    const world = makeWorld();
    const r1 = world.rikishi.get("r1")!;
    (r1 as any).nationality = "Mongolia";

    expect(getForeignCountInHeya(world, "player-heya")).toBe(1);
  });

  it("FOREIGN_RIKISHI_LIMIT_PER_HEYA should be 1", () => {
    expect(FOREIGN_RIKISHI_LIMIT_PER_HEYA).toBe(1);
  });
});

// ============================================================================
// OFFER MECHANICS
// ============================================================================

describe("Talent Pool: Offer System", () => {
  it("should submit an offer and put candidate in_talks", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const tp = (world as any).talentPool;
    const cand = Object.values(tp.candidates).find(
      (c: any) => c.availabilityState === "available" && c.nationality === "Japan"
    ) as TalentCandidate;

    if (cand) {
      const result = offerCandidate(world, cand.candidateId, "player-heya", "standard", "high");

      expect(result.ok).toBe(true);
      expect(cand.availabilityState).toBe("in_talks");
      expect(cand.competingSuitors.length).toBeGreaterThan(0);
    }
  });

  it("should reject offer for nonexistent candidate", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const result = offerCandidate(world, "nonexistent-id", "player-heya");
    expect(result.ok).toBe(false);
  });
});

// ============================================================================
// YEARLY REFRESH
// ============================================================================

describe("Talent Pool: Reinjection & Retirement", () => {
  it("should reinject a released rikishi back into the talent pool based on origin/age", () => {
    const world = makeWorld({ year: 2025 });
    ensureTalentPools(world);

    // Create a mock domestic pro who is older (university age)
    const domesticPro: any = {
      id: "pro-1",
      shikona: "Pro-1",
      realName: "Test Name",
      birthYear: 2000, // 25 years old
      nationality: "Japan",
      talentSeed: 60,
      archetype: "pusher",
      style: "oshi",
      height: 180,
      weight: 140,
    };

    reinjectToTalentPool(world, domesticPro);

    const tp = (world as any).talentPool;
    const cid = `cand-pro-1`;

    expect(tp.candidates[cid]).toBeDefined();
    expect(tp.candidates[cid].visibilityBand).toBe("public");
    expect(tp.candidates[cid].tags).toContain("former_pro");
    expect(tp.pools.university.candidatesVisible).toContain(cid);

    // Create a foreign pro
    const foreignPro: any = {
      id: "pro-2",
      shikona: "Pro-2",
      birthYear: 2004,
      nationality: "Mongolia",
      talentSeed: 70,
      archetype: "grappler",
      style: "yotsu",
      height: 190,
      weight: 150,
    };

    reinjectToTalentPool(world, foreignPro);
    const foreignCid = `cand-pro-2`;

    expect(tp.candidates[foreignCid]).toBeDefined();
    expect(tp.pools.foreign.candidatesVisible).toContain(foreignCid);
  });

  it("should retire candidates sitting in the pool who are older than 25", () => {
    const world = makeWorld({ year: 2025 });
    ensureTalentPools(world);
    const tp = (world as any).talentPool;

    // Add a young candidate (20 years old)
    tp.candidates["young-1"] = {
      candidateId: "young-1",
      birthYear: 2005,
      availabilityState: "available",
    };
    tp.pools.high_school.candidatesVisible.push("young-1");

    // Add a stale candidate (26 years old)
    tp.candidates["stale-1"] = {
      candidateId: "stale-1",
      birthYear: 1999,
      availabilityState: "available",
    };
    tp.pools.university.candidatesVisible.push("stale-1");

    retireStaleCandidates(world);

    // Young should still be available
    expect(tp.candidates["young-1"].availabilityState).toBe("available");
    expect(tp.pools.high_school.candidatesVisible).toContain("young-1");

    // Stale should be "signed" (retired out) and removed from lists
    expect(tp.candidates["stale-1"].availabilityState).toBe("signed");
    expect(tp.pools.university.candidatesVisible).not.toContain("stale-1");
  });
});

describe("Talent Pool: Yearly Refresh", () => {
  it("should generate new cohort on year change", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    const tp = (world as any).talentPool;
    const initialCount = Object.keys(tp.candidates).length;

    // Simulate year advance
    (world as any).year = 2025;
    refreshYearlyCohort(world, 2025);

    const newCount = Object.keys(tp.candidates).length;
    expect(newCount).toBeGreaterThan(initialCount);
  });

  it("should update lastYearlyRefreshYear", () => {
    const world = makeWorld();
    ensureTalentPools(world);

    (world as any).year = 2025;
    refreshYearlyCohort(world, 2025);

    const tp = (world as any).talentPool;
    expect(tp.lastYearlyRefreshYear).toBe(2025);
  });
});
