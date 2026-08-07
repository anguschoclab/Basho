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
import {
  WATCH_THRESHOLD_WITH_NEGLECT,
  WATCH_THRESHOLD_WITHOUT_NEGLECT,
  SERIOUS_COUNT_THRESHOLD,
  NEGLIGENCE_RISK_THRESHOLD,
  MEDIA_PRESSURE_WATCH,
  INVESTIGATION_RISK_THRESHOLD,
  INVESTIGATION_WEEKS_THRESHOLD,
  INVESTIGATION_SEVERITY_HIGH,
  INVESTIGATION_SEVERITY_MEDIUM,
  MEDIA_PRESSURE_INVESTIGATION,
  CLEAR_RISK_THRESHOLD,
  CLEAR_WEEKS_THRESHOLD,
  PROGRESS_GAIN_BASE,
  PROGRESS_GAIN_DIVISOR,
  PROGRESS_GAIN_MIN,
  PROGRESS_GAIN_MAX,
  SANCTION_RISK_THRESHOLD,
  SANCTION_SERIOUS_COUNT,
  SANCTION_RISK_WITH_SERIOUS,
  INVESTIGATION_COMPLETE_PROGRESS,
  INVESTIGATION_CLOSE_RISK_THRESHOLD,
  SANCTION_FINE_YEN,
  RECRUITMENT_FREEZE_WEEKS,
  MEDIA_PRESSURE_SANCTION,
  SANCTION_LIFT_RISK_THRESHOLD,
  SANCTION_LIFT_WEEKS_THRESHOLD,
} from "../../../../constants/engine/welfare";

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
  const watchThreshold = hasNegligence
    ? WATCH_THRESHOLD_WITH_NEGLECT
    : WATCH_THRESHOLD_WITHOUT_NEGLECT;
  if (
    state.welfareRisk >= watchThreshold ||
    seriousCount >= SERIOUS_COUNT_THRESHOLD ||
    (hasNegligence && state.welfareRisk >= NEGLIGENCE_RISK_THRESHOLD)
  ) {
    setComplianceStatePure(state, "watch");
    builder.logEvent(
      "WELFARE_COMPLIANCE",
      "welfare",
      {
        heyaname: heya.name,
        status: "watch",
        incident: hasNegligence ? "negligence_suspected" : "standard_watch",
        reason: reasons.join("|"),
      },
      { heyaId: heya.id, importance: "notable" }
    );

    applyGovernanceHeadlineAndPressure(world, heya.id, mediaPressureChanges, MEDIA_PRESSURE_WATCH);
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
  if (
    state.welfareRisk >= INVESTIGATION_RISK_THRESHOLD &&
    state.weeksInState >= INVESTIGATION_WEEKS_THRESHOLD
  ) {
    setComplianceStatePure(state, "investigation");
    state.investigation = {
      openedWeek: week,
      severity:
        state.welfareRisk >= INVESTIGATION_SEVERITY_HIGH
          ? "high"
          : state.welfareRisk >= INVESTIGATION_SEVERITY_MEDIUM
            ? "medium"
            : "low",
      triggers: reasons,
      progress: 0,
    };
    builder.logEvent(
      "WELFARE_COMPLIANCE",
      "welfare",
      {
        heyaname: heya.name,
        status: "investigation_opened",
        risk: state.welfareRisk,
      },
      { heyaId: heya.id, importance: "notable" }
    );

    applyGovernanceHeadlineAndPressure(
      world,
      heya.id,
      mediaPressureChanges,
      MEDIA_PRESSURE_INVESTIGATION
    );
  } else if (
    state.welfareRisk <= CLEAR_RISK_THRESHOLD &&
    state.weeksInState >= CLEAR_WEEKS_THRESHOLD
  ) {
    setComplianceStatePure(state, "compliant");
    builder.logEvent(
      "WELFARE_COMPLIANCE",
      "welfare",
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
      openedWeek: world.calendar?.currentWeek ?? 0,
      severity: "low",
      triggers: [],
      progress: 0,
    };
  }
  const progressGain = clamp(
    Math.round(PROGRESS_GAIN_BASE + (heya.facilities?.recovery ?? 50) / PROGRESS_GAIN_DIVISOR),
    PROGRESS_GAIN_MIN,
    PROGRESS_GAIN_MAX
  );
  state.investigation.progress = clamp((state.investigation.progress ?? 0) + progressGain, 0, 100);

  if (
    state.welfareRisk >= SANCTION_RISK_THRESHOLD ||
    (seriousCount >= SANCTION_SERIOUS_COUNT && state.welfareRisk >= SANCTION_RISK_WITH_SERIOUS)
  ) {
    transitionToSanctioned(world, heya, state, builder, mediaPressureChanges);
  } else if (
    state.investigation.progress >= INVESTIGATION_COMPLETE_PROGRESS &&
    state.welfareRisk <= INVESTIGATION_CLOSE_RISK_THRESHOLD
  ) {
    setComplianceStatePure(state, "watch");
    state.investigation = undefined;
    builder.logEvent(
      "WELFARE_COMPLIANCE",
      "welfare",
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
  const fineYen = SANCTION_FINE_YEN;
  state.sanctions = {
    recruitmentFreezeWeeks: RECRUITMENT_FREEZE_WEEKS,
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

  applyGovernanceHeadlineAndPressure(world, heya.id, mediaPressureChanges, MEDIA_PRESSURE_SANCTION);
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
  if (
    freezeDone &&
    state.welfareRisk <= SANCTION_LIFT_RISK_THRESHOLD &&
    state.weeksInState >= SANCTION_LIFT_WEEKS_THRESHOLD
  ) {
    setComplianceStatePure(state, "watch");
    state.sanctions = undefined;
    builder.logEvent(
      "WELFARE_COMPLIANCE",
      "welfare",
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
