/**
 * WorldFactory.ts — Pipeline for generating high-fidelity world state.
 * Decomposes the monolithic worldgen logic into manageable stages.
 */

import { SeededRNG, rngFromSeed } from "../../rng";
import { WorldState } from "../../types/world";
import { Heya } from "../../types/heya";
import { Oyakata } from "../../types/oyakata";
import { Rikishi } from "../../types/rikishi";
import { generateShikona, generateOyakataName } from "../../shikona";
import { seededPick } from "../../utils/random";

/**
 * Creates a new Heya and its associated Oyakata.
 */
export function createHeyaWithOyakata(args: {
  id: string,
  name: string,
  rng: SeededRNG,
  tier: number,
  currentYear: number
}): { heya: Heya, oyakata: Oyakata } {
  const { id, name, rng, tier, currentYear } = args;
  const oyakataId = `oyakata_${id.split('_')[1]}`;
  
  const oyakata: Oyakata = {
    id: oyakataId,
    heyaId: id,
    name: generateOyakataName(`${rng.seed}::oyakata::${oyakataId}`),
    age: 45 + rng.int(0, 20),
    archetype: seededPick(rng, ["traditionalist", "scientist", "gambler", "nurturer", "tyrant", "strategist"]),
    traits: {
      ambition: 50 + rng.next() * 50,
      patience: 50 + rng.next() * 50,
      risk: 50 + rng.next() * 50,
      tradition: 50 + rng.next() * 50,
      compassion: 50 + rng.next() * 50
    },
    yearsInCharge: 1 + rng.int(0, 15),
    stats: { scouting: 50, training: 50, politics: 50 },
    personality: "traditionalist" // Default
  };

  const heya: Heya = {
    id,
    name,
    oyakataId,
    statureBand: tier < 0.2 ? "legendary" : tier < 0.5 ? "powerful" : "established",
    prestigeBand: tier < 0.2 ? "elite" : "respected",
    facilitiesBand: "adequate",
    koenkaiBand: "moderate",
    runwayBand: "secure",
    reputation: 80 - tier * 50,
    funds: tier < 0.2 ? 40_000_000 : 15_000_000,
    scandalScore: 0,
    governanceStatus: "good_standing",
    welfareState: { welfareRisk: 10, activeDiet: "maintenance", complianceState: "compliant", weeksInState: 0, lastReviewedWeek: 0 },
    facilities: { training: 50, recovery: 50, nutrition: 50 },
    riskIndicators: { financial: false, governance: false, rivalry: false },
    ichimon: seededPick(rng, ["Dewanoumi", "Nishonoseki", "Takasago", "Tokitsukaze", "Isegahama"]),
    politicalCapital: 100,
    location: "Tokyo",
    lineage: [],
    historicalYusho: 0
  };

  return { heya, oyakata };
}

/**
 * Main orchestrator for world generation.
 */
export function generateInitialWorld(seed: string): WorldState {
  const worldRng = rngFromSeed(seed, "worldgen", "world");
  const heyaMap = new Map<string, Heya>();
  const oyakataMap = new Map<string, Oyakata>();
  const rikishiMap = new Map<string, Rikishi>();

  // Pipeline execution:
  // 1. Stables (Heya/Oyakata)
  // 2. Initial Roster (Rikishi)
  // 3. Economy/Factions
  // 4. Persistence
  
  // (Simplified for architectural demonstration; full logic to be ported from worldgen.ts)
  
  return {
    id: `world_${seed}`,
    seed,
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    cyclePhase: "interim",
    currentBashoName: "hatsu",
    heyas: heyaMap,
    rikishi: rikishiMap,
    historicalRikishi: new Map(),
    oyakata: oyakataMap,
    staff: new Map(),
    history: [],
    events: { version: "1.0.0", log: [], dedupe: {} },
    ftue: { isActive: true, bashoCompleted: 0, suppressedEvents: [] },
    playerHeyaId: "",
    almanacSnapshots: [],
    factions: {},
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    records: { allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] }, active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] } },
    settings: { archiveMode: "standard" }
  } as any;
}
