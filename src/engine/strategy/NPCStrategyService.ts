import { PerceptionSnapshot, RikishiPerception } from "../perception";
import { OyakataMood } from "../types/oyakata";
import { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "../types/training";
import { RecruitmentPhilosophy } from "../oyakataStylePreferences";
import { Style, BoutTactic } from "../types/combat";
import { Id } from "../types/common";
import { BardEngine } from "../narrative/BardEngine";
import { SeededRNG } from "../rng";
import {
  WELFARE_DISCIPLINE_ELEVATED_THRESHOLD,
  FRAGILE_RATIO_CRITICAL_THRESHOLD,
  FRAGILE_RATIO_ELEVATED_THRESHOLD,
  FRAGILE_RATIO_SAFE_THRESHOLD,
  RISK_APPETITE_HIGH_THRESHOLD,
  RISK_APPETITE_MODERATE_THRESHOLD,
  BASHO_FINAL_DAY,
  KOSHI_PRECIPICE_LOSSES,
  KACHIKOSHI_PRECIPICE_WINS,
  ROSTER_SIZE_WEAK_THRESHOLD,
  WELFARE_DISCIPLINE_BALANCED_THRESHOLD,
} from "../../constants/engine/npcStrategy";

/** Observation interface for scouting decisions. */
export interface OyakataScoutingObservation {
  runwayBand: string;
  rosterSize: number;
  rosterStrengthBand: string;
}

/** Observation interface for personnel decisions. */
export interface OyakataPersonnelObservation {
  rikishiPerceptions: RikishiPerception[];
}

export interface TrainingIntensityResult {
  intensity: TrainingIntensity;
  reason: string;
}

export interface TrainingFocusResult {
  focus: TrainingFocus;
  reason: string;
}

export interface RecoveryResult {
  recovery: RecoveryEmphasis;
  reason: string;
}

export interface ScoutingPriorityResult {
  priority: "none" | "passive" | "active" | "aggressive";
  reason: string;
}

export interface ProtectResult {
  protectIds: Id[];
  reason: string;
}

function seededRng(provided?: SeededRNG): SeededRNG {
  return provided || new SeededRNG("npc_strategy");
}

/**
 * Decide training intensity from perception bands + persona traits.
 */
export function decideTrainingIntensity(
  perception: PerceptionSnapshot,
  riskAppetite: number,
  welfareDiscipline: number,
  mood: OyakataMood | undefined,
  complianceCap: TrainingIntensity | undefined,
  philosophy?: RecruitmentPhilosophy,
  providedRng?: SeededRNG
): TrainingIntensityResult {
  const rng = seededRng(providedRng);
  const INTENSITY_RANK: TrainingIntensity[] = [
    "conservative",
    "balanced",
    "intensive",
    "punishing",
  ];
  const rank = (i: TrainingIntensity) => INTENSITY_RANK.indexOf(i);

  const fragileCount = perception.rikishiPerceptions.reduce(
    (acc, r) => acc + (r.healthBand === "fragile" || r.healthBand === "worn" ? 1 : 0),
    0
  );
  const fragileRatio = perception.rosterSize > 0 ? fragileCount / perception.rosterSize : 0;

  let intensity: TrainingIntensity;
  let reason: string;

  if (perception.welfareRiskBand === "critical") {
    intensity = "conservative";
    reason = BardEngine.resolve(rng, "npc.strategy.intensity.conservative_risk").text;
  } else if (perception.welfareRiskBand === "elevated" && welfareDiscipline > WELFARE_DISCIPLINE_ELEVATED_THRESHOLD) {
    intensity = "conservative";
    reason = BardEngine.resolve(rng, "npc.strategy.intensity.conservative_longevity").text;
  } else if (fragileRatio >= FRAGILE_RATIO_CRITICAL_THRESHOLD) {
    intensity = "conservative";
    reason = BardEngine.resolve(rng, "npc.strategy.intensity.conservative_stabilizing", {
      COUNT: fragileCount,
    }).text;
  } else if (perception.moraleBand === "mutinous" || perception.moraleBand === "disgruntled") {
    intensity = "balanced";
    reason = BardEngine.resolve(rng, "npc.strategy.intensity.balanced_friction").text;
  } else if (philosophy === "size_matters" && perception.welfareRiskBand === "safe") {
    intensity = "intensive";
    reason = BardEngine.resolve(rng, "npc.strategy.intensity.intensive_size").text;
  } else if (
    philosophy === "underdog_hunter" ||
    philosophy === "balanced" ||
    philosophy === "innovator"
  ) {
    intensity = "balanced";
    const philKey =
      philosophy === "underdog_hunter"
        ? "experimental"
        : philosophy === "innovator"
          ? "aggressive"
          : "balanced";
    const philLabel = BardEngine.resolve(rng, `strategy.philosophies.${philKey}`).text;
    reason = BardEngine.resolve(rng, "npc.strategy.intensity.balanced_standard", {
      philosophy: philLabel,
    }).text;
  } else if (riskAppetite > RISK_APPETITE_HIGH_THRESHOLD && perception.welfareRiskBand === "safe") {
    intensity = "punishing";
    reason = BardEngine.resolve(rng, "npc.strategy.intensity.punishing_dominance").text;
  } else if (
    riskAppetite > RISK_APPETITE_MODERATE_THRESHOLD &&
    (perception.rosterStrengthBand === "dominant" || perception.rosterStrengthBand === "strong")
  ) {
    intensity = "intensive";
    reason = BardEngine.resolve(rng, "npc.strategy.intensity.intensive_standard").text;
  } else if (mood === "furious" || mood === "obsessed") {
    intensity = "punishing";
    reason = BardEngine.resolve(rng, "npc.strategy.intensity.punishing_emotional").text;
  } else {
    intensity = "balanced";
    reason = BardEngine.resolve(rng, "npc.strategy.intensity.balanced_operational").text;
  }

  if (complianceCap && rank(intensity) > rank(complianceCap)) {
    intensity = complianceCap;
    reason +=
      " " + BardEngine.resolve(rng, "npc.strategy.intensity.capped", { CAP: intensity }).text;
  }

  return { intensity, reason };
}

/**
 * Decide training focus from style bias + roster composition.
 */
export function decideTrainingFocus(
  perception: PerceptionSnapshot,
  styleBias: Style | "neutral",
  tradition: number,
  philosophy?: RecruitmentPhilosophy,
  providedRng?: SeededRNG
): TrainingFocusResult {
  const rng = seededRng(providedRng);
  if (philosophy === "size_matters") {
    return {
      focus: "power",
      reason: BardEngine.resolve(rng, "npc.strategy.focus.size_matters").text,
    };
  }
  if (philosophy === "innovator") {
    return { focus: "speed", reason: BardEngine.resolve(rng, "npc.strategy.focus.innovator").text };
  }
  if (philosophy === "traditionalist" || (philosophy === "style_purist" && styleBias === "yotsu")) {
    return {
      focus: "balance",
      reason: BardEngine.resolve(rng, "npc.strategy.focus.traditionalist").text,
    };
  }

  if (tradition >= 75 && styleBias === "yotsu") {
    return {
      focus: "balance",
      reason: BardEngine.resolve(rng, "npc.strategy.focus.traditionalist_yotsu").text,
    };
  }
  if (tradition >= 75) {
    return {
      focus: "power",
      reason: BardEngine.resolve(rng, "npc.strategy.focus.traditionalist_power").text,
    };
  }

  if (perception.rosterStrengthBand === "developing" || perception.rosterStrengthBand === "weak") {
    return {
      focus: "technique",
      reason: BardEngine.resolve(rng, "npc.strategy.focus.developing").text,
    };
  }

  if (styleBias === "oshi") {
    return {
      focus: "power",
      reason: BardEngine.resolve(rng, "npc.strategy.focus.oshi_biased").text,
    };
  }
  if (styleBias === "yotsu") {
    return {
      focus: "technique",
      reason: BardEngine.resolve(rng, "npc.strategy.focus.yotsu_biased").text,
    };
  }

  return { focus: "neutral", reason: BardEngine.resolve(rng, "npc.strategy.focus.neutral").text };
}

/**
 * Decide recovery emphasis from roster health + persona.
 */
export function decideRecovery(
  perception: PerceptionSnapshot,
  welfareDiscipline: number,
  providedRng?: SeededRNG
): RecoveryResult {
  const rng = seededRng(providedRng);
  const fragileCount = perception.rikishiPerceptions.reduce(
    (acc, r) => acc + (r.healthBand === "fragile" || r.healthBand === "worn" ? 1 : 0),
    0
  );
  const fragileRatio = perception.rosterSize > 0 ? fragileCount / perception.rosterSize : 0;

  if (perception.welfareRiskBand === "critical" || fragileRatio >= FRAGILE_RATIO_CRITICAL_THRESHOLD) {
    return {
      recovery: "high",
      reason: BardEngine.resolve(rng, "npc.strategy.recovery.critical").text,
    };
  }
  if (perception.welfareRiskBand === "elevated" || fragileRatio >= FRAGILE_RATIO_ELEVATED_THRESHOLD || welfareDiscipline > WELFARE_DISCIPLINE_BALANCED_THRESHOLD) {
    return {
      recovery: "high",
      reason: BardEngine.resolve(rng, "npc.strategy.recovery.elevated").text,
    };
  }
  if (fragileRatio <= FRAGILE_RATIO_SAFE_THRESHOLD && perception.welfareRiskBand === "safe") {
    return {
      recovery: "low",
      reason: BardEngine.resolve(rng, "npc.strategy.recovery.minimal").text,
    };
  }

  return {
    recovery: "normal",
    reason: BardEngine.resolve(rng, "npc.strategy.recovery.standard").text,
  };
}

/**
 * Decide bout tactic override for an NPC on high-pressure days.
 * Returns an override tactic when kachi-koshi/make-koshi is on the line or rivalry heat is extreme.
 * Returns undefined for standard play.
 */
export function decideBoutTacticOverride(
  record: { wins: number; losses: number },
  rivalryHeat: number,
  bashoDay: number
): BoutTactic | undefined {
  const isFinalDay = bashoDay === BASHO_FINAL_DAY;
  const isMakeKoshiPrecipice = record.losses === KOSHI_PRECIPICE_LOSSES; // 8th loss would mean losing record
  const isKachiKoshiPrecipice = record.wins === KACHIKOSHI_PRECIPICE_WINS; // 8th win would mean winning record

  if (isFinalDay && isMakeKoshiPrecipice) return "OSHI_THRUST"; // desperation aggression
  if (isFinalDay && rivalryHeat > 70) return "OSHI_THRUST"; // heated rivalry climax
  if (isFinalDay && isKachiKoshiPrecipice) return "STANDARD"; // no override needed for kachi
  return undefined;
}

/**
 * Decide scouting priority from runway, prestige, roster size.
 */
export function decideScoutingPriority(
  observation: OyakataScoutingObservation,
  ambition: number,
  hasSleeperScoutQuirk: boolean,
  providedRng?: SeededRNG
): ScoutingPriorityResult {
  const rng = seededRng(providedRng);
  if (observation.runwayBand === "desperate" || observation.runwayBand === "critical") {
    return {
      priority: "none",
      reason: BardEngine.resolve(rng, "npc.strategy.scouting.suspended").text,
    };
  }

  if (observation.rosterSize < ROSTER_SIZE_WEAK_THRESHOLD || observation.rosterStrengthBand === "weak") {
    return {
      priority: "aggressive",
      reason: BardEngine.resolve(rng, "npc.strategy.scouting.aggressive").text,
    };
  }

  if (hasSleeperScoutQuirk) {
    return {
      priority: "active",
      reason: BardEngine.resolve(rng, "npc.strategy.scouting.active_sleeper").text,
    };
  }

  if (ambition >= 75 && observation.rosterStrengthBand !== "dominant") {
    return {
      priority: "active",
      reason: BardEngine.resolve(rng, "npc.strategy.scouting.active_ambitious").text,
    };
  }

  if (observation.rosterStrengthBand === "dominant") {
    return {
      priority: "passive",
      reason: BardEngine.resolve(rng, "npc.strategy.scouting.passive_dominant").text,
    };
  }

  return {
    priority: "passive",
    reason: BardEngine.resolve(rng, "npc.strategy.scouting.passive_standard").text,
  };
}

/**
 * Identify rikishi who should be put on "protect" focus.
 */
export function identifyProtects(
  observation: OyakataPersonnelObservation,
  welfareDiscipline: number,
  providedRng?: SeededRNG
): ProtectResult {
  const rng = seededRng(providedRng);
  const HIGH_RANKS = new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);
  const protectIds: Id[] = [];

  for (const rp of observation.rikishiPerceptions) {
    if (rp.healthBand === "fragile") {
      protectIds.push(rp.rikishiId);
    } else if (rp.healthBand === "worn" && HIGH_RANKS.has(rp.rank)) {
      protectIds.push(rp.rikishiId);
    } else if (rp.healthBand === "worn" && welfareDiscipline > WELFARE_DISCIPLINE_BALANCED_THRESHOLD) {
      protectIds.push(rp.rikishiId);
    }
  }

  const reason =
    protectIds.length > 0
      ? BardEngine.resolve(rng, "npc.strategy.protect.active", { COUNT: protectIds.length }).text
      : BardEngine.resolve(rng, "npc.strategy.protect.none").text;

  return { protectIds, reason };
}
