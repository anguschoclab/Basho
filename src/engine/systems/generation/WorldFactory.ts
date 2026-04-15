/**
 * WorldFactory.ts — Pipeline for generating high-fidelity world state.
 * Decomposes the monolithic worldgen logic into manageable stages.
 */

import { SeededRNG, rngFromSeed } from "../../rng";
import { WorldState } from "../../types/world";
import { Heya } from "../../types/heya";
import { Oyakata, OyakataArchetype } from "../../types/oyakata";
import { Rikishi } from "../../types/rikishi";
import { generateOyakataName } from "../../shikona";
import { seededPick } from "../../utils/random";
import { generateFullRikishi } from "./CandidateGenerator";
import { Division, Rank, Side } from "../../types/banzuke";
import * as talentpool from "./TalentPoolService";
import { generateInitialSponsorPool } from "./SponsorGenerator";
import { createKoenkai } from "../economics/SponsorshipService";
import type { BashoName, BashoState } from "../../types/basho";
import type { Faction, IchimonName } from "../../types/economy";
import { generateOyakata } from "../../oyakataPersonalities";

/**
 * Creates a new Heya and its associated Oyakata.
 */
export function createHeyaWithOyakata(args: {
  id: string;
  name: string;
  rng: SeededRNG;
  tier: number;
}): { heya: Heya; oyakata: Oyakata } {
  const { id, name, rng, tier } = args;
  const oyakataId = rng.uuid("OY");
  const oyakataName = generateOyakataName(`${rng.seed}::oyakata::${oyakataId}`, rng);
  const archetype = seededPick(rng, [
    "traditionalist",
    "scientist",
    "gambler",
    "nurturer",
    "tyrant",
    "strategist",
  ]) as OyakataArchetype;
  const age = 45 + rng.int(0, 20);

  const oyakata = generateOyakata(
    oyakataId,
    id,
    oyakataName,
    age,
    archetype,
    undefined,
    undefined,
    undefined,
    tier
  );

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
    welfareState: {
      welfareRisk: 10,
      activeDiet: "maintenance",
      complianceState: "compliant",
      weeksInState: 0,
      lastReviewedWeek: 0,
    },
    facilities: { training: 50, recovery: 50, nutrition: 50 },
    riskIndicators: { financial: false, governance: false, rivalry: false },
    ichimon: seededPick(rng, ["Dewanoumi", "Nishonoseki", "Takasago", "Tokitsukaze", "Isegahama"]),
    politicalCapital: 100,
    location: "Tokyo",
    lineage: [],
    historicalYusho: 0,
  };

  return { heya, oyakata };
}

export function createStables(worldRng: SeededRNG): {
  heyaMap: Map<string, Heya>;
  oyakataMap: Map<string, Oyakata>;
} {
  const heyaMap = new Map<string, Heya>();
  const oyakataMap = new Map<string, Oyakata>();

  // 1. Create Stables (45 traditional stables)
  const HEYA_NAMES = [
    "Dewanoumi",
    "Nishonoseki",
    "Takasago",
    "Tokitsukaze",
    "Isegahama",
    "Sakaigawa",
    "Kasugano",
    "Kokonoe",
    "Kise",
    "Musashigawa",
    "Kataonami",
    "Onoe",
    "Tatsunami",
    "Minezaki",
    "Tamanoi",
    "Isenoumi",
    "Ajigawa",
    "Sadogatake",
    "Hakkaku",
    "Shibatayama",
    "Michinoku",
    "Miyagino",
    "Oigami",
    "Tagonoura",
    "Naruto",
    "Arashio",
    "Asakayama",
    "Nakagawa",
    "Shikihide",
    "Yamahibiki",
    "Irumagawa",
    "Hanahago",
    "Shirane",
    "Futagoyama",
    "Fujishima",
    "Takadagawa",
    "Magaki",
    "Katsushika",
    "Oshogatsu",
    "Chiganoura",
    "Minato",
    "Shikoroyama",
    "Kagamiyama",
    "Hanakago",
    "Oguruma",
  ];

  HEYA_NAMES.forEach((name, i) => {
    const id = worldRng.uuid("HY");
    const tier = i / HEYA_NAMES.length;
    const { heya, oyakata } = createHeyaWithOyakata({ id, name, rng: worldRng, tier });
    heyaMap.set(id, heya);
    oyakataMap.set(oyakata.id, oyakata);
    heya.rikishiIds = [];
  });

  return { heyaMap, oyakataMap };
}

export function createRosters(
  worldRng: SeededRNG,
  heyaMap: Map<string, Heya>,
  oyakataMap: Map<string, Oyakata>
): Map<string, Rikishi> {
  const rikishiMap = new Map<string, Rikishi>();
  const heyaIds = Array.from(heyaMap.keys());

  // 2. Initial Roster Generation (Rank Distribution)
  // Yokozuna count is variable (0-2) to allow for initial gaps, matching real sumo patterns
  const yokozunaCount = worldRng.int(0, 2);
  const rankConfigs: { rank: Rank; division: Division; count: number }[] = [
    { rank: "yokozuna", division: "makuuchi", count: yokozunaCount },
    { rank: "ozeki", division: "makuuchi", count: 2 },
    { rank: "sekiwake", division: "makuuchi", count: 2 },
    { rank: "komusubi", division: "makuuchi", count: 2 },
    { rank: "maegashira", division: "makuuchi", count: 34 },
    { rank: "juryo", division: "juryo", count: 28 },
    { rank: "makushita", division: "makushita", count: 150 }, // Increased from 120 for more junior wrestlers
    { rank: "sandanme", division: "sandanme", count: 250 }, // Increased from 200 for more junior wrestlers
    { rank: "jonidan", division: "jonidan", count: 250 }, // Increased from 200 for more junior wrestlers
    { rank: "jonokuchi", division: "jonokuchi", count: 150 }, // Increased from 110 for more junior wrestlers
  ];

  rankConfigs.forEach((config) => {
    for (let i = 0; i < config.count; i++) {
      const side: Side = i % 2 === 0 ? "east" : "west";
      const rankNumber =
        config.rank === "maegashira" ||
        config.rank === "juryo" ||
        config.rank === "makushita" ||
        config.rank === "sandanme" ||
        config.rank === "jonidan" ||
        config.rank === "jonokuchi"
          ? Math.floor(i / 2) + 1
          : 1;

      const rikishiId = worldRng.uuid("RK");

      // Randomly assign to a stable first
      const heyaId = worldRng.pick(heyaIds);
      const heya = heyaMap.get(heyaId);
      const oyakata = oyakataMap.get(heya?.oyakataId || "");

      const r = generateFullRikishi({
        id: rikishiId,
        rng: worldRng,
        currentYear: 2025,
        rank: config.rank,
        division: config.division,
        side,
        rankNumber,
        legacyShikona: oyakata?.formerShikona,
      });

      r.heyaId = heyaId;
      heya?.rikishiIds?.push(r.id);
      rikishiMap.set(r.id, r);
    }
  });

  return rikishiMap;
}

/**
 * Main orchestrator for world generation.
 */
export function generateInitialWorld(seed: string): WorldState {
  const worldRng = rngFromSeed(seed, "worldgen", "world");

  // 1. Create Stables
  const { heyaMap, oyakataMap } = createStables(worldRng);

  // 2. Initial Roster Generation
  const rikishiMap = createRosters(worldRng, heyaMap, oyakataMap);

  const world: WorldState = {
    id: worldRng.uuid("WD"),
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
    playerHeyaId: Array.from(heyaMap.keys())[0],
    almanacSnapshots: [],
    factions: createInitialFactions(worldRng),
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    records: {
      allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    },
    settings: { archiveMode: "standard" },
    planetRating: 50,
    isInitialSeed: true,
    sponsorPool: generateInitialSponsorPool(seed),
    trainingState: new Map(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Object has extra properties (planetRating, isInitialSeed) not in WorldState interface
  } as any;

  // 3. Establish Initial Koenkai Relationships (Constitution A6)
  if (world.sponsorPool) {
    for (const heya of world.heyas.values()) {
      const koenkai = createKoenkai(
        heya.id,
        world.sponsorPool,
        "unknown",
        worldRng,
        world.dayIndexGlobal
      );
      world.sponsorPool.koenkais.set(koenkai.koenkaiId, koenkai);
      // Link heya to koenkai
      heya.koenkaiId = koenkai.koenkaiId;
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
export function initializeBasho(world: WorldState, name: BashoName): BashoState {
  const rng = rngFromSeed(world.seed, "basho", `${world.year}-${name}`);
  return {
    id: rng.uuid("BS"),
    year: world.year,
    bashoNumber: 1,
    bashoName: name,
    day: 1,
    currentDay: 1,
    matches: [],
    standings: new Map(),
    isActive: true,
  };
}

function createInitialFactions(rng: SeededRNG): Record<string, Faction> {
  const names: IchimonName[] = ["Dewanoumi", "Nishonoseki", "Takasago", "Tokitsukaze", "Isegahama"];
  const factions: Record<string, Faction> = {};

  names.forEach((name) => {
    const id = rng.uuid("FN");
    factions[id] = {
      id: name, // The type Faction uses IchimonName as ID internally (A6.2 compliance)
      name: `${name} Ichimon`,
      influence: 50,
      oyakataLeaderId: null,
    };
  });

  return factions;
}
