/**
 * testFixtures.ts
 *
 * Pre-built test fixtures for common test scenarios.
 * Provides sample WorldState, Rikishi, Heya, and other entities.
 */

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import { SeededRNG } from "@/engine/rng";

/**
 * Sample Heya fixture - player stable.
 */
export const sampleHeya1 = {
  id: "heya-1",
  name: "Dewanoumi Stable",
  nameJa: "出羽海部屋",
  isPlayerOwned: true,
  prestige: 75,
  funds: 50_000_000,
  location: "Tokyo",
  ichimon: "Dewanoumi",
  oyakataId: "oyakata-1",
  rikishiIds: ["rikishi-1", "rikishi-2"],
  staffIds: [],
  runwayBand: "secure",
  welfareState: {
    welfareRisk: 10,
    activeDiet: "maintenance",
    complianceState: "compliant",
    weeksInState: 0,
    lastReviewedWeek: 0,
  } as any,
  riskIndicators: {
    financial: false,
    governance: false,
    rivalry: false,
    welfare: false,
  },
} as Heya;

/**
 * Sample Heya fixture - NPC stable.
 */
export const sampleHeya2: Heya = {
  id: "heya-2",
  name: "Takasago Stable",
  nameJa: "高砂部屋",
  isPlayerOwned: false,
  prestige: 60,
  funds: 30_000_000,
  location: "Osaka",
  ichimon: "Takasago",
  oyakataId: "oyakata-2",
  rikishiIds: ["rikishi-3"],
  staffIds: [],
  runwayBand: "comfortable",
  welfareState: {
    welfareRisk: 20,
    activeDiet: "heavy_bulk",
    complianceState: "compliant",
    weeksInState: 0,
    lastReviewedWeek: 0,
  } as any as any,
  riskIndicators: {
    financial: false,
    governance: false,
    rivalry: false,
    welfare: false,
  },
};

/**
 * Sample Rikishi fixture - sekitori.
 */
export const sampleRikishi1: Rikishi = {
  id: "rikishi-1",
  shikona: "Taro Musashimaru",
  heyaId: "heya-1",
  nationality: "Japan",
  origin: "Tokyo",
  height: 185,
  weight: 135,
  rank: "maegashira",
  rankNumber: 5,
  division: "makuuchi",
  side: "east",
  style: "yotsu",
  combatProfile: {
    archetype: "yotsu",
    familyPreferences: { push: 25, belt: 50, trick: 15, speed: 10 },
    preferredGrip: "migi",
    preferredGripDepth: "standard",
    statModifiers: {},
    favoredKimarite: [],
    counterFamily: "push",
    archetypeBehavior: {
      tachiaiSpeedBonus: 0,
      lateralMovementBonus: 0,
      edgeEscapeBonus: 0,
      beltTorqueBonus: 0,
      pushVelocityBonus: 0,
    },
  },
  archetypeEvidence: {
    push: { success: 0, fail: 0 },
    grapple: { success: 0, fail: 0 },
    evade: { success: 0, fail: 0 },
  },
  isRetired: false,
  injured: false,
  condition: 0.8,
  motivation: 0.7,
  fatigue: 10,
  speed: 60,
  balance: 70,
  stamina: 65,
  mental: 70,
  adaptability: 60,
  momentum: 5,
  experience: 100,
  currentBashoWins: 8,
  currentBashoLosses: 7,
  careerWins: 250,
  careerLosses: 180,
  careerRecord: {
    wins: 250,
    losses: 180,
    yusho: 1,
  },
  stats: {
    power: 75,
    technique: 80,
    speed: 60,
    stamina: 65,
    mental: 70,
    adaptability: 60,
    balance: 70,
    weight: 135,
    aggression: 50,
    experience: 50,
  },
  history: [],
};

/**
 * Sample Rikishi fixture - juryo.
 */
export const sampleRikishi2: Rikishi = {
  id: "rikishi-2",
  shikona: "Jiro Kisenosato",
  heyaId: "heya-1",
  nationality: "Japan",
  origin: "Osaka",
  height: 180,
  weight: 125,
  rank: "juryo",
  rankNumber: 3,
  division: "juryo",
  side: "west",
  style: "oshi",
  archetype: "oshi_specialist",
  derivedArchetype: "All_Rounder",
  isRetired: false,
  injured: false,
  condition: 0.7,
  motivation: 0.8,
  fatigue: 5,
  speed: 70,
  balance: 60,
  stamina: 70,
  mental: 65,
  adaptability: 65,
  momentum: 10,
  experience: 50,
  currentBashoWins: 10,
  currentBashoLosses: 5,
  careerWins: 80,
  careerLosses: 70,
  careerRecord: {
    wins: 80,
    losses: 70,
    yusho: 0,
  },
  stats: {
    power: 65,
    technique: 55,
    speed: 70,
    stamina: 70,
    mental: 65,
    adaptability: 65,
    balance: 60,
    weight: 125,
    aggression: 50,
    experience: 50,
  },
  talentSeed: 65,
  history: [],
};

/**
 * Sample Rikishi fixture - makushita.
 */
export const sampleRikishi3: Rikishi = {
  id: "rikishi-3",
  shikona: "Saburo Takashima",
  heyaId: "heya-2",
  nationality: "Japan",
  origin: "Kyoto",
  height: 175,
  weight: 115,
  rank: "makushita",
  rankNumber: 10,
  division: "makushita",
  side: "east",
  style: "hybrid",
  archetype: "hybrid_oshi_yotsu",
  derivedArchetype: "All_Rounder",
  isRetired: false,
  injured: false,
  condition: 0.6,
  motivation: 0.9,
  fatigue: 0,
  speed: 65,
  balance: 55,
  stamina: 60,
  mental: 70,
  adaptability: 70,
  momentum: 15,
  experience: 20,
  currentBashoWins: 5,
  currentBashoLosses: 2,
  careerWins: 30,
  careerLosses: 25,
  careerRecord: {
    wins: 30,
    losses: 25,
    yusho: 0,
  },
  stats: {
    power: 55,
    technique: 50,
    speed: 65,
    stamina: 60,
    mental: 70,
    adaptability: 70,
    balance: 55,
    weight: 115,
    aggression: 50,
    experience: 50,
  },
  talentSeed: 60,
  history: [],
};

/**
 * Sample Oyakata fixture - player oyakata.
 */
export const sampleOyakata1: Oyakata = {
  id: "oyakata-1",
  shikona: "Former Yokozuna Taro",
  heyaId: "heya-1",
  traits: {
    ambition: 60,
    tradition: 80,
    risk: 30,
    compassion: 70,
    patience: 75,
  },
  mood: "content",
};

/**
 * Sample Oyakata fixture - NPC oyakata.
 */
export const sampleOyakata2: Oyakata = {
  id: "oyakata-2",
  shikona: "Former Ozeki Jiro",
  heyaId: "heya-2",
  traits: {
    ambition: 85,
    tradition: 40,
    risk: 70,
    compassion: 50,
    patience: 45,
  },
  mood: "obsessed",
};

/**
 * Sample WorldState fixture with multiple heyas and rikishi.
 */
export const sampleWorldState: WorldState = {
  seed: "fixture-seed-123",
  year: 2024,
  week: 1,
  calendar: {
    year: 2024,
    month: 1,
    currentDay: 1,
    currentWeek: 1,
  },
  heyas: new Map([
    ["heya-1", sampleHeya1],
    ["heya-2", sampleHeya2],
  ]),
  rikishi: new Map([
    ["rikishi-1", sampleRikishi1],
    ["rikishi-2", sampleRikishi2],
    ["rikishi-3", sampleRikishi3],
  ]),
  oyakata: new Map([
    ["oyakata-1", sampleOyakata1],
    ["oyakata-2", sampleOyakata2],
  ]),
  staff: new Map(),
  events: {
    version: "1.0.0",
    log: [],
    dedupe: {},
  },
  history: [],
  playerHeyaId: "heya-1",
  cyclePhase: "interim",
  currentBasho: undefined,
  rng: new SeededRNG("fixture-seed-123"),
};
