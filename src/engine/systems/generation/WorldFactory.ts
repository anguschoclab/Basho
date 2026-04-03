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
import { generateFullRikishi } from "./CandidateGenerator";
import { Division, Rank, Side } from "../../types/banzuke";
import * as talentpool from "./TalentPoolService";
import { generateInitialSponsorPool } from "./SponsorGenerator";
import { createKoenkai } from "../economics/SponsorshipService";

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
    shikona: generateOyakataName(`${rng.seed}::oyakata::${oyakataId}`),
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
    prestige: 50 - tier * 30,
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

  // 1. Create Stables (45 traditional stables)
  const HEYA_NAMES = [
    "Dewanoumi", "Nishonoseki", "Takasago", "Tokitsukaze", "Isegahama",
    "Sakaigawa", "Kasugano", "Kokonoe", "Kise", "Musashigawa",
    "Kataonami", "Onoe", "Tatsunami", "Minezaki", "Tamanoi",
    "Isenoumi", "Ajigawa", "Sadogatake", "Hakkaku", "Shibatayama",
    "Michinoku", "Miyagino", "Oigami", "Tagonoura", "Naruto",
    "Arashio", "Asakayama", "Nakagawa", "Shikihide", "Yamahibiki",
    "Irumagawa", "Hanahago", "Shirane", "Futagoyama", "Fujishima",
    "Takadagawa", "Magaki", "Katsushika", "Oshogatsu", "Chiganoura",
    "Minato", "Shikoroyama", "Kagamiyama", "Hanakago", "Oguruma"
  ];

  HEYA_NAMES.forEach((name, i) => {
    const id = `heya_${i + 1}`;
    const tier = i / HEYA_NAMES.length;
    const { heya, oyakata } = createHeyaWithOyakata({ id, name, rng: worldRng, tier, currentYear: 2025 });
    heyaMap.set(id, heya);
    oyakataMap.set(oyakata.id, oyakata);
    heya.rikishiIds = [];
  });

  // 2. Initial Roster Generation (Rank Distribution)
  const rankConfigs: { rank: Rank; division: Division; count: number }[] = [
    { rank: "yokozuna", division: "makuuchi", count: 1 },
    { rank: "ozeki", division: "makuuchi", count: 2 },
    { rank: "sekiwake", division: "makuuchi", count: 2 },
    { rank: "komusubi", division: "makuuchi", count: 2 },
    { rank: "maegashira", division: "makuuchi", count: 34 },
    { rank: "juryo", division: "juryo", count: 28 },
    { rank: "makushita", division: "makushita", count: 120 },
    { rank: "sandanme", division: "sandanme", count: 200 },
    { rank: "jonidan", division: "jonidan", count: 200 },
    { rank: "jonokuchi", division: "jonokuchi", count: 110 }
  ];

  let totalGenerated = 0;
  rankConfigs.forEach(config => {
    for (let i = 0; i < config.count; i++) {
      const side: Side = i % 2 === 0 ? "east" : "west";
      const rankNumber = config.rank === "maegashira" || config.rank === "juryo" || config.rank === "makushita" || config.rank === "sandanme" || config.rank === "jonidan" || config.rank === "jonokuchi" 
        ? Math.floor(i / 2) + 1 
        : 1;

      const rikishiId = `rk_${totalGenerated + 1}`;
      const r = generateFullRikishi({
        id: rikishiId,
        rng: worldRng,
        currentYear: 2025,
        rank: config.rank,
        division: config.division,
        side,
        rankNumber
      });

      // Randomly assign to a stable
      const heyaId = `heya_${worldRng.int(1, HEYA_NAMES.length)}`;
      r.heyaId = heyaId;
      heyaMap.get(heyaId)?.rikishiIds?.push(r.id);
      rikishiMap.set(r.id, r);
      totalGenerated++;
    }
  });

  const world: WorldState = {
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
    playerHeyaId: "heya_1", // Default to stable 1
    almanacSnapshots: [],
    factions: {},
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    records: { 
      allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] }, 
      active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] } 
    },
    settings: { archiveMode: "standard" },
    planetRating: 50,
    isInitialSeed: true,
    sponsorPool: generateInitialSponsorPool(seed)
  } as any;

  // 3. Establish Initial Koenkai Relationships (Constitution A6)
  if (world.sponsorPool) {
    for (const heya of world.heyas.values()) {
      const koenkai = createKoenkai(
        heya.id,
        world.sponsorPool,
        heya.prestigeBand || "respected",
        worldRng,
        0
      );
      world.sponsorPool.koenkais.set(koenkai.koenkaiId, koenkai);
      heya.koenkaiBand = koenkai.strengthBand;
    }
  }

  // Initialize and populate talent pools
  talentpool.tickWeekTalentPool(world);

  return world;
}

/**
 * Initialize a new Basho state.
 */
export function initializeBasho(world: WorldState, name: import("../../types/basho").BashoName): import("../../types/basho").BashoState {
  return {
    id: `basho_${world.year}_${name}`,
    year: world.year,
    bashoNumber: 1, // Simple increment or lookup needed for real logic
    bashoName: name,
    day: 1,
    currentDay: 1,
    matches: [],
    standings: new Map(),
    isActive: true
  };
}
