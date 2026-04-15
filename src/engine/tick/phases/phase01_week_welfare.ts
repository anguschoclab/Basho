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
import type { WelfareState, ComplianceState } from "../../types/economy";
import { createImpactBuilder, type ImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import {
  calculateWeeklyWelfareDelta,
  computeInjuryPressure,
} from "../../systems/welfare/WelfareCalculations";
import { generateGovernanceHeadline } from "../../systems/media/MediaService";
import { clamp } from "../../utils/math";
import { WelfareService } from "../../systems/welfare/WelfareService";

interface HeyaRiskIndicators {
  financial: boolean;
  governance: boolean;
  rivalry: boolean;
  welfare?: boolean;
}

export function phase01_week_welfare(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_welfare");
  const week = world.calendar.currentWeek || 0;

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
    nextState.welfareRisk = clamp(Math.round(nextState.welfareRisk + delta), 0, 100);
    nextState.weeksInState++;
    nextState.lastReviewedWeek = week;

    // 2. Transition Logic (Inlined/Refactored for purity)
    orchestrateTransitionsPure(world, heya, nextState, reasons, builder, mediaPressureChanges);

    // 3. Risk indicator Update
    heyaUpdates.riskIndicators = {
      ...heya.riskIndicators,
      welfare: nextState.complianceState !== "compliant" || nextState.welfareRisk >= 55,
    } as HeyaRiskIndicators;

    heyaUpdates.welfareState = nextState;

    // 4. Material Shift logging
    const riskUp = nextState.welfareRisk - beforeRisk;
    if (Math.abs(riskUp) >= 8) {
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
          100,
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
  const week = world.calendar.currentWeek || 0;

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

function handleCompliantTransition(
  world: WorldState,
  heya: Heya,
  state: WelfareState,
  reasons: string[],
  builder: ImpactBuilder,
  mediaPressureChanges: Record<string, number>,
  hasNegligence: boolean,
  seriousCount: number
): void {
  const watchThreshold = hasNegligence ? 30 : 45;
  if (
    state.welfareRisk >= watchThreshold ||
    seriousCount >= 2 ||
    (hasNegligence && state.welfareRisk >= 20)
  ) {
    setComplianceStatePure(state, "watch");
    builder.logEvent(
      "WELFARE_COMPLIANCE",
      "discipline",
      {
        heyaname: heya.name,
        status: "watch",
        incident: hasNegligence ? "negligence_suspected" : "standard_watch",
        reason: reasons.join("|"),
      },
      { heyaId: heya.id, importance: "notable" }
    );

    generateGovernanceHeadline({
      world,
      heyaId: heya.id,
      templatePath: "institutional.governance.welfare_headline",
      severity: "national",
    });
    mediaPressureChanges[heya.id] = (mediaPressureChanges[heya.id] ?? 0) + 15;
  }
}

function handleWatchTransition(
  world: WorldState,
  heya: Heya,
  state: WelfareState,
  reasons: string[],
  builder: ImpactBuilder,
  mediaPressureChanges: Record<string, number>,
  week: number
): void {
  if (state.welfareRisk >= 65 && state.weeksInState >= 2) {
    setComplianceStatePure(state, "investigation");
    state.investigation = {
      openedWeek: week,
      severity: state.welfareRisk >= 80 ? "high" : state.welfareRisk >= 72 ? "medium" : "low",
      triggers: reasons,
      progress: 0,
    };
    builder.logEvent(
      "WELFARE_COMPLIANCE",
      "discipline",
      {
        heyaname: heya.name,
        status: "investigation_opened",
        risk: state.welfareRisk,
      },
      { heyaId: heya.id, importance: "notable" }
    );

    generateGovernanceHeadline({
      world,
      heyaId: heya.id,
      templatePath: "institutional.governance.welfare_headline",
      severity: "national",
    });
    mediaPressureChanges[heya.id] = (mediaPressureChanges[heya.id] ?? 0) + 30;
  } else if (state.welfareRisk <= 25 && state.weeksInState >= 3) {
    setComplianceStatePure(state, "compliant");
    builder.logEvent(
      "WELFARE_COMPLIANCE",
      "discipline",
      {
        heyaname: heya.name,
        status: "cleared",
        risk: state.welfareRisk,
      },
      { heyaId: heya.id, importance: "notable" }
    );
  }
}

function handleInvestigationTransition(
  world: WorldState,
  heya: Heya,
  state: WelfareState,
  reasons: string[],
  builder: ImpactBuilder,
  mediaPressureChanges: Record<string, number>,
  seriousCount: number
): void {
  if (!state.investigation) {
    state.investigation = {
      openedWeek: world.calendar.currentWeek || 0,
      severity: "low",
      triggers: [],
      progress: 0,
    };
  }
  const progressGain = clamp(Math.round(4 + (heya.facilities?.recovery || 50) / 30), 2, 12);
  state.investigation.progress = clamp((state.investigation.progress || 0) + progressGain, 0, 100);

  if (state.welfareRisk >= 85 || (seriousCount >= 3 && state.welfareRisk >= 70)) {
    transitionToSanctioned(world, heya, state, builder, mediaPressureChanges);
  } else if (state.investigation.progress >= 100 && state.welfareRisk <= 50) {
    setComplianceStatePure(state, "watch");
    state.investigation = undefined;
    builder.logEvent(
      "WELFARE_COMPLIANCE",
      "discipline",
      {
        heyaname: heya.name,
        status: "investigation_closed",
        risk: state.welfareRisk,
      },
      { heyaId: heya.id, importance: "notable" }
    );
  }
}

function transitionToSanctioned(
  world: WorldState,
  heya: Heya,
  state: WelfareState,
  builder: ImpactBuilder,
  mediaPressureChanges: Record<string, number>
): void {
  setComplianceStatePure(state, "sanctioned");
  const fineYen = 5_000_000;
  state.sanctions = {
    recruitmentFreezeWeeks: 12,
    trainingIntensityCap: "medium",
    fineYen,
    note: "Mandatory welfare remediation",
  };

  heya.funds = (heya.funds ?? 0) - fineYen;

  builder.logEvent(
    "WELFARE_COMPLIANCE",
    "discipline",
    {
      heyaname: heya.name,
      status: "sanctioned",
      risk: state.welfareRisk,
      money: fineYen,
    },
    { heyaId: heya.id, importance: "notable" }
  );

  generateGovernanceHeadline({
    world,
    heyaId: heya.id,
    templatePath: "institutional.governance.welfare_headline",
    severity: "national",
  });
  mediaPressureChanges[heya.id] = (mediaPressureChanges[heya.id] ?? 0) + 50;
}

function handleSanctionedTransition(
  world: WorldState,
  heya: Heya,
  state: WelfareState,
  reasons: string[],
  builder: ImpactBuilder
): void {
  if (state.sanctions?.recruitmentFreezeWeeks && state.sanctions.recruitmentFreezeWeeks > 0) {
    state.sanctions.recruitmentFreezeWeeks--;
  }
  const freezeDone =
    !state.sanctions?.recruitmentFreezeWeeks || state.sanctions.recruitmentFreezeWeeks <= 0;
  if (freezeDone && state.welfareRisk <= 45 && state.weeksInState >= 4) {
    setComplianceStatePure(state, "watch");
    state.sanctions = undefined;
    builder.logEvent(
      "WELFARE_COMPLIANCE",
      "discipline",
      {
        status: "sanctions_lifted",
        heyaname: heya.name,
        risk: state.welfareRisk,
      },
      { heyaId: heya.id, importance: "notable" }
    );
  }
}

function setComplianceStatePure(state: WelfareState, next: ComplianceState): void {
  if (state.complianceState !== next) {
    state.complianceState = next;
    state.weeksInState = 0;
  }
}
