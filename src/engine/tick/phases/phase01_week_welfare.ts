/**
 * phase01_week_welfare.ts
 * =======================
 * Pipeline Phase: Weekly Welfare Compliance.
 *
 * Responsibilities:
 * 1. Calculate welfare risk shift for all heyas.
 * 2. Handle compliance lifecycle transitions (Compliant -> Watch -> Investigation -> Sanctioned).
 * 3. Apply financial sanctions and media pressure.
 */

import type { WorldState } from "../../types/world";
import type { Heya } from "../../types/heya";
import type { WelfareState } from "../../types/economy";
import { createImpactBuilder, type ImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import {
  calculateWeeklyWelfareDelta,
  computeInjuryPressure,
} from "../../systems/welfare/WelfareCalculations";
import { clamp } from "../../utils/math";
import { WelfareService } from "../../systems/welfare/WelfareService";
import {
  handleCompliantTransition,
  handleWatchTransition,
  handleInvestigationTransition,
  handleSanctionedTransition,
} from "./welfare";
import {
  WELFARE_RISK_THRESHOLD,
  WELFARE_RISK_SHIFT_LOG_THRESHOLD,
  MAX_MEDIA_PRESSURE,
  MAX_WELFARE_RISK,
} from "../../../constants/engine/welfare";

interface HeyaRiskIndicators {
  financial: boolean;
  governance: boolean;
  rivalry: boolean;
  welfare?: boolean;
}

export function phase01_week_welfare(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_welfare");
  const week = world.calendar?.currentWeek || 0;

  // Collect media pressure changes to apply after loop
  const mediaPressureChanges: Record<string, number> = {};

  for (const [id, heya] of world.heyas) {
    const heyaUpdates: Partial<Heya> = {};

    // Ensure state exists (using existing helper but we must handle the return purely)
    const state = WelfareService.ensureHeyaWelfareState(heya);
    const nextState = { ...state };

    const beforeRisk = nextState.welfareRisk;

    // 1. Calculate Risk Shift
    const { delta, reasons } = calculateWeeklyWelfareDelta(world, heya, nextState);
    nextState.welfareRisk = clamp(Math.round(nextState.welfareRisk + delta), 0, MAX_WELFARE_RISK);
    nextState.weeksInState++;
    nextState.lastReviewedWeek = week;

    // 2. Transition Logic (Inlined/Refactored for purity)
    orchestrateTransitionsPure(world, heya, nextState, reasons, builder, mediaPressureChanges);

    // 3. Risk indicator Update
    heyaUpdates.riskIndicators = {
      ...heya.riskIndicators,
      welfare:
        nextState.complianceState !== "compliant" ||
        nextState.welfareRisk >= WELFARE_RISK_THRESHOLD,
    } as HeyaRiskIndicators;

    heyaUpdates.welfareState = nextState;

    // 4. Material Shift logging
    const riskUp = nextState.welfareRisk - beforeRisk;
    if (Math.abs(riskUp) >= WELFARE_RISK_SHIFT_LOG_THRESHOLD) {
      builder.logEvent(
        "WELFARE_COMPLIANCE",
        "discipline",
        {
          heyaname: heya.name,
          status: "risk_shift",
          risk: nextState.welfareRisk,
          delta: riskUp,
          reason: reasons.join("|"),
        },
        { heyaId: heya.id }
      );
    }

    builder.updateHeya(id, heyaUpdates);
  }

  // Apply media pressure changes
  if (Object.keys(mediaPressureChanges).length > 0) {
    const nextMediaState = world.mediaState
      ? {
          ...world.mediaState,
          heyaPressure: { ...world.mediaState.heyaPressure } as Record<string, number>,
        }
      : undefined;
    if (nextMediaState) {
      for (const [heyaId, delta] of Object.entries(mediaPressureChanges)) {
        nextMediaState.heyaPressure[heyaId] = Math.min(
          MAX_MEDIA_PRESSURE,
          (nextMediaState.heyaPressure[heyaId] ?? 0) + delta
        );
      }
      // Note: mediaState updates are not directly supported by ImpactBuilder yet
      world.mediaState = nextMediaState;
    }
  }

  return builder.build();
}

function orchestrateTransitionsPure(
  world: WorldState,
  heya: Heya,
  state: WelfareState,
  reasons: string[],
  builder: ImpactBuilder,
  mediaPressureChanges: Record<string, number>
): void {
  const { seriousCount, negligenceCount } = computeInjuryPressure(world, heya);
  const hasNegligence = negligenceCount > 0;
  const week = world.calendar?.currentWeek || 0;

  switch (state.complianceState) {
    case "compliant":
      handleCompliantTransition(
        world,
        heya,
        state,
        reasons,
        builder,
        mediaPressureChanges,
        hasNegligence,
        seriousCount
      );
      break;

    case "watch":
      handleWatchTransition(world, heya, state, reasons, builder, mediaPressureChanges, week);
      break;

    case "investigation":
      handleInvestigationTransition(
        world,
        heya,
        state,
        reasons,
        builder,
        mediaPressureChanges,
        seriousCount
      );
      break;

    case "sanctioned":
      handleSanctionedTransition(world, heya, state, reasons, builder);
      break;
  }
}
