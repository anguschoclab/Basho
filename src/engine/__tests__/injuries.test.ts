import { describe, it, expect } from "vitest";
import {
  createDefaultInjuriesState,
  getOrInitDurability,
  computeWeeklyInjuryChance,
  rollWeeklyInjury,
  applyInjuryRecord,
  clearInjury,
  processWeeklyRecovery,
  syncRikishiInjuryFlags,
  hydrateFromRikishiFlags,
  onBoutResolved,
  type InjuryRecord,
  type InjuriesState,
} from "../injuries";
import { rngFromSeed } from "../rng";
import type { Rikishi, RikishiStats } from "../types/rikishi";
import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";

// ── helpers ──

function mockRikishi(overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id: "r1", shikona: "Testyama", heyaId: "h1", nationality: "JP",
    height: 180, weight: 140, power: 50, speed: 50, balance: 50,
    technique: 50, aggression: 50, experience: 50, momentum: 0,
    stamina: 100, fatigue: 30, injured: false, injuryWeeksRemaining: 0,
    style: "oshi", archetype: "all_rounder", division: "makuuchi",
    rank: "maegashira", rankNumber: 10, side: "east", birthYear: 1995,
    adaptability: 50, h2h: {}, history: [], personalityTraits: [],
    condition: 90, motivation: 50,
    stats: { strength: 50, speed: 50, technique: 50, balance: 50, weight: 140, stamina: 100, mental: 50, adaptability: 50 } as RikishiStats,
    careerWins: 20, careerLosses: 10, currentBashoWins: 5, currentBashoLosses: 2,
    favoredKimarite: [], weakAgainstStyles: [],
    ...overrides,
  } as unknown as Rikishi;
}

function mockWorld(rikishi?: Map<string, Rikishi>): WorldState {
  const rMap = rikishi ?? new Map([["r1", mockRikishi()]]);
  return {
    id: "w1", seed: "injury-test-seed", year: 2026, week: 5,
    cyclePhase: "interim", currentBashoName: "hatsu",
    heyas: new Map([["h1", {
      id: "h1", name: "Test Heya", oyakataId: "oya1",
      rikishiIds: [...rMap.keys()],
      funds: 5000, statureBand: "rising", scandalScore: 0,
      facilities: { training: 50, recovery: 50, nutrition: 50 },
      trainingState: { intensity: "balanced", focus: "neutral", recovery: "normal", focusRikishi: { protect: [], develop: [], push: [] } },
      welfareState: { debt: 0, complianceRisk: 0, sanctions: { cashFine: 0, rankPenalties: [], banWeeks: 0 } },
    } as unknown as Heya]]),
    rikishi: rMap,
    oyakata: new Map([["oya1", {
      id: "oya1", heyaId: "h1", name: "Coach", archetype: "nurturer",
      traits: { ambition: 50, patience: 80, risk: 20, tradition: 50, compassion: 80 },
    } as any]]),
    history: { bashoResults: [], yearEndAwards: [] },
    events: { version: "1.0.0", log: [], dedupe: {} },
    calendar: { year: 2026, month: 1, currentWeek: 5, currentDay: 1 },
    dayIndexGlobal: 0, almanacSnapshots: [],
    sponsorPool: { sponsors: new Map(), koenkais: new Map() },
    ozekiKadoban: {},
  } as unknown as WorldState;
}

// ── Tests ──

describe("Injury System", () => {
  describe("createDefaultInjuriesState", () => {
    it("should return an empty v1 state", () => {
      const s = createDefaultInjuriesState();
      expect(s.version).toBe("1.0.0");
      expect(Object.keys(s.activeByRikishi)).toHaveLength(0);
      expect(s.history).toHaveLength(0);
    });
  });

  describe("getOrInitDurability", () => {
    it("should deterministically generate durability 20-95", () => {
      let state = createDefaultInjuriesState();
      const { durability, state: s2 } = getOrInitDurability({ state, worldSeed: "seed1", rikishiId: "r1" });
      expect(durability).toBeGreaterThanOrEqual(20);
      expect(durability).toBeLessThanOrEqual(95);
      // Should persist
      expect(s2.durability["r1"]).toBe(durability);
    });

    it("should return existing durability without changing it", () => {
      const state: InjuriesState = { ...createDefaultInjuriesState(), durability: { r1: 42 } };
      const { durability } = getOrInitDurability({ state, worldSeed: "any", rikishiId: "r1" });
      expect(durability).toBe(42);
    });
  });

  describe("computeWeeklyInjuryChance", () => {
    const profile = { intensity: "balanced" as const, focus: "neutral" as const, styleBias: "neutral" as const, recovery: "normal" as const };
    const rikishi = mockRikishi();

    it("should produce a low baseline chance", () => {
      const chance = computeWeeklyInjuryChance({ rikishi, profile, fatigue: 0, durability: 60 });
      expect(chance).toBeGreaterThan(0);
      expect(chance).toBeLessThan(0.05);
    });

    it("should increase with high fatigue", () => {
      const low = computeWeeklyInjuryChance({ rikishi, profile, fatigue: 0, durability: 60 });
      const high = computeWeeklyInjuryChance({ rikishi, profile, fatigue: 100, durability: 60 });
      expect(high).toBeGreaterThan(low);
    });

    it("should increase with punishing intensity", () => {
      const balanced = computeWeeklyInjuryChance({ rikishi, profile, fatigue: 50, durability: 60 });
      const punishing = computeWeeklyInjuryChance({
        rikishi, profile: { ...profile, intensity: "punishing" }, fatigue: 50, durability: 60,
      });
      expect(punishing).toBeGreaterThan(balanced);
    });

    it("should decrease with high durability", () => {
      const fragile = computeWeeklyInjuryChance({ rikishi, profile, fatigue: 50, durability: 20 });
      const tough = computeWeeklyInjuryChance({ rikishi, profile, fatigue: 50, durability: 95 });
      expect(fragile).toBeGreaterThan(tough);
    });

    it("should never exceed 12%", () => {
      const worst = computeWeeklyInjuryChance({
        rikishi: mockRikishi({ experience: 95 }),
        profile: { ...profile, intensity: "punishing" },
        fatigue: 100, durability: 10,
      });
      expect(worst).toBeLessThanOrEqual(0.12);
    });

    it("protect mode should lower risk vs push mode", () => {
      const protect = computeWeeklyInjuryChance({ rikishi, profile, fatigue: 50, durability: 60, individualMode: "protect" });
      const push = computeWeeklyInjuryChance({ rikishi, profile, fatigue: 50, durability: 60, individualMode: "push" });
      expect(protect).toBeLessThan(push);
    });
  });

  describe("rollWeeklyInjury", () => {
    it("should return null when RNG is above chance", () => {
      // With a very safe setup the chance is ~0.5%, so a high rng.next() will miss
      const world = mockWorld();
      const rng = rngFromSeed("safe-seed", "test", "safe");
      // Override rng to always return 0.99
      rng.next = () => 0.99;
      const result = rollWeeklyInjury({
        rng, world, rikishi: mockRikishi(), fatigue: 0, durability: 95,
        profile: { intensity: "conservative", focus: "neutral", styleBias: "neutral", recovery: "high" },
      });
      expect(result).toBeNull();
    });

    it("should produce a valid InjuryRecord when RNG triggers", () => {
      const world = mockWorld();
      const rng = rngFromSeed("hit-seed", "test", "hit");
      // Force injury by making first rng.next() return 0 (below any chance)
      let callCount = 0;
      const origNext = rng.next.bind(rng);
      rng.next = () => { callCount++; return callCount === 1 ? 0.0001 : origNext(); };

      const result = rollWeeklyInjury({
        rng, world, rikishi: mockRikishi(), fatigue: 80, durability: 30,
        profile: { intensity: "punishing", focus: "neutral", styleBias: "neutral", recovery: "low" },
      });
      expect(result).not.toBeNull();
      expect(result!.rikishiId).toBe("r1");
      expect(["minor", "moderate", "serious"]).toContain(result!.severity);
      expect(result!.remainingWeeks).toBeGreaterThan(0);
      expect(result!.title.length).toBeGreaterThan(0);
    });
  });

  describe("applyInjuryRecord / clearInjury", () => {
    it("should add and then remove an active injury", () => {
      let state = createDefaultInjuriesState();
      const record: InjuryRecord = {
        id: "inj-1", rikishiId: "r1", startWeek: 5, expectedWeeksOut: 3, remainingWeeks: 3,
        severity: "minor", area: "knee", type: "sprain", title: "Test", description: "Test injury",
      };
      state = applyInjuryRecord(state, record);
      expect(state.activeByRikishi["r1"]).toBeDefined();
      expect(state.history).toHaveLength(1);

      state = clearInjury(state, "r1");
      expect(state.activeByRikishi["r1"]).toBeUndefined();
      // History is append-only
      expect(state.history).toHaveLength(1);
    });
  });

  describe("processWeeklyRecovery", () => {
    it("should reduce remaining weeks and recover when done", () => {
      const world = mockWorld();
      let state = createDefaultInjuriesState();
      state = applyInjuryRecord(state, {
        id: "inj-1", rikishiId: "r1", startWeek: 1, expectedWeeksOut: 2, remainingWeeks: 1,
        severity: "minor", area: "ankle", type: "strain", title: "T", description: "D",
      });

      const { state: s2, recovered } = processWeeklyRecovery({ state, world });
      expect(recovered).toContain("r1");
      expect(s2.activeByRikishi["r1"]).toBeUndefined();
    });

    it("should tick down but not recover multi-week injuries in one pass", () => {
      const world = mockWorld();
      let state = createDefaultInjuriesState();
      state = applyInjuryRecord(state, {
        id: "inj-2", rikishiId: "r1", startWeek: 1, expectedWeeksOut: 6, remainingWeeks: 5,
        severity: "moderate", area: "back", type: "strain", title: "T", description: "D",
      });

      const { state: s2, recovered } = processWeeklyRecovery({ state, world });
      expect(recovered).toHaveLength(0);
      expect(s2.activeByRikishi["r1"].remainingWeeks).toBeLessThan(5);
    });

    it("should accelerate recovery with high recovery facilities", () => {
      const world = mockWorld();
      const heya = world.heyas.get("h1")!;
      (heya.facilities as any).recovery = 100;

      let state = createDefaultInjuriesState();
      state = applyInjuryRecord(state, {
        id: "inj-3", rikishiId: "r1", startWeek: 1, expectedWeeksOut: 4, remainingWeeks: 3,
        severity: "moderate", area: "shoulder", type: "sprain", title: "T", description: "D",
      });

      const { state: s2 } = processWeeklyRecovery({
        state, world,
        getHeyaByRikishiId: () => heya,
        getTrainingProfileByHeyaId: () => ({ intensity: "conservative", focus: "neutral", styleBias: "neutral", recovery: "high" }),
      });
      // With high facilities + high recovery, should reduce by 2
      expect(s2.activeByRikishi["r1"]?.remainingWeeks ?? 0).toBeLessThanOrEqual(1);
    });
  });

  describe("syncRikishiInjuryFlags", () => {
    it("should sync injured flag to rikishi", () => {
      const world = mockWorld();
      let state = createDefaultInjuriesState();
      state = applyInjuryRecord(state, {
        id: "inj-4", rikishiId: "r1", startWeek: 1, expectedWeeksOut: 3, remainingWeeks: 3,
        severity: "minor", area: "wrist", type: "contusion", title: "T", description: "D",
      });
      syncRikishiInjuryFlags({ world, state });
      const r = world.rikishi.get("r1")! as any;
      expect(r.injured).toBe(true);
      expect(r.injuryWeeksRemaining).toBe(3);
    });
  });

  describe("hydrateFromRikishiFlags", () => {
    it("should create InjuryRecords from legacy rikishi flags", () => {
      const world = mockWorld();
      const r = world.rikishi.get("r1")! as any;
      r.injured = true;
      r.injuryWeeksRemaining = 4;

      const state = hydrateFromRikishiFlags({ state: createDefaultInjuriesState(), world });
      expect(state.activeByRikishi["r1"]).toBeDefined();
      expect(state.activeByRikishi["r1"].remainingWeeks).toBe(4);
      expect(state.activeByRikishi["r1"].severity).toBe("moderate"); // 4 weeks → moderate
    });
  });
});
