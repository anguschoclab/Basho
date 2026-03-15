/**
 * File Name: src/engine/scouting.ts
 * Notes:
 * - MERGED: Combined the Recruitment System (generating candidates) with the Fog of War System (player knowledge).
 * - UPDATED: Maps the detailed Rikishi stats (power, speed, etc.) to the fog of war snapshot.
 * - REPLACED: Swapped `seedrandom` for a local `seededRandom` helper.
 * - USES: generateRookie from lifecycle.ts for candidate generation.
 */

import { rngFromSeed, rngForWorld } from "./rng";
import { WorldState } from "./types/world";
import { Rikishi, RikishiStats } from "./types/rikishi";
import { Rank } from "./types/banzuke";
import { Style, TacticalArchetype } from "./types/combat";
import { describeAttribute, describeAggression, describeExperience, type AttributeKey } from "./narrativeDescriptions";
import { generateRookie } from "./lifecycle"; 

// ============================================
// UI LABELS (shared, stable exports)
// ============================================

/** Human-readable rank labels (JA + EN). Used by UI components. */
export const RANK_NAMES: Record<Rank, { ja: string; en: string }> = {
  yokozuna: { ja: "横綱", en: "Yokozuna" },
  ozeki: { ja: "大関", en: "Ōzeki" },
  sekiwake: { ja: "関脇", en: "Sekiwake" },
  komusubi: { ja: "小結", en: "Komusubi" },
  maegashira: { ja: "前頭", en: "Maegashira" },
  juryo: { ja: "十両", en: "Jūryō" },
  makushita: { ja: "幕下", en: "Makushita" },
  sandanme: { ja: "三段目", en: "Sandanme" },
  jonidan: { ja: "序二段", en: "Jonidan" },
  jonokuchi: { ja: "序ノ口", en: "Jonokuchi" }
};

/** High-level style labels (JA + EN). */
export const STYLE_NAMES: Record<Style, { label: string; labelJa: string; description: string }> = {
  oshi: {
    label: "Oshi",
    labelJa: "押し",
    description: "Pushing/thrusting sumo—drive forward with hands and pressure rather than securing the belt."
  },
  yotsu: {
    label: "Yotsu",
    labelJa: "四つ",
    description: "Belt-focused sumo—seek a grip, control the hips, and win with throws or force-outs."
  },
  hybrid: {
    label: "Hybrid",
    labelJa: "万能",
    description: "A mixed approach—comfortable switching between pushing and belt fighting depending on the matchup."
  }
};

/** Tactical archetype labels. Keep keys aligned to `TacticalArchetype` in types.ts. */
export const ARCHETYPE_NAMES: Record<
  TacticalArchetype,
  { label: string; labelJa: string; description: string }
> = {
  oshi_specialist: {
    label: "Oshi Specialist",
    labelJa: "押し型",
    description: "Relentless forward pressure, strong tachiai, prefers pushing/thrusting and force-outs."
  },
  yotsu_specialist: {
    label: "Yotsu Specialist",
    labelJa: "四つ型",
    description: "Belt technician—hunts grips, controls the clinch, and finishes with throws or lifts."
  },
  speedster: {
    label: "Speedster",
    labelJa: "俊敏",
    description: "Quick feet and angles—wins with movement, trips, and opportunistic attacks."
  },
  trickster: {
    label: "Trickster",
    labelJa: "奇策",
    description: "Unorthodox and volatile—pulls, feints, and special techniques to disrupt rhythm."
  },
  all_rounder: {
    label: "All-Rounder",
    labelJa: "総合",
    description: "Solid fundamentals everywhere—no single weakness, adapts to the flow of the bout."
  },
  hybrid_oshi_yotsu: {
    label: "Hybrid Oshi/Yotsu",
    labelJa: "押し四つ",
    description: "Blends pushing and belt fighting—can start with oshi and transition into yotsu (or vice versa)."
  },
  counter_specialist: {
    label: "Counter Specialist",
    labelJa: "受け",
    description: "Reads pressure and punishes mistakes—strong timing, reversals, and reactive finishes."
  }
};

// ============================================
// PART 1: FOG OF WAR & PLAYER KNOWLEDGE
// ============================================

/** Type representing confidence level. */
export type ConfidenceLevel = "unknown" | "low" | "medium" | "high" | "certain";
/** Type representing scouting investment. */
export type ScoutingInvestment = "none" | "light" | "standard" | "deep";
/** Type representing attribute type. */
export type AttributeType = "physical" | "combat" | "style" | "hidden";

/** Defines the structure for public rikishi info. */
export interface PublicRikishiInfo {
  id: string;
  shikona: string;
  heyaId?: string;
  rank: string;
  rankNumber?: number;
  side?: string;
  height: number;
  weight: number;
  currentBashoWins?: number;
  currentBashoLosses?: number;
  style?: string;
  archetype?: string;
}

/** Defines the structure for scouted attribute truth snapshot. */
export interface ScoutedAttributeTruthSnapshot {
  power: number;
  speed: number;
  balance: number;
  technique: number;
  aggression: number;
  experience: number;
}

/** Defines the structure for scouted rikishi. */
export interface ScoutedRikishi {
  rikishiId: string;
  publicInfo: PublicRikishiInfo;
  isOwned: boolean;
  timesObserved: number;
  lastObservedWeek: number;
  scoutingInvestment: ScoutingInvestment;
  scoutingLevel: number;
  attributes: ScoutedAttributeTruthSnapshot;
}

// --- Helper: Deterministic value from seed string ---
/**
 * Seeded random.
 *  * @param seed - The Seed.
 *  * @returns The result.
 */
function seededRandom(seed: string): number {
  // Use the canonical RNG for a single draw
  const rng = rngFromSeed(seed, "scouting", "random");
  return rng.next();
}

// --- Logic: Scouting Level ---

/**
 * Calculate scouting level.
 *  * @param isOwned - The Is owned.
 *  * @param observations - The Observations.
 *  * @param investment - The Investment.
 *  * @returns The result.
 */
export function calculateScoutingLevel(
  isOwned: boolean,
  observations: number,
  investment: ScoutingInvestment
): number {
  if (isOwned) return 100;

  const passiveBase = Math.min(30, Math.max(0, observations) * 2);

  const investmentBonus: Record<ScoutingInvestment, number> = {
    none: 0,
    light: 20,
    standard: 40,
    deep: 60
  };

  return clampInt(passiveBase + investmentBonus[investment], 0, 100);
}

/**
 * Get confidence from level.
 *  * @param level - The Level.
 *  * @returns The result.
 */
export function getConfidenceFromLevel(level: number): ConfidenceLevel {
  if (level >= 95) return "certain";
  if (level >= 70) return "high";
  if (level >= 40) return "medium";
  if (level >= 15) return "low";
  return "unknown";
}

/**
 * Get confidence level.
 *  * @param scouted - The Scouted.
 *  * @param attributeType - The Attribute type.
 *  * @returns The result.
 */
export function getConfidenceLevel(scouted: ScoutedRikishi, attributeType: AttributeType): ConfidenceLevel {
  if (scouted.isOwned) return "certain";
  if (attributeType === "physical") return "certain";
  if (attributeType === "hidden") return "unknown";

  if (attributeType === "style") {
    if (scouted.timesObserved >= 3) return "high";
    if (scouted.timesObserved >= 1) return "medium";
    return "low";
  }

  return getConfidenceFromLevel(scouted.scoutingLevel);
}

// --- Logic: Deterministic Uncertainty ---

/**
 * Get estimated value.
 *  * @param trueValue - The True value.
 *  * @param confidence - The Confidence.
 *  * @param seed - The Seed.
 *  * @param range - The Range.
 *  * @returns The result.
 */
export function getEstimatedValue(
  trueValue: number,
  confidence: ConfidenceLevel,
  seed: string,
  range: { min: number; max: number } = { min: 0, max: 100 }
): number {
  const min = range.min;
  const max = range.max;

  if (confidence === "certain") return clamp(trueValue, min, max);
  if (confidence === "unknown") return (min + max) / 2;

  const maxErrorPct: Record<Exclude<ConfidenceLevel, "certain" | "unknown">, number> = {
    low: 35,
    medium: 20,
    high: 9
  };

  const rand = seededRandom(seed);
  const sign = seededRandom(seed + "_sign") < 0.5 ? -1 : 1;
  const magPct = rand * maxErrorPct[confidence];

  const span = max - min;
  const error = (magPct / 100) * span * sign;

  return clamp(trueValue + error, min, max);
}

/**
 * Get attribute narrative.
 *  * @param _attribute - The _attribute.
 *  * @param estimatedValue - The Estimated value.
 *  * @param confidence - The Confidence.
 *  * @returns The result.
 */
export function getAttributeNarrative(
  _attribute: string,
  estimatedValue: number,
  confidence: ConfidenceLevel
): { description: string; qualifier: string } {
  if (confidence === "unknown") {
    return { description: "Unknown", qualifier: "Insufficient observation" };
  }

  const estimatedLevel = describeAttribute ? describeAttribute(estimatedValue) : `${Math.round(estimatedValue)}`;

  const qualifiers: Record<ConfidenceLevel, string> = {
    certain: "",
    high: "",
    medium: "appears",
    low: "may be",
    unknown: "unknown"
  };

  const q = qualifiers[confidence];
  const description = q ? `${q} ${estimatedLevel.toLowerCase()}` : estimatedLevel;

  return { description, qualifier: getConfidenceText(confidence) };
}

/**
 * Get confidence text.
 *  * @param confidence - The Confidence.
 *  * @returns The result.
 */
export function getConfidenceText(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "certain": return "Full knowledge";
    case "high": return "Well-observed";
    case "medium": return "Moderately scouted";
    case "low": return "Limited observation";
    case "unknown": return "No reliable data";
  }
}

// --- Logic: View Creation ---

/**
 * Create public info.
 *  * @param r - The R.
 *  * @returns The result.
 */
export function createPublicInfo(r: Rikishi): PublicRikishiInfo {
  return {
    id: r.id,
    shikona: r.shikona,
    heyaId: r.heyaId,
    rank: r.rank,
    rankNumber: r.rankNumber || 1, 
    side: r.side || "east", 
    height: r.height,
    weight: r.weight,
    currentBashoWins: r.currentBashoWins || 0,
    currentBashoLosses: r.currentBashoLosses || 0,
    // Style is its own top-level property (oshi/yotsu/hybrid)
    style: r.style,
    archetype: r.archetype,
  };
}

/**
 * Build truth snapshot.
 *  * @param r - The R.
 *  * @returns The result.
 */
export function buildTruthSnapshot(r: Rikishi): ScoutedAttributeTruthSnapshot {
  // Uses flattened properties from new Rikishi types
  return {
    power: safeNum(r.power, 0),
    speed: safeNum(r.speed, 0),
    balance: safeNum(r.balance, 0), 
    technique: safeNum(r.technique, 0),
    aggression: safeNum(r.aggression, 0), 
    experience: safeNum(r.experience, 0)
  };
}

/**
 * Create scouted view.
 *  * @param rikishi - The Rikishi.
 *  * @param playerHeyaId - The Player heya id.
 *  * @param observationCount - The Observation count.
 *  * @param investment - The Investment.
 *  * @param currentWeek - The Current week.
 *  * @returns The result.
 */
export function createScoutedView(
  rikishi: Rikishi,
  playerHeyaId: string | null,
  observationCount: number = 0,
  investment: ScoutingInvestment = "none",
  currentWeek: number = 0
): ScoutedRikishi {
  const isOwned = rikishi.heyaId === playerHeyaId;
  const scoutingLevel = calculateScoutingLevel(isOwned, observationCount, investment);

  return {
    rikishiId: rikishi.id,
    publicInfo: createPublicInfo(rikishi),
    isOwned,
    timesObserved: Math.max(0, observationCount),
    lastObservedWeek: currentWeek,
    scoutingInvestment: investment,
    scoutingLevel,
    attributes: buildTruthSnapshot(rikishi)
  };
}

/**
 * Record observation.
 *  * @param scouted - The Scouted.
 *  * @param currentWeek - The Current week.
 *  * @returns The result.
 */
export function recordObservation(scouted: ScoutedRikishi, currentWeek: number): ScoutedRikishi {
  const timesObserved = scouted.timesObserved + 1;
  const scoutingLevel = calculateScoutingLevel(scouted.isOwned, timesObserved, scouted.scoutingInvestment);

  return {
    ...scouted,
    timesObserved,
    lastObservedWeek: currentWeek,
    scoutingLevel
  };
}

// --- Display Helpers ---

/** Defines the structure for scouted attributes. */
export interface ScoutedAttributes {
  power: ScoutedAttribute;
  speed: ScoutedAttribute;
  balance: ScoutedAttribute;
  technique: ScoutedAttribute;
  aggression: ScoutedAttribute;
  experience: ScoutedAttribute;
}

/** Defines the structure for scouted attribute. */
export interface ScoutedAttribute {
  value: string;
  confidence: ConfidenceLevel;
  narrative: string;
}

/**
 * Get scouted attributes.
 *  * @param scouted - The Scouted.
 *  * @param truth - The Truth.
 *  * @param seed - The Seed.
 *  * @returns The result.
 */
export function getScoutedAttributes(scouted: ScoutedRikishi, truth?: Rikishi, seed?: string): ScoutedAttributes {
  const isOwned = scouted.isOwned;
  const snapshot: ScoutedAttributeTruthSnapshot | null = truth ? buildTruthSnapshot(truth) : scouted?.attributes ?? null;

  const baseSeed = typeof seed === "string" && seed.length > 0
      ? seed
      : `scout-${scouted.rikishiId}-${scouted.lastObservedWeek}-${scouted.timesObserved}-${scouted.scoutingInvestment}`;

  if (!snapshot) {
    const unknown: ScoutedAttribute = { value: "Unknown", confidence: "unknown", narrative: "No reliable data" };
    return { power: unknown, speed: unknown, balance: unknown, technique: unknown, aggression: unknown, experience: unknown };
  }

  const getAttr = (attr: "power" | "speed" | "balance" | "technique", value: number): ScoutedAttribute => {
    const confidence = getConfidenceLevel(scouted, "combat");

    if (isOwned || confidence === "certain") {
      const label = describeAttribute(value);
      return { value: label, confidence: "certain", narrative: label };
    }

    if (confidence === "unknown") {
      return { value: "Unknown", confidence: "unknown", narrative: "Insufficient observation" };
    }

    const estimated = getEstimatedValue(value, confidence, `${baseSeed}-${scouted.rikishiId}-${attr}`);
    const { description, qualifier } = getAttributeNarrative(attr, estimated, confidence);

    return { value: description, confidence, narrative: `${qualifier}: ${description}` };
  };

  const getAgg = (value: number): ScoutedAttribute => {
    const confidence = getConfidenceLevel(scouted, "combat");

    if (isOwned || confidence === "certain") {
      const label = describeAggression(value);
      return { value: label, confidence: "certain", narrative: label };
    }

    if (confidence === "unknown") return { value: "Unknown", confidence: "unknown", narrative: "Insufficient observation" };

    const estimated = getEstimatedValue(value, confidence, `${baseSeed}-${scouted.rikishiId}-aggression`);
    const q = confidence === "medium" ? "appears" : confidence === "low" ? "may be" : "";
    const label = describeAggression(estimated);
    const desc = q ? `${q} ${label.toLowerCase()}` : label;

    return { value: desc, confidence, narrative: `${getConfidenceText(confidence)}: ${desc}` };
  };

  const getExp = (value: number): ScoutedAttribute => {
    const confidence = getConfidenceLevel(scouted, "combat");

    if (isOwned || confidence === "certain") {
      const label = describeExperience(value);
      return { value: label, confidence: "certain", narrative: label };
    }

    if (confidence === "unknown") return { value: "Unknown", confidence: "unknown", narrative: "Insufficient observation" };

    const estimated = getEstimatedValue(value, confidence, `${baseSeed}-${scouted.rikishiId}-experience`, { min: 0, max: 80 });
    const q = confidence === "medium" ? "appears" : confidence === "low" ? "may be" : "";
    const label = describeExperience(estimated);
    const desc = q ? `${q} ${label.toLowerCase()}` : label;

    return { value: desc, confidence, narrative: `${getConfidenceText(confidence)}: ${desc}` };
  };

  return {
    power: getAttr("power", snapshot.power),
    speed: getAttr("speed", snapshot.speed),
    balance: getAttr("balance", snapshot.balance),
    technique: getAttr("technique", snapshot.technique),
    aggression: getAgg(snapshot.aggression),
    experience: getExp(snapshot.experience)
  };
}

/**
 * Describe scouting level.
 *  * @param level - The Level.
 *  * @returns The result.
 */
export function describeScoutingLevel(level: number): { label: string; description: string; color: string } {
  if (level >= 95) return { label: "Complete", description: "Full knowledge of this wrestler", color: "text-primary" };
  if (level >= 70) return { label: "Well Scouted", description: "Reliable assessment with minor uncertainty", color: "text-success" };
  if (level >= 40) return { label: "Moderate Intel", description: "General picture but gaps remain", color: "text-warning" };
  if (level >= 15) return { label: "Limited", description: "Basic observations only", color: "text-orange-500" };
  return { label: "Unknown", description: "Insufficient data", color: "text-muted-foreground" };
}

// ============================================
// PART 2: RECRUITMENT SYSTEM (Integrated)
// ============================================

/** Defines the structure for scout candidate. */
export interface ScoutCandidate {
  id: string;
  name: string;
  age: number;
  origin: string;
  archetype: string;
  stats: RikishiStats;
  cost: number;
  potential: number; // 0-100 hidden stat
}

// Legacy helper: generate a small list of candidates for UI prototypes.
// Prefer the persistent Talent Pool system (engine/talentpool.ts) for actual gameplay.
/**
 * Generate scout candidates.
 *  * @param world - The World.
 *  * @param count - The Count.
 *  * @param currentYear - The Current year.
 *  * @returns The result.
 */
export function generateScoutCandidates(world: WorldState, count: number, currentYear: number): ScoutCandidate[] {
  const candidates: ScoutCandidate[] = [];

  for (let i = 0; i < count; i++) {
    const rookie = generateRookie(world, currentYear, "jonokuchi");
    
    // Calculate a signing cost based on stats
    const statSum = Object.values(rookie.stats).reduce((a, b) => a + b, 0);
    const cost = Math.floor(statSum * 100 + (rookie.archetype === "trickster" ? 50000 : 0));

    candidates.push({
      id: rookie.id,
      name: rookie.shikona,
      age: currentYear - rookie.birthYear,
      origin: rookie.origin!,
      archetype: rookie.archetype,
      stats: rookie.stats,
      cost: cost,
      potential: 50 + rngFromSeed(world.seed, "scouting", `potential::${rookie.id}`).next() * 50
    });
  }

  return candidates;
}

/**
 * Recruit candidate.
 *  * @param state - The State.
 *  * @param candidateId - The Candidate id.
 *  * @param targetHeyaId - The Target heya id.
 *  * @returns The result.
 */
export function recruitCandidate(state: WorldState, candidateId: string, targetHeyaId: string): WorldState {
  console.log(`Recruiting candidate ${candidateId} to heya ${targetHeyaId}`);
  return state;
}

// ============================================
// PART 3: UTILS
// ============================================

/**
 * Clamp.
 *  * @param value - The Value.
 *  * @param min - The Min.
 *  * @param max - The Max.
 *  * @returns The result.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp int.
 *  * @param value - The Value.
 *  * @param min - The Min.
 *  * @param max - The Max.
 *  * @returns The result.
 */
function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

/**
 * Safe num.
 *  * @param v - The V.
 *  * @param fallback - The Fallback.
 *  * @returns The result.
 */
function safeNum(v: any, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}