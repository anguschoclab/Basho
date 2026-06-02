/**
 * transitions.ts
 * =============
 * Welfare state transition handlers.
 * Extracted from phase01_week_welfare.ts for modularity.
 */

import type { WorldState } from "../../../types/world";
import type { Heya } from "../../../types/heya";
import type { WelfareState, ComplianceState } from "../../../types/economy";
import type { ImpactBuilder } from "../../../core/ImpactBuilder";
import { generateGovernanceHeadline } from "../../../systems/media/MediaService";
import { clamp } from "../../../utils/math";

function applyGovernanceHeadlineAndPressure(
  world: WorldState,
  heyaId: string,
  mediaPressureChanges: Record<string, number>,
  pressureAmount: number
): void {
  generateGovernanceHeadline({
    world,
    heyaId,
    templatePath: "institutional.governance.welfare_headline",
    severity: "national",
  });
  mediaPressureChanges[heyaId] = (mediaPressureChanges[heyaId] ?? 0) + pressureAmount;
}

export function handleCompliantTransition(
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

    applyGovernanceHeadlineAndPressure(world, heya.id, mediaPressureChanges, 15);
  }
}

export function handleWatchTransition(
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

    applyGovernanceHeadlineAndPressure(world, heya.id, mediaPressureChanges, 30);
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

export function handleInvestigationTransition(
  world: WorldState,
  heya: Heya,
  state: WelfareState,
  _reasons: string[],
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

export function transitionToSanctioned(
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

  applyGovernanceHeadlineAndPressure(world, heya.id, mediaPressureChanges, 50);
}

export function handleSanctionedTransition(
  _world: WorldState,
  heya: Heya,
  state: WelfareState,
  _reasons: string[],
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

export function setComplianceStatePure(state: WelfareState, next: ComplianceState): void {
  if (state.complianceState !== next) {
    state.complianceState = next;
    state.weeksInState = 0;
  }
}
