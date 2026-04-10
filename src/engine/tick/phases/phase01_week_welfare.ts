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
import { 
  calculateWeeklyWelfareDelta, 
  computeInjuryPressure 
} from "../../systems/welfare/WelfareCalculations";
import { generateGovernanceHeadline } from "../../systems/media/MediaService";
import { EventBus } from "../../events";
import { clamp } from "../../utils/math";
import { WelfareService } from "../../systems/welfare/WelfareService";

export function phase01_week_welfare(world: WorldState): WorldState {
  const nextHeyas = new Map(world.heyas);
  const week = world.calendar.currentWeek || 0;

  for (const [id, heya] of world.heyas) {
    const nextHeya = { ...heya };
    
    // Ensure state exists (using existing helper but we must handle the return purely)
    const state = WelfareService.ensureHeyaWelfareState(nextHeya);
    const nextState = { ...state };
    
    const beforeRisk = nextState.welfareRisk;

    // 1. Calculate Risk Shift
    const { delta, reasons } = calculateWeeklyWelfareDelta(world, nextHeya, nextState);
    nextState.welfareRisk = clamp(Math.round(nextState.welfareRisk + delta), 0, 100);
    nextState.weeksInState++;
    nextState.lastReviewedWeek = week;

    // 2. Transition Logic (Inlined/Refactored for purity)
    orchestrateTransitionsPure(world, nextHeya, nextState, reasons);

    // 3. Risk indicator Update
    nextHeya.riskIndicators = {
      ...heya.riskIndicators,
      welfare: nextState.complianceState !== "compliant" || nextState.welfareRisk >= 55
    } as any;

    nextHeya.welfareState = nextState;

    // 4. Material Shift logging
    const riskUp = nextState.welfareRisk - beforeRisk;
    if (Math.abs(riskUp) >= 8) {
      EventBus.welfareCompliance(world, nextHeya.id, { 
        heyaname: nextHeya.name, 
        status: "risk_shift",
        risk: nextState.welfareRisk, 
        delta: riskUp, 
        reason: reasons.join("|") 
      });
    }

    nextHeyas.set(id, nextHeya);
  }

  return {
    ...world,
    heyas: nextHeyas
  };
}

function orchestrateTransitionsPure(world: WorldState, heya: Heya, state: WelfareState, reasons: string[]): void {
  const { seriousCount, negligenceCount } = computeInjuryPressure(world, heya);
  const hasNegligence = negligenceCount > 0;
  const week = world.calendar.currentWeek || 0;

  switch (state.complianceState) {
    case "compliant":
      const watchThreshold = hasNegligence ? 30 : 45;
      if (state.welfareRisk >= watchThreshold || seriousCount >= 2 || (hasNegligence && state.welfareRisk >= 20)) {
        setComplianceStatePure(state, "watch");
        EventBus.welfareCompliance(world, heya.id, { 
          heyaname: heya.name, 
          status: "watch",
          incident: hasNegligence ? "negligence_suspected" : "standard_watch", 
          reason: reasons.join("|") 
        });

        generateGovernanceHeadline(world, heya.id, "minor", "Heya placed under regulatory watch for welfare concerns.");
        if (world.mediaState) {
          world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 15);
        }
      }
      break;

    case "watch":
      if (state.welfareRisk >= 65 && state.weeksInState >= 2) {
        setComplianceStatePure(state, "investigation");
        state.investigation = {
          openedWeek: week,
          severity: state.welfareRisk >= 80 ? "high" : state.welfareRisk >= 72 ? "medium" : "low",
          triggers: reasons,
          progress: 0
        };
        EventBus.welfareCompliance(world, heya.id, { 
          heyaname: heya.name, 
          status: "investigation_opened",
          risk: state.welfareRisk 
        });

        generateGovernanceHeadline(world, heya.id, "major", `Full-scale investigation opened into ${heya.name}.`);
        if (world.mediaState) {
          world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 30);
        }
      } else if (state.welfareRisk <= 25 && state.weeksInState >= 3) {
        setComplianceStatePure(state, "compliant");
        EventBus.welfareCompliance(world, heya.id, { 
          heyaname: heya.name, 
          status: "cleared",
          risk: state.welfareRisk 
        });
      }
      break;

    case "investigation":
      const progressGain = clamp(Math.round(4 + (heya.facilities?.recovery || 50) / 30), 2, 12);
      state.investigation!.progress = clamp((state.investigation!.progress || 0) + progressGain, 0, 100);

      if (state.welfareRisk >= 85 || (seriousCount >= 3 && state.welfareRisk >= 70)) {
        setComplianceStatePure(state, "sanctioned");
        const fineYen = 5_000_000;
        state.sanctions = {
          recruitmentFreezeWeeks: 12,
          trainingIntensityCap: "medium",
          fineYen,
          note: "Mandatory welfare remediation"
        };

        heya.funds = (heya.funds ?? 0) - fineYen;

        EventBus.welfareCompliance(world, heya.id, { 
          heyaname: heya.name, 
          status: "sanctioned",
          risk: state.welfareRisk, 
          money: fineYen
        });

        // Simplified media call for pure phase
        generateGovernanceHeadline(world, heya.id, "critical", `Sanctions imposed on ${heya.name} for welfare violations.`);
        if (world.mediaState) {
          world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 50);
        }
      } else if (state.investigation!.progress >= 100 && state.welfareRisk <= 50) {
        setComplianceStatePure(state, "watch");
        state.investigation = undefined;
        EventBus.welfareCompliance(world, heya.id, { 
          heyaname: heya.name, 
          status: "investigation_closed",
          risk: state.welfareRisk 
        });
      }
      break;

    case "sanctioned":
      if (state.sanctions?.recruitmentFreezeWeeks && state.sanctions.recruitmentFreezeWeeks > 0) {
        state.sanctions.recruitmentFreezeWeeks--;
      }
      const freezeDone = !state.sanctions?.recruitmentFreezeWeeks || state.sanctions.recruitmentFreezeWeeks <= 0;
      if (freezeDone && state.welfareRisk <= 45 && state.weeksInState >= 4) {
        setComplianceStatePure(state, "watch");
        state.sanctions = undefined;
        EventBus.welfareCompliance(world, heya.id, {
          status: "sanctions_lifted",
          heyaname: heya.name,
          risk: state.welfareRisk
        });
      }
      break;
  }
}

function setComplianceStatePure(state: WelfareState, next: ComplianceState): void {
  if (state.complianceState !== next) {
    state.complianceState = next;
    state.weeksInState = 0;
  }
}
