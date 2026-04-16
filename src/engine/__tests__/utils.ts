/**
 * src/engine/__tests__/utils.ts
 * =============================
 * Centralized mock factories for test files.
 * Import from here instead of defining locally per-file.
 */

import type { Rikishi, RikishiStats } from "../types/rikishi";
import type { TacticalArchetype } from "../types/combat";
import type { WorldState } from "../types/world";
import type { BashoState } from "../types/basho";
import type { Heya } from "../types/heya";

// ── Rikishi ────────────────────────────────────────────────────────────────

export function mockRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  const power = overrides.power ?? (overrides.stats as unknown as RikishiStats)?.strength ?? 50;
  const speed = overrides.speed ?? (overrides.stats as unknown as RikishiStats)?.speed ?? 50;
  const balance = overrides.balance ?? (overrides.stats as unknown as RikishiStats)?.balance ?? 50;
  const technique = overrides.technique ?? (overrides.stats as unknown as RikishiStats)?.technique ?? 50;
  const aggression = overrides.aggression ?? (overrides.stats as unknown as RikishiStats)?.aggression ?? 50;
  const mental = overrides.mental ?? (overrides.stats as unknown as RikishiStats)?.mental ?? 50;
  const experience = overrides.experience ?? (overrides.stats as unknown as RikishiStats)?.experience ?? 50;

  return {
    id,
    shikona: `Wrestler-${id}`,
    heyaId: `heya-${id}`,
    nationality: "JP",
    rank: "maegashira",
    rankNumber: 5,
    division: "makuuchi",
    currentBashoWins: 3,
    currentBashoLosses: 1,
    side: "east",
    weight: 140,
    height: 180,
    style: "oshi",
    archetype: "all_rounder" as unknown as TacticalArchetype,
    power,
    speed,
    balance,
    technique,
    aggression,
    mental,
    experience,
    momentum: 0,
    stamina: 100,
    fatigue: 0,
    injured: false,
    injuryWeeksRemaining: 0,
    birthYear: 1995,
    adaptability: 50,
    h2h: {},
    history: [],
    personalityTraits: [],
    condition: 90,
    motivation: 50,
    stats: {
      strength: power,
      speed,
      technique,
      balance,
      weight: 140,
      stamina: 100,
      mental: 50,
      adaptability: 50,
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
      },
    } as unknown as RikishiStats,
    careerWins: 20,
    careerLosses: 10,
    favoredKimarite: [],
    weakAgainstStyles: [],
    combatProfile: {
      archetype: "all_rounder",
      familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: {},
    },
    ...overrides,
  } as unknown as Rikishi;
}

// ── Heya ───────────────────────────────────────────────────────────────────

export function makeMockHeya(id: string, overrides: Partial<Heya> = {}): Heya {
  return {
    id,
    name: `Heya-${id}`,
    rikishiIds: [],
    staffIds: [],
    funds: 5_000_000,
    reputation: 50,
    scandalScore: 0,
    governanceStatus: "good_standing",
    politicalCapital: 50,
    koenkaiBand: "bronze",
    facilities: { training: 50, recovery: 50, nutrition: 50, housing: 50 },
    riskIndicators: { financial: false, welfare: false, governance: false },
    ...overrides,
  } as unknown as Heya;
}

// ── WorldState ─────────────────────────────────────────────────────────────

export function makeMockWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    rikishi: new Map(),
    historicalRikishi: new Map(),
    heyas: new Map(),
    staff: new Map(),
    oyakata: new Map(),
    events: { version: "1.0.0", log: [], dedupe: {} },
    history: [],
    ftue: {} as any,
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    id: "world-test",
    seed: "test-seed",
    cyclePhase: "interim",
    records: {} as any,
    settings: { archiveMode: "standard" },
    ...overrides,
  } as unknown as WorldState;
}

// ── BashoState ─────────────────────────────────────────────────────────────

export function makeMockBasho(overrides: Partial<BashoState> = {}): BashoState {
  return {
    id: "test-basho",
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu",
    day: 1,
    matches: [],
    standings: new Map(),
    isActive: true,
    ...overrides,
  } as unknown as BashoState;
}
