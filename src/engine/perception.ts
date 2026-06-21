// perception.ts
// =======================================================
// PerceptionSnapshot — Canon A7.1
// NPC managers and the player see banded data only.
// No raw weights, injury probabilities, or secret thresholds.
// =======================================================

import type { WorldState } from "./types/world";
import type { Id } from "./types/common";
import type { Heya } from "./types/heya";
import type { Rikishi } from "./types/rikishi";
import type { Style } from "./types/combat";
import type { Rank } from "./types/banzuke";
import type { StatureBand, PrestigeBand, RunwayBand, KoenkaiBandType } from "./types/narrative";
import type {
  AgeBand,
  ExperienceBand,
  WeightBand,
  HeightBand,
} from "./systems/narrative/NarrativeBands";
import { NarrativeService } from "./systems/narrative/NarrativeService";
import type { ComplianceState } from "./types/economy";
import type { RivalriesState } from "./rivalries";
import { getHeyaRoster, getHeya } from "./queries";
import {
  CONDITION_PEAK_THRESHOLD,
  CONDITION_GOOD_THRESHOLD,
  CONDITION_FAIR_THRESHOLD,
  CONDITION_WORN_THRESHOLD,
  RISK_SAFE_THRESHOLD,
  RISK_CAUTIOUS_THRESHOLD,
  RISK_ELEVATED_THRESHOLD,
  SCANDAL_MODERATE_THRESHOLD,
  SCANDAL_MILD_THRESHOLD,
  HEAT_BLAZING_THRESHOLD,
  HEAT_HOT_THRESHOLD,
  HEAT_WARM_THRESHOLD,
  STRENGTH_DOMINANT_THRESHOLD,
  STRENGTH_OZEKI_THRESHOLD,
  STRENGTH_SEKIWAKE_THRESHOLD,
  STRENGTH_MAEGASHIRA_THRESHOLD,
  STRENGTH_JURYO_THRESHOLD,
  STRENGTH_MAKUSHITA_THRESHOLD,
  STRENGTH_SANDANME_THRESHOLD,
  AVG_STRENGTH_DOMINANT_THRESHOLD,
  AVG_STRENGTH_STRONG_THRESHOLD,
  AVG_STRENGTH_COMPETITIVE_THRESHOLD,
  AVG_STRENGTH_DEVELOPING_THRESHOLD,
  MORALE_SCORE_WEIGHT,
  MOMENTUM_NORMALIZER,
  MORALE_INSPIRED_THRESHOLD,
  MORALE_CONTENT_THRESHOLD,
  MORALE_NEUTRAL_THRESHOLD,
  MORALE_DISGRUNTLED_THRESHOLD,
  RANK_WEIGHT_FALLBACK,
  RANK_WEIGHT_JONIDAN,
  RANK_WEIGHT_JONOKUCHI,
  MOMENTUM_RISING_THRESHOLD,
  MOMENTUM_DECLINING_THRESHOLD,
  MOMENTUM_NORMALIZATION_OFFSET,
} from "../constants/engine/perception";

// === Band types for perception ===

/** Type representing health band. */
export type HealthBand = "peak" | "good" | "fair" | "worn" | "fragile";
/** Type representing welfare risk band. */
export type WelfareRiskBand = "safe" | "cautious" | "elevated" | "critical";
/** Type representing governance pressure band. */
export type GovernancePressureBand = "none" | "mild" | "moderate" | "severe";
/** Type representing media heat band. */
export type MediaHeatBand = "cold" | "warm" | "hot" | "blazing";
/** Type representing rivalry perception band. */
export type RivalryPerceptionBand = "dormant" | "simmering" | "heated" | "fierce";
/** Type representing roster strength band. */
export type RosterStrengthBand = "dominant" | "strong" | "competitive" | "developing" | "weak";
/** Type representing morale band. */
export type MoraleBand = "inspired" | "content" | "neutral" | "disgruntled" | "mutinous";

/** Per-rikishi banded view available to managers */
export interface RikishiPerception {
  rikishiId: Id;
  shikona: string;
  rank: Rank;
  style: Style;
  healthBand: HealthBand;
  mediaHeatBand: MediaHeatBand;
  /** Qualitative momentum descriptor */
  momentum: "rising" | "steady" | "declining";
  ageBand: AgeBand;
  experienceBand: ExperienceBand;
  weightBand: WeightBand;
  heightBand: HeightBand;
}

/** The complete banded snapshot a manager (NPC or player) sees for a heya */
export interface PerceptionSnapshot {
  heyaId: Id;
  heyaName: string;
  generatedAtWeek: number;
  generatedAtYear: number;

  // Stable-level bands (A7.1)
  statureBand: StatureBand;
  prestigeBand: PrestigeBand;
  runwayBand: RunwayBand;
  koenkaiBand: KoenkaiBandType;

  // Welfare & compliance (banded, not raw numbers)
  welfareRiskBand: WelfareRiskBand;
  complianceState: ComplianceState;

  // Governance pressure
  governancePressureBand: GovernancePressureBand;

  // Media
  stableMediaHeatBand: MediaHeatBand;

  // Rivalry
  rivalryPressureBand: RivalryPerceptionBand;

  // Roster overview
  rosterStrengthBand: RosterStrengthBand;
  rosterSize: number;
  moraleBand: MoraleBand;

  // Per-rikishi banded views
  rikishiPerceptions: RikishiPerception[];

  // Style tilt of the stable
  /**
   * AI Agent Architecture Alignment (Canon Directive)
   * Measures how well the current stable state matches the manager's core directives.
   */
  alignmentScore: number;

  styleBias: Style | "neutral";
}

// === Band derivation helpers ===

/**
 * Band health.
 *  * @param r - The R.
 *  * @returns The result.
 */
function bandHealth(r: Rikishi): HealthBand {
  const c = r.condition ?? 100;
  if (c >= CONDITION_PEAK_THRESHOLD) return "peak";
  if (c >= CONDITION_GOOD_THRESHOLD) return "good";
  if (c >= CONDITION_FAIR_THRESHOLD) return "fair";
  if (c >= CONDITION_WORN_THRESHOLD) return "worn";
  return "fragile";
}

/**
 * Band welfare risk.
 *  * @param risk - The Risk.
 *  * @returns The result.
 */
function bandWelfareRisk(risk: number): WelfareRiskBand {
  if (risk <= RISK_SAFE_THRESHOLD) return "safe";
  if (risk <= RISK_CAUTIOUS_THRESHOLD) return "cautious";
  if (risk <= RISK_ELEVATED_THRESHOLD) return "elevated";
  return "critical";
}

/**
 * Band governance pressure.
 *  * @param scandalScore - The Scandal score.
 *  * @param status - The Status.
 *  * @returns The result.
 */
function bandGovernancePressure(scandalScore: number, status: string): GovernancePressureBand {
  if (status === "sanctioned") return "severe";
  if (status === "probation" || scandalScore >= SCANDAL_MODERATE_THRESHOLD) return "moderate";
  if (status === "warning" || scandalScore >= SCANDAL_MILD_THRESHOLD) return "mild";
  return "none";
}

/**
 * Band media heat.
 *  * @param heat - The Heat.
 *  * @returns The result.
 */
function bandMediaHeat(heat: number): MediaHeatBand {
  if (heat >= HEAT_BLAZING_THRESHOLD) return "blazing";
  if (heat >= HEAT_HOT_THRESHOLD) return "hot";
  if (heat >= HEAT_WARM_THRESHOLD) return "warm";
  return "cold";
}

/**
 * Band rivalry.
 *  * @param world - The World.
 *  * @param heyaId - The Heya id.
 *  * @returns The result.
 */
function bandRivalry(world: WorldState, heyaId: Id): RivalryPerceptionBand {
  const heya = getHeya(world, heyaId);
  if (!heya) return "dormant";

  const rivalriesState: RivalriesState | undefined = world.rivalriesState;
  if (!rivalriesState?.pairs) return "dormant";

  let maxHeat = 0;
  const rIds = heya.rikishiIds || [];
  if (rIds.length === 0) return "dormant";

  const rIdSet = new Set(rIds);
  for (const pair of Object.values(rivalriesState.pairs)) {
    if (rIdSet.has(pair.aId) || rIdSet.has(pair.bId)) {
      if (pair.heat > maxHeat) maxHeat = pair.heat;
    }
  }

  if (maxHeat >= HEAT_BLAZING_THRESHOLD) return "fierce";
  if (maxHeat >= HEAT_HOT_THRESHOLD) return "heated";
  if (maxHeat >= HEAT_WARM_THRESHOLD) return "simmering";
  return "dormant";
}

/**
 * Band roster strength.
 *  * @param heya - The Heya.
 *  * @param world - The World.
 *  * @returns The result.
 */
function bandRosterStrength(heya: Heya, world: WorldState): RosterStrengthBand {
  const RANK_WEIGHT: Record<string, number> = {
    yokozuna: STRENGTH_DOMINANT_THRESHOLD,
    ozeki: STRENGTH_OZEKI_THRESHOLD,
    sekiwake: STRENGTH_SEKIWAKE_THRESHOLD,
    komusubi: STRENGTH_MAEGASHIRA_THRESHOLD,
    maegashira: STRENGTH_MAEGASHIRA_THRESHOLD,
    juryo: STRENGTH_JURYO_THRESHOLD,
    makushita: STRENGTH_MAKUSHITA_THRESHOLD,
    sandanme: STRENGTH_SANDANME_THRESHOLD,
    jonidan: RANK_WEIGHT_JONIDAN,
    jonokuchi: RANK_WEIGHT_JONOKUCHI,
  };

  const roster = getHeyaRoster(world, heya.id);
  let total = 0;
  for (const r of roster) {
    total += RANK_WEIGHT[r.rank] ?? RANK_WEIGHT_FALLBACK;
  }

  const avg = roster.length > 0 ? total / roster.length : 0;
  if (avg >= AVG_STRENGTH_DOMINANT_THRESHOLD) return "dominant";
  if (avg >= AVG_STRENGTH_STRONG_THRESHOLD) return "strong";
  if (avg >= AVG_STRENGTH_COMPETITIVE_THRESHOLD) return "competitive";
  if (avg >= AVG_STRENGTH_DEVELOPING_THRESHOLD) return "developing";
  return "weak";
}

/**
 * Band morale.
 *  * @param heya - The Heya.
 *  * @param world - The World.
 *  * @returns The result.
 */
function bandMorale(heya: Heya, world: WorldState): MoraleBand {
  // Derive from welfare risk + recent momentum
  const welfareRisk = heya.welfareState?.welfareRisk ?? 10;
  const roster = getHeyaRoster(world, heya.id);
  let momentumSum = 0;
  for (const r of roster) {
    momentumSum += r.momentum ?? 0;
  }
  const avgMomentum = roster.length > 0 ? momentumSum / roster.length : 0;

  const score =
    (100 - welfareRisk) * MORALE_SCORE_WEIGHT +
    (avgMomentum + MOMENTUM_NORMALIZATION_OFFSET) * MOMENTUM_NORMALIZER; // normalize momentum (-5..5) to 0..40
  if (score >= MORALE_INSPIRED_THRESHOLD) return "inspired";
  if (score >= MORALE_CONTENT_THRESHOLD) return "content";
  if (score >= MORALE_NEUTRAL_THRESHOLD) return "neutral";
  if (score >= MORALE_DISGRUNTLED_THRESHOLD) return "disgruntled";
  return "mutinous";
}

/**
 * Band rikishi momentum.
 *  * @param m - The M.
 *  * @returns The result.
 */
function bandRikishiMomentum(m: number): "rising" | "steady" | "declining" {
  if (m >= MOMENTUM_RISING_THRESHOLD) return "rising";
  if (m <= MOMENTUM_DECLINING_THRESHOLD) return "declining";
  return "steady";
}

/**
 * Band rikishi age.
 *  * @param r - The Rikishi.
 *  * @param world - The World.
 *  * @param previous - The previous AgeBand for hysteresis.
 *  * @returns The result.
 */
function bandAge(r: Rikishi, world: WorldState, previous?: AgeBand): AgeBand {
  const age = world.year - r.birthYear;
  return NarrativeService.getAgeBand(age, previous);
}

/**
 * Band rikishi experience.
 *  * @param r - The Rikishi.
 *  * @param previous - The previous ExperienceBand for hysteresis.
 *  * @returns The result.
 */
function bandExperience(r: Rikishi, previous?: ExperienceBand): ExperienceBand {
  return NarrativeService.getExperienceBand(r.stats.experience ?? 0, previous);
}

/**
 * Band rikishi weight.
 *  * @param r - The Rikishi.
 *  * @param previous - The previous WeightBand for hysteresis.
 *  * @returns The result.
 */
function bandWeight(r: Rikishi, previous?: WeightBand): WeightBand {
  return NarrativeService.getWeightBand(r.weight ?? 0, previous);
}

/**
 * Band rikishi height.
 *  * @param r - The Rikishi.
 *  * @param previous - The previous HeightBand for hysteresis.
 *  * @returns The result.
 */
function bandHeight(r: Rikishi, previous?: HeightBand): HeightBand {
  return NarrativeService.getHeightBand(r.height ?? 0, previous);
}

/**
 * Get stable media heat.
 *  * @param world - The World.
 *  * @param heyaId - The Heya id.
 *  * @returns The result.
 */
function getStableMediaHeat(world: WorldState, heyaId: Id): number {
  const mediaState = world.mediaState;
  if (!mediaState?.heyaPressure) return 0;
  return mediaState.heyaPressure[heyaId] ?? 0;
}

/**
 * Get rikishi media heat.
 *  * @param world - The World.
 *  * @param rikishiId - The Rikishi id.
 *  * @returns The result.
 */
function getRikishiMediaHeat(world: WorldState, rikishiId: Id): number {
  const mediaState = world.mediaState;
  if (!mediaState?.mediaHeat) return 0;
  return mediaState.mediaHeat[rikishiId] ?? 0;
}

// === Main builder ===

/**
 * buildPerceptionSnapshot
 * Produces a banded, non-cheating view of a heya's state.
 * Used by NPC AI decision-making and player UI surfaces.
 * Constitution A7.1: "AI uses the same information layers as the player."
 */
export function buildPerceptionSnapshot(world: WorldState, heyaId: Id): PerceptionSnapshot {
  const heya = getHeya(world, heyaId);
  if (!heya) {
    return {
      heyaId,
      heyaName: "Unknown",
      generatedAtWeek: world.week,
      generatedAtYear: world.year,
      statureBand: "new",
      prestigeBand: "unknown",
      runwayBand: "comfortable",
      koenkaiBand: "none",
      welfareRiskBand: "safe",
      complianceState: "compliant",
      governancePressureBand: "none",
      stableMediaHeatBand: "cold",
      rivalryPressureBand: "dormant",
      rosterStrengthBand: "weak",
      rosterSize: 0,
      moraleBand: "neutral",
      rikishiPerceptions: [],
      alignmentScore: 100,
      styleBias: "neutral",
    };
  }

  const welfareRisk = heya.welfareState?.welfareRisk ?? 10;

  // Cache roster to avoid redundant getHeyaRoster calls (called 3-4 times per heya)
  const roster = getHeyaRoster(world, heyaId);

  // Build per-rikishi perceptions using cached roster
  const rikishiPerceptions: RikishiPerception[] = roster.map((r) => ({
    rikishiId: r.id,
    shikona: r.shikona,
    rank: r.rank,
    style: r.style,
    healthBand: bandHealth(r),
    mediaHeatBand: bandMediaHeat(getRikishiMediaHeat(world, r.id)),
    momentum: bandRikishiMomentum(r.momentum ?? 0),
    ageBand: bandAge(r, world),
    experienceBand: bandExperience(r),
    weightBand: bandWeight(r),
    heightBand: bandHeight(r),
  }));

  // Calculate style bias from cached roster to avoid another getHeyaRoster call
  let oshi = 0;
  let yotsu = 0;
  for (const r of roster) {
    if (r.style === "oshi") oshi += 1;
    if (r.style === "yotsu") yotsu += 1;
  }
  const styleBias: Style | "neutral" = oshi === yotsu ? "neutral" : oshi > yotsu ? "oshi" : "yotsu";

  return {
    heyaId,
    heyaName: heya.name,
    generatedAtWeek: world.week,
    generatedAtYear: world.year,
    statureBand: heya.statureBand,
    prestigeBand: heya.prestigeBand,
    runwayBand: heya.runwayBand,
    koenkaiBand: heya.koenkaiBand,
    welfareRiskBand: bandWelfareRisk(welfareRisk),
    complianceState: heya.welfareState?.complianceState ?? "compliant",
    governancePressureBand: bandGovernancePressure(heya.scandalScore, heya.governanceStatus),
    stableMediaHeatBand: bandMediaHeat(getStableMediaHeat(world, heyaId)),
    rivalryPressureBand: bandRivalry(world, heyaId),
    rosterStrengthBand: bandRosterStrength(heya, world),
    rosterSize: (heya.rikishiIds || []).length,
    moraleBand: bandMorale(heya, world),
    rikishiPerceptions,
    alignmentScore: 100, // Default to full alignment, updated by Oyakata memory consolidation
    styleBias,
  };
}

/**
 * buildAllPerceptionSnapshots
 * Generates snapshots for every heya. Called at weekly boundary per A3.3.
 */
export function buildAllPerceptionSnapshots(world: WorldState): Map<Id, PerceptionSnapshot> {
  const snapshots = new Map<Id, PerceptionSnapshot>();
  for (const heya of world.heyas.values()) {
    snapshots.set(heya.id, buildPerceptionSnapshot(world, heya.id));
  }
  return snapshots;
}

/**
 * getCachedPerception
 * Returns the cached weekly snapshot if available, otherwise builds fresh.
 * Consumers should prefer this over buildPerceptionSnapshot for reads.
 */
export function getCachedPerception(world: WorldState, heyaId: Id): PerceptionSnapshot {
  const cached = world.perceptionCache?.[heyaId];
  if (cached) return cached;
  return buildPerceptionSnapshot(world, heyaId);
}
