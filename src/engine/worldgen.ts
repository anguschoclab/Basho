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
import {
  WorldState, Rikishi, Heya, Oyakata, 
  Rank, TacticalArchetype, StatureBand, PrestigeBand, 
  FacilitiesBand, KoenkaiBandType, OyakataArchetype, 
  BashoName, Division, RikishiStats, Side, BashoState
} from "./types";
import { generateRikishiName } from "./shikona";
import { SeededRNG } from "./utils/SeededRNG";
import { ensureTalentPools } from "./talentpool";


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

function getRandom<T>(rng: SeededRNG, arr: T[]): T {
  return arr[rng.int(0, arr.length - 1)];
}

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

export function generateWorld(seed: string | { seed: string } = "initial-seed"): WorldState {
  // Handle both string and object seed formats
  const actualSeed = typeof seed === "string" ? seed : seed.seed;
  
  const rng = rngFromSeed(actualSeed, "worldgen", "world");
  const heyaMap = new Map<string, Heya>();
  const rikishiMap = new Map<string, Rikishi>();
  const oyakataMap = new Map<string, Oyakata>();

  const heyaNames = ["Isegahama", "Kokonoe", "Takadagawa", "Sadogatake", "Futagoyama", "Arashio", "Miyagino", "Tatsunami"];

  // 1. Create Heyas & Oyakata
  heyaNames.forEach((name, idx) => {
    const heyaId = `heya_${idx}`;
    const oyakataId = `oyakata_${idx}`;
    
    // Detailed Oyakata Generation
    const oyArchetype = getRandom(rng, OYAKATA_ARCHETYPES);
    const oyakata: Oyakata = {
      id: oyakataId,
      heyaId: heyaId,
      name: `${name} Oyakata`,
      age: 45 + rng.int(0, 19),
      archetype: oyArchetype,
      traits: {
        ambition: 50 + rng.next() * 50,
        patience: 50 + rng.next() * 50,
        risk: 50 + rng.next() * 50,
        tradition: 50 + rng.next() * 50,
        compassion: 50 + rng.next() * 50
      },
      yearsInCharge: 1 + rng.int(0, 14),
      // Legacy compat
      stats: { scouting: 50, training: 50, politics: 50 },
      personality: oyArchetype
    };
    oyakataMap.set(oyakataId, oyakata);

    // Detailed Heya Generation
    const heya: Heya = {
      id: heyaId,
      name: name,
      oyakataId: oyakataId,
      rikishiIds: [],
      
      statureBand: "established",
      prestigeBand: "respected",
      facilitiesBand: "adequate",
      koenkaiBand: "moderate",
      runwayBand: "comfortable",

      reputation: 50,
      funds: 10_000_000 + rng.int(0, 50_000_000),
      
      scandalScore: 0,
      governanceStatus: "good_standing",
      welfareState: { welfareRisk: 10, complianceState: "compliant", weeksInState: 0, lastReviewedWeek: 0 },
      
      facilities: {
        training: 50,
        recovery: 50,
        nutrition: 50
      },
      
      riskIndicators: {
        financial: false,
        governance: false,
        rivalry: false
      },
      
      // Legacy
      location: "Tokyo"
    };
    heyaMap.set(heyaId, heya);
  });

  // 2. Create Rikishi (Top Division Population)
  const currentYear = 2024;
  const ranks: Rank[] = ["yokozuna", "ozeki", "ozeki", "sekiwake", "sekiwake", "komusubi", "komusubi"];
  for (let i = 0; i < 35; i++) ranks.push("maegashira");
  for (let i = 0; i < 20; i++) ranks.push("juryo");

  let rikishiCounter = 0;
  const heyaList = Array.from(heyaMap.values());

  ranks.forEach((rank, idx) => {
    const rid = `rikishi_${rikishiCounter++}`;
    const rrng = rngFromSeed(actualSeed, "worldgen", `rikishi::${rid}`);
    
    const heya = getRandom(rrng, heyaList);
    const archetype = getRandom(rrng, ARCHETYPES);
    const origin = getRandom(rrng, ORIGINS);
    const birthYear = currentYear - (20 + rrng.int(0, 11));
    
    const stats = generateRikishiStats(rrng, rank, archetype);

    const newRikishi: Rikishi = {
      id: rid,
      shikona: generateRikishiName(`${actualSeed}::worldgen::rikishi::${rid}`),
      name: `Rikishi ${rid}`,
      heyaId: heya.id,
      nationality: origin === "Mongolia" ? "Mongolia" : "Japan",
      origin: origin, // Legacy compat
      birthYear: birthYear,
      
      // Physicals
      height: 170 + rrng.next() * 25,
      weight: stats.weight,
      
      // Attributes (Stats)
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
      
      // Status
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
      
      // Style
      style: archetype.includes("oshi") ? "oshi" : archetype.includes("yotsu") ? "yotsu" : "hybrid",
      archetype: archetype,
      
      // Rank
      division: rank === "juryo" ? "juryo" : "makuuchi",
      rank: rank,
      rankNumber: Math.floor(idx / 2) + 1,
      side: idx % 2 === 0 ? "east" : "west",
      
      // Records
      careerWins: 0,
      careerLosses: 0,
      currentBashoWins: 0,
      currentBashoLosses: 0,
      careerRecord: { wins: 0, losses: 0, yusho: 0 },
      currentBashoRecord: { wins: 0, losses: 0 },
      
      history: [],
      h2h: {},
      
      favoredKimarite: [],
      weakAgainstStyles: [],
      personalityTraits: []
    };

    rikishiMap.set(rid, newRikishi);
    heya.rikishiIds.push(rid);
  });

  const initialBashoName: BashoName = "hatsu";

  const world: any = {
    id: crypto.randomUUID(),
    seed: actualSeed,
    year: currentYear,
    week: 1,
    cyclePhase: "interim",
    currentBashoName: initialBashoName,
    
    heyas: heyaMap,
    rikishi: rikishiMap,
    oyakata: oyakataMap,
    
    // Legacy arrays for backward compatibility if needed
    heyasArray: Array.from(heyaMap.values()),
    rikishiArray: Array.from(rikishiMap.values()),
    oyakataArray: Array.from(oyakataMap.values()),

    history: [],
    events: { version: "1.0.0", log: [], dedupe: {} },
    ftue: { isActive: false, bashoCompleted: 0, suppressedEvents: [] },
    playerHeyaId: heyaList[0].id,
    
    calendar: {
      year: currentYear,
      month: 1,
      currentWeek: 1,
      currentDay: 1
    },
    
    currentDate: new Date(2024, 0, 1)
  };

  // Persistent Talent Pools (created immediately so scouting has targets)
  try {
    ensureTalentPools(world as WorldState);
  } catch {
    // swallow
  }

  return world as WorldState;
}

export function initializeBasho(world: WorldState, bashoName: string): BashoState {
    const bName = bashoName.toLowerCase() as BashoName;
    return {
        year: world.year,
        bashoNumber: 1 as 1 | 2 | 3 | 4 | 5 | 6, // Type-safe basho number
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
