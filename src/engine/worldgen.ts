/**
 * File Name: src/engine/worldgen.ts
 * Notes:
 * - COMPLETE OVERHAUL to generate high-fidelity world state.
 * - Generates Rikishi with detailed stats, archetypes, and styles.
 * - Generates Heyas with stature, prestige, and facilities bands.
 * - Generates Oyakata with personality traits and archetypes.
 * - Returns a WorldState populated with Maps as per new types.
 */

import { rngFromSeed } from "./rng";
import { WorldState } from "./types/world";
import { Rikishi, RikishiStats } from "./types/rikishi";
import { Heya } from "./types/heya";
import { Oyakata, OyakataArchetype } from "./types/oyakata";
import { Rank, Division, Side } from "./types/banzuke";
import { TacticalArchetype } from "./types/combat";
import { StatureBand, PrestigeBand, FacilitiesBand, KoenkaiBandType, RunwayBand } from "./types/narrative";
import { BashoName, BashoState } from "./types/basho";
import { generateRikishiName } from "./shikona";
import { SeededRNG } from "./rng";
import { generateStaff } from "./staff";
import { Staff } from "./types/staff";
import { ensureTalentPools } from "./talentpool";
import { generateSponsorPool, createKoenkai, type SponsorPool } from "./sponsors";
import { type IchimonName, type Faction } from "./types/economy";
import { rngForWorld } from "./rng";
import { createDefaultMediaState } from "./media";
import { BASHO_ORDER } from "./calendar";



const ICHIMONS: IchimonName[] = ["Dewanoumi", "Nishonoseki", "Takasago", "Tokitsukaze", "Isegahama"];
// Constants
const ORIGINS = [
  "Hokkaido", "Aomori", "Tokyo", "Osaka", "Fukuoka", 
  "Mongolia", "Georgia", "Brazil", "Nihon University", "Nippon Sport Science Univ"
];

const ARCHETYPES: TacticalArchetype[] = [
  "oshi_specialist", "yotsu_specialist", "speedster", 
  "trickster", "all_rounder", "hybrid_oshi_yotsu", "counter_specialist"
];

const OYAKATA_ARCHETYPES: OyakataArchetype[] = [
  "traditionalist", "scientist", "gambler", "nurturer", "tyrant", "strategist"
];

/**
 * Get random.
 *  * @param rng - The Rng.
 *  * @param arr - The Arr.
 *  * @returns The result.
 */
function getRandom<T>(rng: SeededRNG, arr: T[]): T {
  return arr[rng.int(0, arr.length - 1)];
}

/**
 * Generate realistic synthetic career records for worldgen rikishi.
 * Based on real sumo data:
 * - Sekitori fight 15 bouts/basho (6 basho/year)
 * - Lower divisions fight 7 bouts/basho
 * - Win rates correlate strongly with rank
 * - Time in career correlates with rank (yokozuna = veteran)
 */
function generateSyntheticCareer(
  rng: SeededRNG,
  rank: Rank,
  division: Division,
  birthYear: number,
  currentYear: number,
): { careerWins: number; careerLosses: number; careerRecord: { wins: number; losses: number; yusho: number } } {
  const age = currentYear - birthYear;
  // Debut age typically 15-18 for lower division, older for college recruits
  const debutAge = rank === "yokozuna" || rank === "ozeki" ? 15 + rng.int(0, 3)
    : rank === "sekiwake" || rank === "komusubi" ? 16 + rng.int(0, 3)
    : rank === "maegashira" ? 17 + rng.int(0, 4)
    : rank === "juryo" ? 18 + rng.int(0, 3)
    : 18 + rng.int(0, 2);

  const yearsActive = Math.max(1, age - debutAge);
  const bashoCount = yearsActive * 6;

  // Bouts per basho depends on division
  const boutsPerBasho = ["makuuchi", "juryo"].includes(division) ? 15 : 7;

  // Win rate by rank (realistic ranges from real sumo data)
  let winRateBase: number;
  let winRateVariance: number;
  let yushoChance: number; // per basho chance of yusho

  switch (rank) {
    case "yokozuna":
      winRateBase = 0.72; winRateVariance = 0.06; yushoChance = 0.15;
      break;
    case "ozeki":
      winRateBase = 0.62; winRateVariance = 0.05; yushoChance = 0.05;
      break;
    case "sekiwake":
      winRateBase = 0.57; winRateVariance = 0.05; yushoChance = 0.02;
      break;
    case "komusubi":
      winRateBase = 0.52; winRateVariance = 0.06; yushoChance = 0.01;
      break;
    case "maegashira":
      winRateBase = 0.48; winRateVariance = 0.08; yushoChance = 0.003;
      break;
    case "juryo":
      winRateBase = 0.47; winRateVariance = 0.08; yushoChance = 0.005;
      break;
    default: // lower divisions
      winRateBase = 0.45; winRateVariance = 0.10; yushoChance = 0.002;
      break;
  }

  const winRate = Math.max(0.25, Math.min(0.85, winRateBase + (rng.next() - 0.5) * winRateVariance * 2));
  const totalBouts = bashoCount * boutsPerBasho;
  const wins = Math.round(totalBouts * winRate);
  const losses = totalBouts - wins;

  // Yusho count
  let yusho = 0;
  for (let i = 0; i < bashoCount; i++) {
    if (rng.next() < yushoChance) yusho++;
  }

  return {
    careerWins: wins,
    careerLosses: losses,
    careerRecord: { wins, losses, yusho },
  };
}

/**
 * Generate rikishi stats.
 *  * @param rng - The Rng.
 *  * @param rank - The Rank.
 *  * @param archetype - The Archetype.
 *  * @returns The result.
 */
function generateRikishiStats(rng: SeededRNG, rank: Rank, archetype: TacticalArchetype): RikishiStats {
  const base = rank === "yokozuna" ? 85 :
               rank === "ozeki" ? 75 :
               rank === "sekiwake" || rank === "komusubi" ? 65 :
               rank === "maegashira" ? 55 : 40;
  
  const variance = () => (rng.next() * 20) - 10;

  // Multipliers based on archetype
  let strMod = 1, techMod = 1, spdMod = 1, wgtMod = 1, menMod = 1;

  switch (archetype) {
    case "oshi_specialist": strMod = 1.3; spdMod = 1.1; techMod = 0.8; break;
    case "yotsu_specialist": strMod = 1.2; techMod = 1.2; spdMod = 0.9; break;
    case "speedster": spdMod = 1.4; wgtMod = 0.8; strMod = 0.9; break;
    case "trickster": techMod = 1.4; strMod = 0.8; menMod = 1.2; break;
    case "all_rounder": break; // Balanced
    case "hybrid_oshi_yotsu": strMod = 1.1; techMod = 1.1; break;
    case "counter_specialist": menMod = 1.3; techMod = 1.2; strMod = 0.9; break;
  }

  const clamp = (val: number) => Math.min(100, Math.max(10, Math.round(val)));

  return {
    strength: clamp((base + variance()) * strMod),
    technique: clamp((base + variance()) * techMod),
    speed: clamp((base + variance()) * spdMod),
    weight: Math.round(Math.min(250, Math.max(90, (140 + variance() * 2) * wgtMod))),
    stamina: clamp(base + variance()),
    mental: clamp((base + variance()) * menMod),
    adaptability: clamp((base + variance()) * (techMod > 1 ? 1.1 : 1.0)),
    balance: clamp(base + variance()),
  };
}

/**
 * Generate world.
 *  * @param seed - The Seed.
 *  * @returns The result.
 */
export function generateWorld(seed: any = "initial-seed"): WorldState {
  // Handle both string and object seed formats
  const actualSeed = typeof seed === "string" ? seed : seed?.seed || "initial-seed";
  
  const rng = rngFromSeed(actualSeed, "worldgen", "world");
  const heyaMap = new Map<string, Heya>();
  const rikishiMap = new Map<string, Rikishi>();
  const oyakataMap = new Map<string, Oyakata>();

  // Authentic heya names — 46 stables per Constitution requirement (45+)
  const heyaNames = [
    // Legendary / Powerful stables
    "Isegahama", "Kokonoe", "Takadagawa", "Sadogatake", "Futagoyama",
    "Dewanoumi", "Tokitsukaze", "Tagonoura", "Nishonoseki", "Kasugano",
    // Established stables
    "Arashio", "Miyagino", "Tatsunami", "Musashigawa", "Takasago",
    "Azumazeki", "Hakkaku", "Oguruma", "Michinoku", "Onomatsu",
    "Isenoumi", "Oitekaze", "Shikoroyama", "Minezaki", "Tamanoi",
    // Mid-tier stables
    "Tomozuna", "Naruto", "Kise", "Sakaigawa", "Irumagawa",
    "Onogawa", "Asakayama", "Takekuma", "Oshiogawa", "Hanakago",
    "Shikihide", "Minato", "Kataonami", "Nishikido", "Asahiyama",
    // Rebuilding / Fragile stables
    "Kagamiyama", "Tatsutagawa", "Chiganoura", "Otake", "Kiriyama",
    "Magaki",
  ];

  const STATURE_BANDS: StatureBand[] = ["legendary", "powerful", "established", "rebuilding", "fragile"];
  const PRESTIGE_BANDS: PrestigeBand[] = ["elite", "respected", "modest", "struggling", "unknown"];
  const FACILITY_BANDS: FacilitiesBand[] = ["world_class", "excellent", "adequate", "basic", "minimal"];
  const RUNWAY_BANDS: RunwayBand[] = ["secure", "comfortable", "tight", "critical"];

  // 1. Create Heyas & Oyakata
  heyaNames.forEach((name, idx) => {
    const heyaId = `heya_${idx}`;
    const oyakataId = `oyakata_${idx}`;
    const hRng = rngFromSeed(actualSeed, "worldgen", `heya::${heyaId}`);

    // Tier distribution: first ~10 are strong, middle ~15 are established, rest are weaker
    const tierPos = idx / heyaNames.length; // 0..1
    let statureIdx: number, prestigeIdx: number, facilityIdx: number, runwayIdx: number;
    if (tierPos < 0.22) {
      // Top tier
      statureIdx = hRng.int(0, 1);   // legendary or powerful
      prestigeIdx = hRng.int(0, 1);  // elite or respected
      facilityIdx = hRng.int(0, 1);  // world_class or excellent
      runwayIdx = hRng.int(0, 1);    // secure or comfortable
    } else if (tierPos < 0.55) {
      // Mid tier
      statureIdx = hRng.int(1, 2);   // powerful or established
      prestigeIdx = hRng.int(1, 2);  // respected or modest
      facilityIdx = hRng.int(1, 2);  // excellent or adequate
      runwayIdx = hRng.int(1, 2);    // comfortable or tight
    } else if (tierPos < 0.85) {
      // Lower-mid tier
      statureIdx = hRng.int(2, 3);   // established or rebuilding
      prestigeIdx = hRng.int(2, 3);  // modest or struggling
      facilityIdx = hRng.int(2, 3);  // adequate or basic
      runwayIdx = hRng.int(1, 2);
    } else {
      // Bottom tier
      statureIdx = hRng.int(3, 4);   // rebuilding or fragile
      prestigeIdx = hRng.int(3, 4);  // struggling or unknown
      facilityIdx = hRng.int(3, 4);  // basic or minimal
      runwayIdx = hRng.int(2, 3);    // tight or critical
    }

    // Detailed Oyakata Generation
    const oyArchetype = getRandom(hRng, OYAKATA_ARCHETYPES);
    const oyakata: Oyakata = {
      id: oyakataId,
      heyaId: heyaId,
      name: `${name} Oyakata`,
      age: 45 + hRng.int(0, 19),
      archetype: oyArchetype,
      traits: {
        ambition: 50 + hRng.next() * 50,
        patience: 50 + hRng.next() * 50,
        risk: 50 + hRng.next() * 50,
        tradition: 50 + hRng.next() * 50,
        compassion: 50 + hRng.next() * 50
      },
      yearsInCharge: 1 + hRng.int(0, 14),
      stats: { scouting: 50, training: 50, politics: 50 },
      personality: oyArchetype
    };
    oyakataMap.set(oyakataId, oyakata);

    const baseFunds = tierPos < 0.22 ? 40_000_000 : tierPos < 0.55 ? 20_000_000 : tierPos < 0.85 ? 10_000_000 : 5_000_000;
    const facilityBase = tierPos < 0.22 ? 70 : tierPos < 0.55 ? 55 : tierPos < 0.85 ? 40 : 25;

    // Detailed Heya Generation
    const heya: Heya = {
      id: heyaId,
      name: name,
      oyakataId: oyakataId,
      rikishiIds: [],
      
      statureBand: STATURE_BANDS[statureIdx],
      prestigeBand: PRESTIGE_BANDS[prestigeIdx],
      facilitiesBand: facilityBase >= 55 ? "world_class" as const : facilityBase >= 40 ? "excellent" as const : facilityBase >= 25 ? "adequate" as const : facilityBase >= 15 ? "basic" as const : "minimal" as const,
      koenkaiBand: "moderate",
      runwayBand: RUNWAY_BANDS[runwayIdx],

      reputation: Math.round(80 - tierPos * 60 + (hRng.next() * 20 - 10)),
      funds: baseFunds + hRng.int(0, 20_000_000),
      
      scandalScore: 0,
      governanceStatus: "good_standing",
      welfareState: { welfareRisk: 10, complianceState: "compliant", weeksInState: 0, lastReviewedWeek: 0 },
      
      facilities: {
        training: Math.round(facilityBase + hRng.next() * 20),
        recovery: Math.round(facilityBase + hRng.next() * 20),
        nutrition: Math.round(facilityBase + hRng.next() * 20)
      },
      
      riskIndicators: {
        financial: runwayIdx >= 3,
        governance: false,
        rivalry: false
      },
      ichimon: getRandom(hRng, ICHIMONS),
      politicalCapital: hRng.int(50, 200),
      
      location: getRandom(hRng, ["Tokyo", "Tokyo", "Tokyo", "Osaka", "Nagoya", "Fukuoka"])
    };
    heyaMap.set(heyaId, heya);
  });

  // 2. Create Rikishi — enough to populate 46 stables realistically
  // Real sumo: ~700 total rikishi, ~70 sekitori (makuuchi 42 + juryo 28)
  const currentYear = 2025;

  // Build rank slots with proper east/west pairing
  interface RankSlot { rank: Rank; division: Division; rankNumber: number; side: Side }
  const rankSlots: RankSlot[] = [];

  // Sanyaku ranks (1 east, 1 west each — except yokozuna can have 1-2)
  const sanyakuDef: Array<{ rank: Rank; count: number }> = [
    { rank: "yokozuna", count: 1 },  // 1 yokozuna (east only initially)
    { rank: "ozeki", count: 2 },
    { rank: "sekiwake", count: 2 },
    { rank: "komusubi", count: 2 },
  ];
  for (const { rank, count } of sanyakuDef) {
    for (let i = 0; i < count; i++) {
      rankSlots.push({ rank, division: "makuuchi", rankNumber: 1, side: i % 2 === 0 ? "east" : "west" });
    }
  }

  // Maegashira: 16 ranks × 2 sides = 32 + 7 sanyaku ≈ 42 makuuchi
  for (let n = 1; n <= 17; n++) {
    rankSlots.push({ rank: "maegashira", division: "makuuchi", rankNumber: n, side: "east" });
    rankSlots.push({ rank: "maegashira", division: "makuuchi", rankNumber: n, side: "west" });
  }

  // Juryo: 14 ranks × 2 sides = 28
  for (let n = 1; n <= 14; n++) {
    rankSlots.push({ rank: "juryo", division: "juryo", rankNumber: n, side: "east" });
    rankSlots.push({ rank: "juryo", division: "juryo", rankNumber: n, side: "west" });
  }

  // Lower divisions to fill stables
  const lowerDivisions: Array<{ rank: Rank; division: Division; count: number }> = [
    { rank: "makushita", division: "makushita", count: 120 },
    { rank: "sandanme", division: "sandanme", count: 100 },
    { rank: "jonidan", division: "jonidan", count: 80 },
    { rank: "jonokuchi", division: "jonokuchi", count: 30 },
  ];
  for (const { rank, division, count } of lowerDivisions) {
    for (let i = 0; i < count; i++) {
      rankSlots.push({
        rank,
        division,
        rankNumber: Math.floor(i / 2) + 1,
        side: i % 2 === 0 ? "east" : "west",
      });
    }
  }

  let rikishiCounter = 0;
  const heyaList = Array.from(heyaMap.values());

  rankSlots.forEach((slot) => {
    const rid = `rikishi_${rikishiCounter++}`;
    const rrng = rngFromSeed(actualSeed, "worldgen", `rikishi::${rid}`);
    
    const heya = getRandom(rrng, heyaList);
    const archetype = getRandom(rrng, ARCHETYPES);
    const origin = getRandom(rrng, ORIGINS);
    const birthYear = currentYear - (20 + rrng.int(0, 11));
    
    const stats = generateRikishiStats(rrng, slot.rank, archetype);

    const newRikishi: Rikishi = {
      id: rid,
      shikona: generateRikishiName(`${actualSeed}::worldgen::rikishi::${rid}`),
      name: `Rikishi ${rid}`,
      heyaId: heya.id,
      nationality: origin === "Mongolia" ? "Mongolia" : "Japan",
      origin: origin,
      birthYear: birthYear,
      
      height: 170 + rrng.next() * 25,
      weight: stats.weight,
      
      stats: stats,
      power: stats.strength,
      speed: stats.speed,
      balance: stats.balance,
      technique: stats.technique,
      aggression: stats.mental,
      experience: rrng.int(0, 99),
      adaptability: stats.adaptability,
      fatigue: 0,
      
      momentum: 50,
      stamina: stats.stamina,
      
      injuryStatus: {
        type: "none",
        isInjured: false,
        severity: 0,
        location: "",
        weeksRemaining: 0,
        weeksToHeal: 0
      },
      injured: false,
      injuryWeeksRemaining: 0,
      condition: 90 + rrng.next() * 10,
      motivation: 50 + rrng.next() * 50,
      talentSeed: Math.round(25 + rrng.next() * 65),
      
      style: archetype.includes("oshi") ? "oshi" : archetype.includes("yotsu") ? "yotsu" : "hybrid",
      archetype: archetype,
      
      division: slot.division,
      rank: slot.rank,
      rankNumber: slot.rankNumber,
      side: slot.side,
      
      ...generateSyntheticCareer(rrng, slot.rank, slot.division, birthYear, currentYear),
      currentBashoWins: 0,
      currentBashoLosses: 0,
      currentBashoRecord: { wins: 0, losses: 0 },
      
      history: [],
      h2h: {},
      
      favoredKimarite: [],
      weakAgainstStyles: [],
      personalityTraits: []
    };

    rikishiMap.set(rid, newRikishi);
    if (!heya.rikishiIds) heya.rikishiIds = [];
    heya.rikishiIds.push(rid);
  });

  const initialBashoName: BashoName = "hatsu";


  const initialFactions: Record<IchimonName, Faction> = {
    Dewanoumi: { id: "Dewanoumi", name: "Dewanoumi Ichimon", influence: 100, oyakataLeaderId: null },
    Nishonoseki: { id: "Nishonoseki", name: "Nishonoseki Ichimon", influence: 80, oyakataLeaderId: null },
    Takasago: { id: "Takasago", name: "Takasago Ichimon", influence: 70, oyakataLeaderId: null },
    Tokitsukaze: { id: "Tokitsukaze", name: "Tokitsukaze Ichimon", influence: 60, oyakataLeaderId: null },
    Isegahama: { id: "Isegahama", name: "Isegahama Ichimon", influence: 90, oyakataLeaderId: null }
  };

  // Assign leaders to initial factions
  for (const heya of heyaList) {
    if (heya.ichimon && !initialFactions[heya.ichimon].oyakataLeaderId) {
       initialFactions[heya.ichimon].oyakataLeaderId = heya.oyakataId;
    }
  }

  const world: WorldState = {
    id: crypto.randomUUID(),
    seed: actualSeed,
    year: currentYear,
    week: 1,
    dayIndexGlobal: 0,
    cyclePhase: "interim",
    currentBashoName: initialBashoName,
    
    heyas: heyaMap,
    rikishi: rikishiMap,
    oyakata: oyakataMap,

    history: [],
    events: { version: "1.0.0", log: [], dedupe: {} },
    // FTUE: active for first basho per constitution A8
    ftue: { isActive: true, bashoCompleted: 0, suppressedEvents: [] },
    playerHeyaId: heyaList[0].id,
    
    // Almanac snapshots (Constitution A5.2)
    almanacSnapshots: [],
    
    factions: initialFactions,
    calendar: {
      year: currentYear,
      month: 1,
      currentWeek: 1,
      currentDay: 1
    },
  } as WorldState;

  // Persistent Talent Pools (created immediately so scouting has targets)
  try {
    ensureTalentPools(world);
  } catch {
    // swallow
  }

  // Sponsor Pool & Kōenkai initialization (Constitution A6.4)
  try {
    const sponsorPool = generateSponsorPool(actualSeed);
    world.sponsorPool = sponsorPool;

    // Create kōenkai for each heya
    for (const heya of heyaMap.values()) {
      const koenkaiRng = rngFromSeed(actualSeed, "sponsors", `koenkai::${heya.id}`);
      const koenkai = createKoenkai(heya.id, sponsorPool, heya.prestigeBand, koenkaiRng, 0);
      sponsorPool.koenkais.set(koenkai.koenkaiId, koenkai);
      heya.koenkaiBand = koenkai.strengthBand;
    }
  } catch {
    // swallow
  }

  // Initialize media state (Constitution: media system drives headlines + popularity)
  world.mediaState = createDefaultMediaState();

  return world;
}

/**
 * Initialize basho.
 *  * @param world - The World.
 *  * @param bashoName - The Basho name.
 *  * @returns The result.
 */
export function initializeBasho(world: WorldState, bashoName: string): BashoState {
    const bName = bashoName.toLowerCase() as BashoName;
    const bashoNumber = (BASHO_ORDER.indexOf(bName) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    return {
        year: world.year,
        bashoNumber: bashoNumber || 1,
        bashoName: bName,
        day: 1,
        matches: [],
        standings: new Map(),
        isActive: true,
        // Legacy
        id: `${bName}-${world.year}`,
        name: bName,
        currentDay: 1,
        schedule: [],
        results: []
    };
}

// --- Back-compat re-exports ---
// GameContext (and some legacy code) import scheduling helpers from `worldgen.ts`.
// Keep the API stable by re-exporting the canonical implementation.
export { generateDaySchedule } from "./schedule";
