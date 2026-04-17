/**
 * phase_pre_basho_assessment.ts
 * =============================
 * Pipeline Phase — Pre-basho health assessment and withdrawal recommendations.
 * Runs during pre_basho phase to assess rikishi health and recommend withdrawals.
 */

import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { PreBashoAssessment } from "../../types/world";
import { triggerPreBashoJournalism } from "../../systems/media/MediaService";
import { mergeImpacts } from "../../core/ImpactResolver";

/**
 * Run pre-basho health assessment for all rikishi.
 * Assesses injury risk, recommends training focus, and suggests withdrawals.
 */
export function phase_pre_basho_assessment(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase_pre_basho_assessment");

  // Only run during pre_basho phase
  if (world.cyclePhase !== "pre_basho") {
    return builder.build();
  }

  // Only run once per pre_basho phase (check if already assessed)
  if (world._preBashoAssessment?.assessedAtWeek === world.calendar.currentWeek) {
    return builder.build();
  }

  // Run assessment in the middle of pre_basho phase (interimDaysRemaining around 7-14)
  const daysRemaining = world._interimDaysRemaining ?? 0;
  if (daysRemaining < 7 || daysRemaining > 14) {
    return builder.build();
  }

  // Assess all rikishi
  const rikishiAssessments = new Map();
  let totalHealthScore = 0;
  let totalRikishi = 0;
  let withdrawalsRecommended = 0;

  for (const [rikishiId, rikishi] of world.rikishi) {
    // Skip inactive rikishi
    if (rikishi.isRetired || !rikishi.heyaId) continue;

    const assessment = assessRikishi(rikishi);
    rikishiAssessments.set(rikishiId, assessment);

    totalHealthScore += assessment.healthScore;
    totalRikishi++;

    if (assessment.withdrawalRecommended) {
      withdrawalsRecommended++;

      // For NPCs, automatically withdraw if recommended
      // For players, just mark as recommended (UI will handle actual withdrawal)
      if (world.playerHeyaId !== rikishi.heyaId) {
        builder.updateRikishi(rikishiId, {
          isKyujo: true,
          kyujoReason: "injury" as const,
          medicalCertificate: {
            injury: rikishi.injuryStatus?.type || "unknown",
            severity: rikishi.injuryStatus?.severity || "moderate",
            treatmentWeeks: rikishi.injuryWeeksRemaining || 4,
            submittedDate: world.calendar.currentWeek,
          },
        });
      }
    }
  }

  const overallHealthScore = totalRikishi > 0 ? totalHealthScore / totalRikishi : 100;

  const assessment: PreBashoAssessment = {
    assessedAtWeek: world.calendar.currentWeek,
    rikishiAssessments,
    overallHealthScore,
    withdrawalsThisAssessment: withdrawalsRecommended,
  };

  builder.updateWorldField("_preBashoAssessment", assessment);

  const baselineImpact = builder.build();
  const journalismImpact = triggerPreBashoJournalism(world);

  return mergeImpacts([baselineImpact, journalismImpact]);
}

/**
 * Assess a single rikishi's health status.
 */
function assessRikishi(rikishi: Rikishi): {
  rikishiId: string;
  healthScore: number;
  injuryRisk: "low" | "medium" | "high";
  recommendedFocus: "protect" | "rebuild" | "normal";
  withdrawalRecommended: boolean;
} {
  const rikishiId = rikishi.id;

  // Calculate health score based on multiple factors
  let healthScore = 100;

  // Subtract for injury
  if (rikishi.injured) {
    healthScore -= 30;
    if (rikishi.injuryStatus?.severity === "serious") {
      healthScore -= 30;
    } else if (rikishi.injuryStatus?.severity === "moderate") {
      healthScore -= 15;
    }
  }

  // Subtract for fatigue
  healthScore -= rikishi.fatigue * 0.5;

  // Subtract for low condition
  healthScore -= (100 - (rikishi.condition || 100)) * 0.3;

  // Subtract for low stamina
  healthScore -= (100 - (rikishi.stamina || 100)) * 0.2;

  // Clamp health score to 0-100
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Determine injury risk
  let injuryRisk: "low" | "medium" | "high" = "low";
  if (healthScore < 40) {
    injuryRisk = "high";
  } else if (healthScore < 60) {
    injuryRisk = "medium";
  }

  // Determine recommended focus
  let recommendedFocus: "protect" | "rebuild" | "normal" = "normal";
  if (rikishi.injured || healthScore < 50) {
    recommendedFocus = "protect";
  } else if (healthScore < 70) {
    recommendedFocus = "rebuild";
  }

  // Determine if withdrawal is recommended
  const withdrawalRecommended =
    rikishi.injured &&
    (rikishi.injuryStatus?.severity === "serious" || rikishi.injuryWeeksRemaining > 3);

  return {
    rikishiId,
    healthScore,
    injuryRisk,
    recommendedFocus,
    withdrawalRecommended,
  };
}
