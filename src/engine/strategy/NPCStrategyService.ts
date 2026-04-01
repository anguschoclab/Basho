import { PerceptionSnapshot } from "../perception";
import { OyakataMood } from "../types/oyakata";
import { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "../types/training";
import { RecruitmentPhilosophy } from "../oyakataStylePreferences";
import { Style } from "../types/combat";
import { Id } from "../types/common";

/**
 * Decide training intensity from perception bands + persona traits.
 */
export function decideTrainingIntensity(
  perception: PerceptionSnapshot,
  riskAppetite: number,
  welfareDiscipline: number,
  mood: OyakataMood | undefined,
  complianceCap: TrainingIntensity | undefined,
  philosophy?: RecruitmentPhilosophy
): { intensity: TrainingIntensity; reason: string } {
  const INTENSITY_RANK: TrainingIntensity[] = ["conservative", "balanced", "intensive", "punishing"];
  const rank = (i: TrainingIntensity) => INTENSITY_RANK.indexOf(i);

  const fragileCount = perception.rikishiPerceptions.reduce((acc, r) => acc + (r.healthBand === "fragile" || r.healthBand === "worn" ? 1 : 0), 0);
  const fragileRatio = perception.rosterSize > 0 ? fragileCount / perception.rosterSize : 0;

  let intensity: TrainingIntensity;
  let reason: string;

  if (perception.welfareRiskBand === "critical") {
    intensity = "conservative";
    reason = "Focusing on stable survival — forced conservative training due to critical welfare risk.";
  }
  else if (perception.welfareRiskBand === "elevated" && welfareDiscipline > 0.5) {
    intensity = "conservative";
    reason = "Prioritizing rikishi longevity — elevated welfare risk requires a cautious approach.";
  }
  else if (fragileRatio >= 0.4) {
    intensity = "conservative";
    reason = `Stabilizing the roster — ${fragileCount} wrestlers worn/fragile; reducing intensity to prevent injuries.`;
  }
  else if (perception.moraleBand === "mutinous" || perception.moraleBand === "disgruntled") {
    intensity = "balanced";
    reason = "Managing stable friction — maintaining balanced training to avoid further morale decay.";
  }
  else if (philosophy === "size_matters" && perception.welfareRiskBand === "safe") {
    intensity = "intensive";
    reason = "Mass-building specialized regimen — pushing hard to build world-class physical presence.";
  }
  else if (philosophy === "underdog_hunter" || philosophy === "balanced" || philosophy === "innovator") {
    intensity = "balanced";
    reason = `${philosophy === "underdog_hunter" ? "Strategic development" : philosophy === "innovator" ? "Technical refinement" : "Standard cycle"} — maintaining steady upward trajectory.`;
  }
  else if (riskAppetite > 0.85 && perception.welfareRiskBand === "safe") {
    intensity = "punishing";
    reason = "Uncompromising pursuit of dominance — imposing a punishing regimen for elite prospects.";
  }
  else if (riskAppetite > 0.7 && (perception.rosterStrengthBand === "dominant" || perception.rosterStrengthBand === "strong")) {
    intensity = "intensive";
    reason = "Maximum performance output — intensive training to solidify top-tier standing.";
  }
  else if (mood === "furious" || mood === "obsessed") {
    intensity = "punishing";
    reason = "Oyakata's emotional state is driving punishing demands on the roster.";
  }
  else {
    intensity = "balanced";
    reason = "Standard operational cycle — maintaining balanced development.";
  }

  if (complianceCap && rank(intensity) > rank(complianceCap)) {
    intensity = complianceCap;
    reason += ` (capped by sanctions to ${complianceCap})`;
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
  philosophy?: RecruitmentPhilosophy
): { focus: TrainingFocus; reason: string } {
  if (philosophy === "size_matters") {
    return { focus: "power", reason: "Size-obsessed philosophy — power focus to bulk up roster" };
  }
  if (philosophy === "innovator") {
    return { focus: "speed", reason: "Innovator philosophy — speed & agility focus" };
  }
  if (philosophy === "traditionalist" || (philosophy === "style_purist" && styleBias === "yotsu")) {
    return { focus: "balance", reason: "Traditional philosophy — balance & fundamentals" };
  }

  if (tradition >= 75 && styleBias === "yotsu") {
    return { focus: "balance", reason: "Traditionalist yotsu — emphasizing balance" };
  }
  if (tradition >= 75) {
    return { focus: "power", reason: "Traditionalist approach — power focus" };
  }

  if (perception.rosterStrengthBand === "developing" || perception.rosterStrengthBand === "weak") {
    return { focus: "technique", reason: "Developing roster — building technique fundamentals" };
  }

  if (styleBias === "oshi") {
    return { focus: "power", reason: "Oshi-biased stable — power focus" };
  }
  if (styleBias === "yotsu") {
    return { focus: "technique", reason: "Yotsu-biased stable — technique focus" };
  }

  return { focus: "neutral", reason: "Balanced training focus" };
}

/**
 * Decide recovery emphasis from roster health + persona.
 */
export function decideRecovery(
  perception: PerceptionSnapshot,
  welfareDiscipline: number
): { recovery: RecoveryEmphasis; reason: string } {
  const fragileCount = perception.rikishiPerceptions.reduce((acc, r) => acc + (r.healthBand === "fragile" || r.healthBand === "worn" ? 1 : 0), 0);
  const fragileRatio = perception.rosterSize > 0 ? fragileCount / perception.rosterSize : 0;

  if (perception.welfareRiskBand === "critical" || fragileRatio >= 0.5) {
    return { recovery: "high", reason: "Critical health situation — maximum recovery" };
  }
  if (perception.welfareRiskBand === "elevated" || fragileRatio >= 0.3 || welfareDiscipline > 0.7) {
    return { recovery: "high", reason: "Elevated welfare concern — high recovery" };
  }
  if (fragileRatio <= 0.1 && perception.welfareRiskBand === "safe") {
    return { recovery: "low", reason: "Healthy roster — minimal recovery allocation" };
  }

  return { recovery: "normal", reason: "Standard recovery emphasis" };
}

/**
 * Decide scouting priority from runway, prestige, roster size.
 */
export function decideScoutingPriority(
  perception: PerceptionSnapshot,
  ambition: number,
  hasSleeperScoutQuirk: boolean
): { priority: "none" | "passive" | "active" | "aggressive"; reason: string } {
  if (perception.runwayBand === "desperate" || perception.runwayBand === "critical") {
    return { priority: "none", reason: "Financial crisis — scouting suspended" };
  }

  if (perception.rosterSize < 8 || perception.rosterStrengthBand === "weak") {
    return { priority: "aggressive", reason: "Roster needs rebuilding — aggressive scouting" };
  }

  if (hasSleeperScoutQuirk) {
    return { priority: "active", reason: "Sleeper Scout personality — active scouting" };
  }

  if (ambition >= 75 && perception.rosterStrengthBand !== "dominant") {
    return { priority: "active", reason: "Ambitious manager seeking talent" };
  }

  if (perception.rosterStrengthBand === "dominant") {
    return { priority: "passive", reason: "Dominant roster — passive scouting" };
  }

  return { priority: "passive", reason: "Standard scouting activity" };
}

/**
 * Identify rikishi who should be put on "protect" focus.
 */
export function identifyProtects(
  perception: PerceptionSnapshot,
  welfareDiscipline: number
): { protectIds: Id[]; reason: string } {
  const HIGH_RANKS = new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);
  const protectIds: Id[] = [];

  for (const rp of perception.rikishiPerceptions) {
    if (rp.healthBand === "fragile") {
      protectIds.push(rp.rikishiId);
    } else if (rp.healthBand === "worn" && HIGH_RANKS.has(rp.rank)) {
      protectIds.push(rp.rikishiId);
    } else if (rp.healthBand === "worn" && welfareDiscipline > 0.6) {
      protectIds.push(rp.rikishiId);
    }
  }

  const reason = protectIds.length > 0
    ? `Protecting ${protectIds.length} wrestler(s) due to health concerns`
    : "No wrestlers require protection";

  return { protectIds, reason };
}
