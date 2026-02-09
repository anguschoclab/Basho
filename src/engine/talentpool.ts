// talentpool.ts
// Persistent Talent Pool system (Constitution A8 / System 4)
//
// Goals:
// - Recruits exist as "people" in pools BEFORE they enter the world as rikishi.
// - Scouting reveals, not creates.
// - Deterministic generation from world seed.
// - Supports domestic (high school / university) and foreign pools.

import type {
  WorldState,
  TalentPoolWorldState,
  TalentPoolType,
  TalentPoolState,
  TalentCandidate,
  VisibilityBand,
  SuitorRef,
  SuitorInterestBand,
  SuitorOfferType,
  Rank,
  Rikishi,
  TacticalArchetype,
  Style,
  OyakataTraits,
  Id
} from "./types";

import { rngFromSeed, rngForWorld } from "./rng";
import { generateRikishiName } from "./shikona";
import { determineNPCStyleBias } from "./npcAI";

const VERSION: TalentPoolWorldState["version"] = "1.0.0";

// Sumo typically enforces a one-foreign-born-per-heya rule.
// Centralize the rule here so both UI gating and NPC AI stay consistent.
export const FOREIGN_RIKISHI_LIMIT_PER_HEYA = 1;

const POOL_TYPES: TalentPoolType[] = ["high_school", "university", "foreign"];

const ARCHETYPES: TacticalArchetype[] = [
  "oshi_specialist",
  "yotsu_specialist",
  "speedster",
  "trickster",
  "all_rounder",
  "hybrid_oshi_yotsu",
  "counter_specialist"
];

const DOMESTIC_REGIONS = ["Hokkaido", "Aomori", "Tokyo", "Osaka", "Fukuoka", "Nagano", "Aichi", "Saitama"];
const FOREIGN_REGIONS = ["Mongolia", "Georgia", "Brazil", "Ukraine", "USA", "Bulgaria"];

export type OfferResult =
  | { ok: true; signed: true; rikishiId: Id }
  | { ok: true; signed: false; reason: string }
  | { ok: false; reason: string };

function styleFromArchetype(archetype: TacticalArchetype): Style {
  if (archetype.includes("oshi")) return "oshi";
  if (archetype.includes("yotsu")) return "yotsu";
  return "hybrid";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function getWeek(world: WorldState): number {
  return typeof (world as any).week === "number" ? (world as any).week : (world as any).calendar?.currentWeek ?? 0;
}

function ensureWorldPool(world: WorldState): TalentPoolWorldState {
  const w = world as any;
  if (w.talentPool && w.talentPool.version === VERSION) return w.talentPool as TalentPoolWorldState;

  const baseWeek = getWeek(world);

  const pools: Record<TalentPoolType, TalentPoolState> = {
    high_school: {
      poolId: `pool_hs_${world.seed}`,
      poolType: "high_school",
      refreshCadence: "yearly",
      populationCap: 28,
      hiddenReserveCap: 64,
      candidatesVisible: [],
      candidatesHidden: [],
      lastRefreshWeek: baseWeek,
      scarcityBand: "normal",
      qualityBand: "normal"
    },
    university: {
      poolId: `pool_uni_${world.seed}`,
      poolType: "university",
      refreshCadence: "yearly",
      populationCap: 20,
      hiddenReserveCap: 48,
      candidatesVisible: [],
      candidatesHidden: [],
      lastRefreshWeek: baseWeek,
      scarcityBand: "normal",
      qualityBand: "normal"
    },
    foreign: {
      poolId: `pool_for_${world.seed}`,
      poolType: "foreign",
      refreshCadence: "yearly",
      populationCap: 12,
      hiddenReserveCap: 24,
      candidatesVisible: [],
      candidatesHidden: [],
      lastRefreshWeek: baseWeek,
      scarcityBand: "tight",
      qualityBand: "normal"
    }
  };

  const created: TalentPoolWorldState = {
    version: VERSION,
    lastYearlyRefreshYear: world.year - 1,
    candidates: {},
    pools,
    playerScouting: {}
  };

  w.talentPool = created;
  return created;
}

function candidateKey(world: WorldState, poolType: TalentPoolType, year: number, idx: number): string {
  return `${world.seed}::talentpool::${poolType}::${year}::${idx}`;
}

function createCandidate(world: WorldState, poolType: TalentPoolType, year: number, idx: number): TalentCandidate {
  const key = candidateKey(world, poolType, year, idx);
  const rng = rngFromSeed(world.seed, "talentpool", key);

  const archetype = ARCHETYPES[rng.int(0, ARCHETYPES.length - 1)];
  const style = styleFromArchetype(archetype);

  const isUni = poolType === "university";
  const isForeign = poolType === "foreign";

  const baseAge = isUni ? 21 : 16;
  const age = baseAge + rng.int(0, isUni ? 3 : 2);

  const originRegion = isForeign
    ? FOREIGN_REGIONS[rng.int(0, FOREIGN_REGIONS.length - 1)]
    : DOMESTIC_REGIONS[rng.int(0, DOMESTIC_REGIONS.length - 1)];

  const nationality = isForeign ? originRegion : "Japan";

  const isAmateurStar = rng.bool(isUni ? 0.08 : 0.04);

  const qualityBoost = isAmateurStar ? 18 : isUni ? 8 : 0;
  const talentSeed = clamp(Math.round(35 + rng.next() * 45 + qualityBoost), 10, 100);

  const heightPotentialCm = clamp(Math.round(170 + rng.next() * 18 + (isForeign ? 3 : 0)), 160, 205);
  const weightPotentialKg = clamp(Math.round(105 + rng.next() * 70 + (isForeign ? 10 : 0)), 85, 220);

  const discipline = clamp(Math.round(30 + rng.next() * 60 + (isUni ? 8 : 0)), 0, 100);
  const volatility = clamp(Math.round(20 + rng.next() * 70 + (archetype === "trickster" ? 10 : 0)), 0, 100);

  const tags: string[] = [];
  if (discipline >= 75) tags.push("disciplined");
  if (volatility >= 75) tags.push("volatile");
  if (isAmateurStar) tags.push("amateur_star");
  if (talentSeed >= 80) tags.push("high_ceiling");

  // Visibility: most start hidden; a few are public (stars), and some rumored.
  const visibilityBand: VisibilityBand = isAmateurStar
    ? "public"
    : rng.bool(0.15)
      ? "rumored"
      : "hidden";

  const personId = `person_${key}`;
  const candidateId = `cand_${key}`;
  const name = generateRikishiName(`${world.seed}::talentpool::name::${key}`);

  return {
    candidateId,
    personId,
    name,
    birthYear: year - age,
    originRegion,
    nationality,
    visibilityBand,
    reputationSeed: clamp(Math.round(20 + rng.next() * 60 + (isAmateurStar ? 15 : 0)), 0, 100),
    tags,
    availabilityState: "available",
    competingSuitors: [],
    archetype,
    style,
    heightPotentialCm,
    weightPotentialKg,
    talentSeed,
    temperament: { discipline, volatility },
    isAmateurStar
  };
}

export function getForeignCountInHeya(world: WorldState, heyaId: Id): number {
  let count = 0;
  for (const r of world.rikishi.values()) {
    if (r.heyaId !== heyaId) continue;
    if ((r.nationality || "Japan") !== "Japan") count += 1;
  }
  return count;
}

function getForeignCommitmentsInTalks(world: WorldState, heyaId: Id): number {
  const tp = ensureWorldPool(world);
  let n = 0;
  for (const c of Object.values(tp.candidates)) {
    if (!c) continue;
    if (c.availabilityState !== "in_talks") continue;
    if (!countsAsForeign(c)) continue;
    if (c.competingSuitors.some((s) => s.heyaId === heyaId)) n += 1;
  }
  return n;
}

export function ensureTalentPools(world: WorldState): TalentPoolWorldState {
  const tp = ensureWorldPool(world);
  // Ensure we have a cohort for the current year.
  if (tp.lastYearlyRefreshYear !== world.year) refreshYearlyCohort(world, world.year);
  return tp;
}

export function refreshYearlyCohort(world: WorldState, year: number): void {
  const tp = ensureWorldPool(world);
  const week = getWeek(world);

  // Generate deterministic sizes per pool (bounded).
  const sizeRng = rngFromSeed(world.seed, "talentpool", `yearly_sizes::${year}`);
  const sizes: Record<TalentPoolType, number> = {
    high_school: clamp(18 + sizeRng.int(0, 18), 12, 36),
    university: clamp(10 + sizeRng.int(0, 12), 8, 24),
    foreign: clamp(4 + sizeRng.int(0, 6), 2, 12)
  };

  for (const poolType of POOL_TYPES) {
    const pool = tp.pools[poolType];
    pool.candidatesVisible = pool.candidatesVisible.filter((id) => tp.candidates[id] && tp.candidates[id].availabilityState !== "withdrawn");
    pool.candidatesHidden = pool.candidatesHidden.filter((id) => tp.candidates[id] && tp.candidates[id].availabilityState !== "withdrawn");

    // Create new cohort entries into hidden reserve.
    for (let i = 0; i < sizes[poolType]; i++) {
      const c = createCandidate(world, poolType, year, i);
      tp.candidates[c.candidateId] = c;
      // Public & rumored are visible immediately, others go to hidden.
      if (c.visibilityBand === "public" || c.visibilityBand === "rumored") {
        pool.candidatesVisible.push(c.candidateId);
      } else {
        pool.candidatesHidden.push(c.candidateId);
      }
    }

    // Cap visible + hidden lists.
    pool.candidatesVisible = pool.candidatesVisible.slice(0, pool.populationCap);
    pool.candidatesHidden = pool.candidatesHidden.slice(0, pool.hiddenReserveCap);
    pool.lastRefreshWeek = week;
  }

  tp.lastYearlyRefreshYear = year;
}

export function getPool(world: WorldState, poolType: TalentPoolType): TalentPoolState {
  return ensureWorldPool(world).pools[poolType];
}

export function listVisibleCandidates(world: WorldState, poolType: TalentPoolType): TalentCandidate[] {
  const tp = ensureTalentPools(world);
  const pool = tp.pools[poolType];
  return pool.candidatesVisible
    .map((id) => tp.candidates[id])
    .filter(Boolean)
    .filter((c) => c.availabilityState !== "withdrawn");
}

export function getCandidate(world: WorldState, candidateId: Id): TalentCandidate | null {
  const tp = ensureTalentPools(world);
  return tp.candidates[candidateId] ?? null;
}

export function getCandidateScoutingLevel(world: WorldState, candidateId: Id): number {
  const tp = ensureWorldPool(world);
  return tp.playerScouting?.[candidateId]?.scoutingLevel ?? 0;
}

export function scoutPool(world: WorldState, poolType: TalentPoolType, opts?: { revealCount?: number; cost?: number }): { revealed: TalentCandidate[]; spent: number } {
  const tp = ensureTalentPools(world);
  const pool = tp.pools[poolType];
  const revealCount = clamp(opts?.revealCount ?? 1, 1, 3);
  const cost = Math.max(0, Math.round(opts?.cost ?? (poolType === "foreign" ? 250_000 : poolType === "university" ? 150_000 : 100_000)));

  const playerHeyaId = (world as any).playerHeyaId as string | undefined;
  if (playerHeyaId) {
    const heya = world.heyas.get(playerHeyaId);
    if (heya && typeof heya.funds === "number" && heya.funds < cost) return { revealed: [], spent: 0 };
    if (heya) heya.funds -= cost;
  }

  const revealed: TalentCandidate[] = [];

  const rng = rngForWorld(world, "talentpool", `reveal::${poolType}::w${getWeek(world)}`);
  for (let i = 0; i < revealCount; i++) {
    if (pool.candidatesHidden.length === 0) break;
    const idx = rng.int(0, pool.candidatesHidden.length - 1);
    const id = pool.candidatesHidden.splice(idx, 1)[0];
    const c = tp.candidates[id];
    if (!c) continue;
    // Move to visible as obscure (player sees "Unknown prospect" until scouted further).
    c.visibilityBand = c.visibilityBand === "hidden" ? "obscure" : c.visibilityBand;
    pool.candidatesVisible.unshift(id);
    revealed.push(c);
  }

  pool.candidatesVisible = pool.candidatesVisible.slice(0, pool.populationCap);
  return { revealed, spent: cost };
}

export function scoutCandidate(world: WorldState, candidateId: Id, opts?: { effort?: number; cost?: number }): { ok: boolean; scoutingLevel: number; spent: number } {
  const tp = ensureTalentPools(world);
  const c = tp.candidates[candidateId];
  if (!c) return { ok: false, scoutingLevel: 0, spent: 0 };

  const effort = clamp(Math.round(opts?.effort ?? 1), 1, 3);
  const cost = Math.max(0, Math.round(opts?.cost ?? 75_000 * effort));

  const playerHeyaId = (world as any).playerHeyaId as string | undefined;
  if (playerHeyaId) {
    const heya = world.heyas.get(playerHeyaId);
    if (heya && typeof heya.funds === "number" && heya.funds < cost) return { ok: false, scoutingLevel: getCandidateScoutingLevel(world, candidateId), spent: 0 };
    if (heya) heya.funds -= cost;
  }

  if (!tp.playerScouting) tp.playerScouting = {};
  const entry = tp.playerScouting[candidateId] ?? { scoutingLevel: 0, lastScoutedWeek: getWeek(world) };

  // Effort gives diminishing returns
  const gain = Math.round(10 + (effort * 12) * (1 - entry.scoutingLevel / 120));
  entry.scoutingLevel = clamp(entry.scoutingLevel + gain, 0, 100);
  entry.lastScoutedWeek = getWeek(world);
  tp.playerScouting[candidateId] = entry;

  // Upgrade visibility band based on scouting.
  if (c.visibilityBand === "obscure" && entry.scoutingLevel >= 35) c.visibilityBand = "rumored";
  if ((c.visibilityBand === "rumored" || c.visibilityBand === "obscure") && entry.scoutingLevel >= 65) c.visibilityBand = "public";

  return { ok: true, scoutingLevel: entry.scoutingLevel, spent: cost };
}

function countsAsForeign(candidate: TalentCandidate): boolean {
  return (candidate.nationality || "Japan") !== "Japan";
}

function getForeignCommitmentsInTalks(world: WorldState, heyaId: Id): number {
  const tp = ensureWorldPool(world);
  let count = 0;
  for (const c of Object.values(tp.candidates)) {
    if (!c) continue;
    if (c.availabilityState !== "in_talks") continue;
    if (!countsAsForeign(c)) continue;
    if (c.competingSuitors?.some((s) => s.heyaId === heyaId)) count += 1;
  }
  return count;
}

export function canSignCandidate(world: WorldState, heyaId: Id, candidate: TalentCandidate): { ok: boolean; reason?: string } {
  if (candidate.availabilityState !== "available" && candidate.availabilityState !== "in_talks") {
    return { ok: false, reason: `Candidate is ${candidate.availabilityState.replace(/_/g, " ")}.` };
  }
  if (!world.heyas.get(heyaId)) return { ok: false, reason: "Unknown stable." };

  if (countsAsForeign(candidate)) {
    const current = getForeignCountInHeya(world, heyaId);
    const committed = getForeignCommitmentsInTalks(world, heyaId);
    const maxForeign = FOREIGN_RIKISHI_LIMIT_PER_HEYA;
    if (current + committed >= maxForeign) return { ok: false, reason: "Foreigner quota reached for this stable." };
  }

  return { ok: true };
}

function candidateToRikishi(world: WorldState, candidate: TalentCandidate, targetRank: Rank = "jonokuchi"): Rikishi {
  const rng = rngFromSeed(world.seed, "talentpool", `promote::${candidate.candidateId}`);
  const id = candidate.personId; // stable identity becomes rikishi id

  // Baseline stats anchored to talentSeed and pool (uni is stronger)
  const isUni = candidate.tags.includes("amateur_star") || candidate.originRegion.includes("University");
  const base = clamp(Math.round(18 + candidate.talentSeed * 0.55 + (isUni ? 10 : 0)), 10, 95);
  const variance = () => (rng.next() * 14) - 7;

  const strength = clamp(Math.round(base + variance()), 10, 100);
  const technique = clamp(Math.round(base + variance() + (candidate.style === "yotsu" ? 6 : 0)), 10, 100);
  const speed = clamp(Math.round(base + variance() + (candidate.style === "oshi" ? 4 : 0)), 10, 100);
  const stamina = clamp(Math.round(base + variance() + 3), 10, 100);
  const mental = clamp(Math.round(base + variance() + (candidate.temperament.discipline - 50) * 0.15), 10, 100);
  const adaptability = clamp(Math.round(base + variance()), 10, 100);
  const balance = clamp(Math.round(base + variance()), 10, 100);

  const weight = clamp(Math.round(candidate.weightPotentialKg * (0.78 + rng.next() * 0.14)), 90, 250);
  const height = clamp(Math.round(candidate.heightPotentialCm * (0.96 + rng.next() * 0.06)), 160, 210);

  const shikona = candidate.name || generateRikishiName(`${world.seed}::talentpool::fallback_name::${candidate.candidateId}`);

  const stats = {
    strength,
    technique,
    speed,
    weight,
    stamina,
    mental,
    adaptability,
    balance
  };

  return {
    id,
    name: shikona,
    shikona,
    heyaId: "scout_pool",
    nationality: candidate.nationality,
    birthYear: candidate.birthYear,
    origin: candidate.originRegion,
    rank: targetRank,
    rankNumber: 50,
    division: "jonokuchi",
    side: "east",
    stats,
    power: stats.strength,
    speed: stats.speed,
    balance: stats.balance,
    technique: stats.technique,
    aggression: stats.mental,
    experience: clamp(Math.round(candidate.talentSeed * 0.15 + (candidate.tags.includes("amateur_star") ? 15 : 0)), 0, 40),
    adaptability: stats.adaptability,
    fatigue: 0,
    height,
    weight,
    momentum: 50,
    stamina: stats.stamina,
    style: candidate.style,
    archetype: candidate.archetype,
    careerWins: 0,
    careerLosses: 0,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    careerRecord: { wins: 0, losses: 0, yusho: 0 },
    currentBashoRecord: { wins: 0, losses: 0 },
    history: [],
    h2h: {},
    injuryStatus: { type: "none", isInjured: false, severity: 0, location: "", weeksRemaining: 0, weeksToHeal: 0 },
    injured: false,
    injuryWeeksRemaining: 0,
    condition: 100,
    motivation: clamp(Math.round(45 + rng.next() * 45), 0, 100),
    personalityTraits: candidate.tags,
    favoredKimarite: [],
    weakAgainstStyles: []
  } as any;
}

export function offerCandidate(world: WorldState, candidateId: Id, heyaId: Id, offerType: SuitorOfferType = "standard", interest: SuitorInterestBand = "high"): OfferResult {
  const tp = ensureTalentPools(world);
  const c = tp.candidates[candidateId];
  if (!c) return { ok: false, reason: "Candidate not found." };

  const ok = canSignCandidate(world, heyaId, c);
  if (!ok.ok) return { ok: false, reason: ok.reason || "Cannot sign candidate." };

  // Add / update suitor entry
  const deadlineWeek = getWeek(world) + 4;
  const existing = c.competingSuitors.find((s) => s.heyaId === heyaId);
  if (existing) {
    existing.offerType = offerType;
    existing.interestBand = interest;
    existing.deadlineWeek = Math.max(existing.deadlineWeek, deadlineWeek);
  } else {
    const suitor: SuitorRef = { heyaId, offerType, interestBand: interest, deadlineWeek };
    c.competingSuitors.push(suitor);
  }

  c.availabilityState = "in_talks";
  return { ok: true, signed: false, reason: "Offer submitted. Candidate will decide soon." };
}

function interestToScore(band: SuitorInterestBand): number {
  switch (band) {
    case "all_in": return 25;
    case "high": return 16;
    case "medium": return 9;
    default: return 4;
  }
}

function offerTypeToScore(t: SuitorOfferType): number {
  switch (t) {
    case "aggressive": return 8;
    case "prestige_pitch": return 10;
    case "covert": return 6;
    default: return 5;
  }
}

function heyaUtility(world: WorldState, heyaId: Id): number {
  const h = world.heyas.get(heyaId);
  if (!h) return 0;
  const funds = typeof (h as any).funds === "number" ? (h as any).funds : 0;
  const prestige = (h as any).reputation ?? 50;
  return clamp(Math.round(prestige * 0.6 + Math.log10(Math.max(1, funds)) * 10), 0, 120);
}

function defaultTraits(): OyakataTraits {
  return { ambition: 55, patience: 55, risk: 45, tradition: 50, compassion: 50 };
}

function getTraitsForHeya(world: WorldState, heyaId: Id): OyakataTraits {
  const heya = world.heyas.get(heyaId);
  if (!heya) return defaultTraits();
  const oyakata = world.oyakata.get(heya.oyakataId);
  return oyakata?.traits ?? defaultTraits();
}

function getArchetypeForHeya(world: WorldState, heyaId: Id): string {
  const heya = world.heyas.get(heyaId);
  if (!heya) return "traditionalist";
  const oyakata = world.oyakata.get(heya.oyakataId);
  return oyakata?.archetype ?? "traditionalist";
}

function poolTypeOfCandidate(world: WorldState, c: TalentCandidate): TalentPoolType {
  if (countsAsForeign(c)) return "foreign";
  // Heuristic: university-aged (20+) are treated as university pool outputs.
  const age = world.year - c.birthYear;
  return age >= 20 ? "university" : "high_school";
}

function scoreCandidateForHeya(world: WorldState, heyaId: Id, c: TalentCandidate): number {
  const traits = getTraitsForHeya(world, heyaId);
  const arch = getArchetypeForHeya(world, heyaId);
  const styleBias = determineNPCStyleBias(world, heyaId);

  const age = world.year - c.birthYear;
  const poolType = poolTypeOfCandidate(world, c);

  let score = 0;

  // Raw ceiling / readiness
  const ambitionWeight = 0.35 + traits.ambition / 250; // 0.35..0.75
  score += c.talentSeed * ambitionWeight;
  if (c.isAmateurStar) score += 10 + traits.ambition * 0.05;
  if (c.tags.includes("high_ceiling")) score += 6 + traits.risk * 0.04;

  // Age / timeline
  if (traits.patience >= 65) {
    if (poolType === "high_school") score += 8;
    if (age <= 18) score += 4;
  } else {
    if (poolType === "university") score += 6;
    if (poolType === "foreign") score += 4;
  }

  // Tradition vs foreign openness
  if (poolType === "foreign") {
    score += (100 - traits.tradition) * 0.16; // openness
    score -= traits.tradition * 0.08;
  } else {
    score += traits.tradition * 0.06;
  }

  // Style fit (NPC meta / roster bias)
  if (styleBias !== "neutral") {
    if (c.style === styleBias) score += 10;
    else if (c.style === "hybrid") score += 3;
    else score -= 6;
  }
  if (traits.tradition >= 70 && c.style === "yotsu") score += 4;
  if (traits.tradition <= 30 && c.style === "oshi") score += 3;

  // Temperament alignment
  const disciplineDelta = (c.temperament.discipline - 50) / 50; // -1..1
  const volatilityDelta = (c.temperament.volatility - 50) / 50;
  score += disciplineDelta * (traits.tradition * 0.12 + traits.compassion * 0.06);
  score += volatilityDelta * (traits.risk * 0.14 - traits.compassion * 0.10);
  if (c.tags.includes("disciplined")) score += 4 + traits.tradition * 0.03;
  if (c.tags.includes("volatile")) score += traits.risk * 0.05 - traits.compassion * 0.06;

  // Archetype-specific tastes
  if (arch === "gambler") {
    if (c.tags.includes("volatile")) score += 8;
    if (c.archetype === "trickster" || c.archetype === "speedster") score += 6;
  }
  if (arch === "nurturer") {
    score += c.temperament.discipline * 0.05;
    score -= c.temperament.volatility * 0.05;
  }
  if (arch === "scientist") {
    score += c.temperament.discipline * 0.03;
    score += c.talentSeed * 0.06;
  }
  if (arch === "tyrant") {
    score += traits.ambition * 0.10;
    score -= traits.compassion * 0.05;
    if (c.isAmateurStar) score += 6;
  }
  if (arch === "strategist") {
    // Strategy: align with roster bias and take flexible archetypes
    if (c.style === "hybrid") score += 5;
    if (c.archetype === "all_rounder" || c.archetype === "hybrid_oshi_yotsu") score += 6;
  }

  // Soft penalty for very low-visibility recruits unless patient
  if (c.visibilityBand === "hidden" || c.visibilityBand === "obscure") {
    score -= traits.patience >= 60 ? 0 : 4;
  }

  return score;
}

function chooseOfferProfile(world: WorldState, heyaId: Id, c: TalentCandidate): { offerType: SuitorOfferType; interest: SuitorInterestBand } {
  const traits = getTraitsForHeya(world, heyaId);
  const arch = getArchetypeForHeya(world, heyaId);

  const star = c.isAmateurStar || c.talentSeed >= 80;
  const ambitious = traits.ambition >= 75;

  let interest: SuitorInterestBand = "medium";
  if (star && ambitious) interest = "all_in";
  else if (star || traits.ambition >= 60) interest = "high";

  let offerType: SuitorOfferType = "standard";
  if (arch === "gambler" || arch === "tyrant") offerType = "aggressive";
  if (arch === "strategist" && star) offerType = "prestige_pitch";
  if (arch === "scientist" && !star) offerType = "covert";
  if (traits.risk <= 25 && offerType === "aggressive") offerType = "standard";

  // Foreign recruits often need a pitch; traditional stables keep it quieter.
  if (countsAsForeign(c) && traits.tradition <= 35) offerType = "prestige_pitch";
  if (countsAsForeign(c) && traits.tradition >= 70) offerType = "covert";

  return { offerType, interest };
}

function resolveCandidateSigning(world: WorldState, candidateId: Id): { signed: boolean; signedHeyaId?: Id; rikishiId?: Id } {
  const tp = ensureTalentPools(world);
  const c = tp.candidates[candidateId];
  if (!c) return { signed: false };
  if (c.availabilityState !== "in_talks") return { signed: false };

  const now = getWeek(world);
  const eligibleSuitors = c.competingSuitors.filter((s) => s.deadlineWeek <= now);
  if (eligibleSuitors.length === 0) return { signed: false };

  // Candidate chooses max utility.
  let best: { heyaId: Id; score: number } | null = null;
  for (const s of eligibleSuitors) {
    const base = heyaUtility(world, s.heyaId);
    const score = base + interestToScore(s.interestBand) + offerTypeToScore(s.offerType) + (c.talentSeed * 0.15);
    if (!best || score > best.score) best = { heyaId: s.heyaId, score };
  }
  if (!best) return { signed: false };

  // Governance gating (foreigner quota)
  const can = canSignCandidate(world, best.heyaId, c);
  if (!can.ok) {
    // Candidate withdraws if blocked.
    c.availabilityState = "withdrawn";
    return { signed: false };
  }

  const r = candidateToRikishi(world, c, "jonokuchi");
  r.heyaId = best.heyaId;

  // Add to world
  world.rikishi.set(r.id, r as any);
  const heya = world.heyas.get(best.heyaId);
  if (heya) (heya as any).rikishiIds?.push(r.id);

  c.availabilityState = "signed";
  c.competingSuitors = [];

  // Remove from pool lists
  for (const pt of POOL_TYPES) {
    const pool = tp.pools[pt];
    pool.candidatesVisible = pool.candidatesVisible.filter((id) => id !== candidateId);
    pool.candidatesHidden = pool.candidatesHidden.filter((id) => id !== candidateId);
  }

  return { signed: true, signedHeyaId: best.heyaId, rikishiId: r.id };
}

// NPC stables occasionally make offers to visible candidates.
function npcOfferTick(world: WorldState): void {
  const tp = ensureTalentPools(world);
  const now = getWeek(world);

  const playerHeyaId = (world as any).playerHeyaId as string | undefined;

  const heyaIds = Array.from(world.heyas.keys()).filter((id) => !playerHeyaId || id !== playerHeyaId);
  if (heyaIds.length === 0) return;

  const rng = rngForWorld(world, "talentpool", `npc_offers::w${now}`);

  // Build candidate pool: visible + a small hidden slice (simulates NPC scouting reach).
  const visible: Id[] = [];
  for (const pt of POOL_TYPES) visible.push(...tp.pools[pt].candidatesVisible);
  if (visible.length === 0) return;

  // Evaluate a small subset of stables each week to avoid O(N*M).
  const stablesThisWeek = Math.min(6, heyaIds.length);
  for (let s = 0; s < stablesThisWeek; s++) {
    const heyaId = heyaIds[rng.int(0, heyaIds.length - 1)];
    const heya = world.heyas.get(heyaId);
    const freezeWeeks = (heya as any)?.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0;
    if (freezeWeeks > 0) {
      // Under sanction: cannot recruit
      continue;
    }

    const traits = getTraitsForHeya(world, heyaId);
    const recruitProb = clamp(0.06 + traits.ambition / 600 + (traits.risk / 1200), 0.04, 0.26);
    if (!rng.bool(recruitProb)) continue;

    // Assemble an evaluation list per-heya: visible + some hidden (more for "scientist/strategist").
    const arch = getArchetypeForHeya(world, heyaId);
    const hiddenReach = clamp(Math.round(2 + traits.patience / 30 + (arch === "scientist" || arch === "strategist" ? 2 : 0)), 1, 8);
    const evalList: Id[] = [...visible];
    for (const pt of POOL_TYPES) {
      // Don't tempt foreign if quota is already used.
      if (pt === "foreign") {
        const quotaOk = getForeignCountInHeya(world, heyaId) + getForeignCommitmentsInTalks(world, heyaId) < FOREIGN_RIKISHI_LIMIT_PER_HEYA;
        if (!quotaOk) continue;
      }
      evalList.push(...tp.pools[pt].candidatesHidden.slice(0, hiddenReach));
    }

    // Pick best candidate from a random sample.
    let best: { cid: Id; score: number } | null = null;
    const tries = Math.min(28, evalList.length);
    for (let i = 0; i < tries; i++) {
      const cid = evalList[rng.int(0, evalList.length - 1)];
      const c = tp.candidates[cid];
      if (!c || c.availabilityState !== "available") continue;
      const can = canSignCandidate(world, heyaId, c);
      if (!can.ok) continue;
      // Add small noise so identical stables don't all pick the same prospect.
      const noise = (rng.next() - 0.5) * 6;
      const score = scoreCandidateForHeya(world, heyaId, c) + noise;
      if (!best || score > best.score) best = { cid, score };
    }
    if (!best) continue;

    const chosen = tp.candidates[best.cid];
    if (!chosen) continue;
    const { offerType, interest } = chooseOfferProfile(world, heyaId, chosen);
    offerCandidate(world, best.cid, heyaId, offerType, interest);
  }
}

export function tickWeek(world: WorldState): void {
  ensureTalentPools(world);

  // Yearly cohort refresh (in case year advanced outside of weekly ticks)
  const tp = (world as any).talentPool as TalentPoolWorldState;
  if (tp && tp.lastYearlyRefreshYear !== world.year) refreshYearlyCohort(world, world.year);

  // NPC offers + resolve pending signings.
  npcOfferTick(world);

  const ids = Object.keys(ensureWorldPool(world).candidates);
  for (const cid of ids) {
    const c = ensureWorldPool(world).candidates[cid];
    if (!c) continue;
    if (c.availabilityState === "in_talks") {
      resolveCandidateSigning(world, cid);
    }
  }
}

/**
 * Post-basho helper: NPC stables fill vacancies by making immediate offers to low-visibility prospects.
 * Player stable is skipped; the player can recruit via the UI.
 */
export function fillVacanciesForNPC(world: WorldState, vacanciesByHeyaId: Record<Id, number>): void {
  ensureTalentPools(world);

  const tp = ensureWorldPool(world);
  const now = getWeek(world);

  const rng = rngForWorld(world, "talentpool", `fill_vacancies::w${now}`);
  const playerHeyaId = (world as any).playerHeyaId as string | undefined;

  // Base candidate pool includes visible across pools.
  const visible: Id[] = [];
  for (const pt of POOL_TYPES) visible.push(...tp.pools[pt].candidatesVisible);

  for (const [heyaId, need] of Object.entries(vacanciesByHeyaId)) {
    if (!need || need <= 0) continue;
    if (playerHeyaId && heyaId === playerHeyaId) continue;

    const traits = getTraitsForHeya(world, heyaId);
    const arch = getArchetypeForHeya(world, heyaId);
    const hiddenReach = clamp(Math.round(4 + traits.patience / 25 + (arch === "scientist" || arch === "strategist" ? 3 : 0)), 2, 12);

    // Build evaluation list: visible + hidden slices.
    const evalList: Id[] = [...visible];
    for (const pt of POOL_TYPES) {
      if (pt === "foreign") {
        const quotaOk = getForeignCountInHeya(world, heyaId) + getForeignCommitmentsInTalks(world, heyaId) < FOREIGN_RIKISHI_LIMIT_PER_HEYA;
        if (!quotaOk) continue;
      }
      evalList.push(...tp.pools[pt].candidatesHidden.slice(0, hiddenReach));
    }

    for (let i = 0; i < need; i++) {
      // Choose the best available candidate for this stable.
      let best: { cid: Id; score: number } | null = null;
      const tries = Math.min(40, evalList.length);
      for (let t = 0; t < tries; t++) {
        if (evalList.length === 0) break;
        const cid = evalList[rng.int(0, evalList.length - 1)];
        const c = tp.candidates[cid];
        if (!c || c.availabilityState !== "available") continue;
        const can = canSignCandidate(world, heyaId, c);
        if (!can.ok) continue;
        const noise = (rng.next() - 0.5) * 4;
        const score = scoreCandidateForHeya(world, heyaId, c) + noise;
        if (!best || score > best.score) best = { cid, score };
      }

      if (!best) break;
      const chosen = tp.candidates[best.cid];
      if (!chosen) break;

      const { offerType, interest } = chooseOfferProfile(world, heyaId, chosen);
      offerCandidate(world, chosen.candidateId, heyaId, offerType, interest);
      const s = chosen.competingSuitors.find((x) => x.heyaId === heyaId);
      if (s) s.deadlineWeek = now; // resolve immediately
      resolveCandidateSigning(world, chosen.candidateId);
    }
  }
}
