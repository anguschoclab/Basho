/**
 * File Name: src/engine/scouting.ts
 * Notes:
 * - MERGED: Combined the Recruitment System (generating candidates) with the Fog of War System (player knowledge).
 * - UPDATED: Maps the detailed Rikishi stats (power, speed, etc.) to the fog of war snapshot.
 * - REPLACED: Swapped `seedrandom` for a local `seededRandom` helper.
 * - USES: generateRookie from lifecycle.ts for candidate generation.
 */

import { rngFromSeed, rngForWorld } from "./rng";
import { WorldState, Rikishi, RikishiStats, Rank, Style, TacticalArchetype } from "./types";
import { describeAttribute, describeAggression, describeExperience } from "./narrativeDescriptions";
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

export type ConfidenceLevel = "unknown" | "low" | "medium" | "high" | "certain";
export type ScoutingInvestment = "none" | "light" | "standard" | "deep";
export type AttributeType = "physical" | "combat" | "style" | "hidden";

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

export interface ScoutedAttributeTruthSnapshot {
  power: number;
  speed: number;
  balance: number;
  technique: number;
  aggression: number;
  experience: number;
}

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

// --- Helper: Simple Deterministic RNG (LCG) ---
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const a = 1664525;
  const c = 1013904223;
  const m = 4294967296;
  let x = Math.abs(hash);
  return function() {
    x = (a * x + c) % m;
    return x / m;
  }();
}

// --- Logic: Scouting Level ---

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

export function getConfidenceFromLevel(level: number): ConfidenceLevel {
  if (level >= 95) return "certain";
  if (level >= 70) return "high";
  if (level >= 40) return "medium";
  if (level >= 15) return "low";
  return "unknown";
}

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

export interface ScoutedAttributes {
  power: ScoutedAttribute;
  speed: ScoutedAttribute;
  balance: ScoutedAttribute;
  technique: ScoutedAttribute;
  aggression: ScoutedAttribute;
  experience: ScoutedAttribute;
}

export interface ScoutedAttribute {
  value: string;
  confidence: ConfidenceLevel;
  narrative: string;
}

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

export function recruitCandidate(state: GameState, candidateId: string, targetHeyaId: string): GameState {
  console.log(`Recruiting candidate ${candidateId} to heya ${targetHeyaId}`);
  return state;
}

// ============================================
// PART 3: UTILS
// ============================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function safeNum(v: any, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}