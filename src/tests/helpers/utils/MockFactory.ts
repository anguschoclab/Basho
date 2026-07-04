import type { WorldState } from "../../engine/types/world";
import type { Rikishi } from "../../engine/types/rikishi";
import type { Heya } from "../../engine/types/heya";
import type { Oyakata } from "../../engine/types/oyakata";
import type { Id } from "../../engine/types/common";
import type { BashoState } from "../../engine/types/basho";

/**
 * MockFactory
 * Provides type-safe generators for engine entities.
 */
export const MockFactory = {
  createWorld(overrides: Partial<WorldState> = {}): WorldState {
    // The engine derives the active roster from `activeRikishiIds`; keep it defined and in
    // sync with the rikishi map (excluding retired), including post-construction `.set(...)`.
    const rikishi = overrides.rikishi ?? new Map<Id, Rikishi>();
    const activeRikishiIds =
      overrides.activeRikishiIds ??
      new Set(
        Array.from(rikishi.entries())
          .filter(([, r]) => !(r as Rikishi | undefined)?.isRetired)
          .map(([k]) => k)
      );
    if (!(rikishi as { __activeSyncPatched?: boolean }).__activeSyncPatched) {
      const baseSet = rikishi.set.bind(rikishi);
      rikishi.set = (k: Id, v: Rikishi) => {
        if (v && !v.isRetired) activeRikishiIds.add(k);
        else activeRikishiIds.delete(k);
        return baseSet(k, v);
      };
      (rikishi as { __activeSyncPatched?: boolean }).__activeSyncPatched = true;
    }
    return {
      id: "world_default",
      seed: "test-seed",
      year: 2026,
      week: 1,
      dayIndexGlobal: 0,
      cyclePhase: "pre_basho",
      rikishi,
      activeRikishiIds,
      heyas: new Map(),
      oyakata: new Map(),
      staff: new Map(),
      history: [],
      ftue: { isActive: false, bashoCompleted: 0, suppressedEvents: [] },
      records: {
        allTime: {
          careerWins: [],
          makuuchiWins: [],
          yusho: [],
          consecutiveYusho: [],
          kinboshi: [],
        },
        active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      },
      calendar: { year: 2026, currentWeek: 1 },
      mediaState: {
        heyaPressure: {},
        mediaHeat: {},
        globalBuzz: 0,
        headlines: [],
        pressConferenceActive: false,
      },
      ...overrides,
    } as WorldState;
  },

  createRikishi(
    idOrOverrides: Id | Partial<Rikishi>,
    overridesOpt: Partial<Rikishi> = {}
  ): Rikishi {
    let id: Id;
    let overrides: Partial<Rikishi>;

    if (typeof idOrOverrides === "string") {
      id = idOrOverrides;
      overrides = overridesOpt;
    } else {
      overrides = idOrOverrides || {};
      id = overrides.id || "default_id";
    }

    return {
      id,
      shikona: `Rikishi ${id}`,
      heyaId: `heya_${id}`,
      nationality: "Japan",
      birthYear: 2000,
      height: 180,
      weight: 140,
      power: 50,
      speed: 50,
      balance: 50,
      technique: 50,
      aggression: 50,
      mental: 50,
      experience: 10,
      adaptability: 50,
      momentum: 0,
      stamina: 50,
      fatigue: 0,
      injured: false,
      injuryWeeksRemaining: 0,
      isKyujo: false,
      style: "oshi",
      combatProfile: {
        archetype: "oshi",
        familyPreferences: { push: 10, belt: 0, trick: 0, speed: 0 },
        preferredGrip: "none",
        preferredGripDepth: "standard",
        statModifiers: {},
      },
      archetypeEvidence: {
        push: { success: 0, fail: 0 },
        grapple: { success: 0, fail: 0 },
        evade: { success: 0, fail: 0 },
      },
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 1,
      side: "east",
      careerWins: 0,
      careerLosses: 0,
      careerAbsences: 0,
      makuuchiWins: 0,
      divisionRecords: {
        makuuchi: { wins: 0, losses: 0 },
        juryo: { wins: 0, losses: 0 },
        makushita: { wins: 0, losses: 0 },
        sandanme: { wins: 0, losses: 0 },
        jonidan: { wins: 0, losses: 0 },
        jonokuchi: { wins: 0, losses: 0 },
      },
      consecutiveYusho: 0,
      careerHistory: [],
      milestones: [],
      heyaHistory: [],
      lineage: {},
      h2h: {},
      history: [],
      favoredKimarite: [],
      weakAgainstStyles: [],
      stats: {
        strength: 50,
        speed: 50,
        technique: 50,
        weight: 140,
        stamina: 50,
        mental: 50,
        adaptability: 50,
        balance: 50,
      },
      personalityTraits: [],
      condition: 100,
      motivation: 70,
      behavior: { stoicism: 50, aggression: 50, discipline: 50 },
      ...overrides,
    } as Rikishi;
  },

  createBasho(overrides: Partial<BashoState> = {}): BashoState {
    return {
      id: "basho_default",
      year: 2026,
      bashoNumber: 1,
      bashoName: "hatsu",
      day: 1,
      matches: [],
      standings: new Map(),
      isActive: true,
      ...overrides,
    } as BashoState;
  },

  createHeya(id: Id, overrides: Partial<Heya> = {}): Heya {
    return {
      id,
      name: `Heya ${id}`,
      oyakataId: `oyakata_${id}`,
      rikishiIds: [],
      statureBand: "established",
      prestigeBand: "respected",
      facilitiesBand: "adequate",
      koenkaiBand: "moderate",
      runwayBand: "comfortable",
      reputation: 50,
      prestige: 50,
      funds: 5000000,
      scandalScore: 0,
      governanceStatus: "compliant",
      facilities: { training: 10, recovery: 10, nutrition: 10 },
      riskIndicators: { financial: false, governance: false, rivalry: false },
      lineage: [],
      historicalYusho: 0,
      ...overrides,
    } as Heya;
  },
  createOyakata(id: Id, overrides: Partial<Oyakata> = {}): Oyakata {
    return {
      id,
      heyaId: `heya_${id}`,
      name: `Oyakata ${id}`,
      shikona: `Ex-Rikishi ${id}`,
      age: 50,
      archetype: "traditionalist",
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
      yearsInCharge: 5,
      successionReadiness: "stable",
      ...overrides,
    } as Oyakata;
  },

  createStaff(
    id: Id,
    overrides: Partial<import("../../engine/types/staff").Staff> = {}
  ): import("../../engine/types/staff").Staff {
    return {
      id,
      name: `Staff ${id}`,
      role: "technique_coach",
      active: true,
      fatigue: 0,
      competenceBands: { primary: "strong" },
      heyaId: "heya_default",
      ...overrides,
    } as import("../../engine/types/staff").Staff;
  },

  createCandidate(
    id: Id,
    overrides: Partial<import("../../engine/types/talent").TalentCandidate> = {}
  ): import("../../engine/types/talent").TalentCandidate {
    return {
      candidateId: id,
      personId: `person-${id}`,
      name: `Candidate ${id}`,
      birthYear: 2006,
      originRegion: "Tokyo",
      nationality: "Japan",
      visibilityBand: "public",
      reputationSeed: 50,
      tags: [],
      combatProfile: {
        archetype: "oshi",
        familyPreferences: { push: 10, belt: 0, trick: 0, speed: 0 },
        preferredGrip: "none",
        preferredGripDepth: "standard",
        statModifiers: {},
      },
      availabilityState: "available",
      competingSuitors: [],
      archetype: "oshi",
      style: "oshi",
      heightPotentialCm: 180,
      weightPotentialKg: 130,
      talentSeed: 50,
      temperament: { discipline: 50, volatility: 30 },
      ...overrides,
    } as import("../../engine/types/talent").TalentCandidate;
  },

  createTalentPool(
    overrides: Partial<import("../../engine/types/talent").TalentPoolWorldState> = {}
  ): import("../../engine/types/talent").TalentPoolWorldState {
    return {
      version: "1.0.0",
      lastYearlyRefreshYear: 2026,
      candidates: {},
      pools: {
        high_school: {
          poolId: "pool-hs",
          poolType: "high_school",
          candidatesVisible: [],
          candidatesHidden: [],
          refreshCadence: "basho",
          populationCap: 20,
          hiddenReserveCap: 50,
          lastRefreshWeek: 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
        university: {
          poolId: "pool-uni",
          poolType: "university",
          candidatesVisible: [],
          candidatesHidden: [],
          refreshCadence: "basho",
          populationCap: 10,
          hiddenReserveCap: 20,
          lastRefreshWeek: 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
        foreign: {
          poolId: "pool-for",
          poolType: "foreign",
          candidatesVisible: [],
          candidatesHidden: [],
          refreshCadence: "basho",
          populationCap: 5,
          hiddenReserveCap: 10,
          lastRefreshWeek: 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
      },
      ...overrides,
    } as import("../../engine/types/talent").TalentPoolWorldState;
  },
};
