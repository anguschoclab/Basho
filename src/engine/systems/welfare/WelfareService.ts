/**
 * src/engine/systems/welfare/WelfareService.ts
 * ============================================
 * Stateful orchestration for the Welfare System.
 *
 * Responsibilities:
 * 1. State Hydration (ensureHeyaWelfareState)
 * 2. Weekly Compliance Tick (applyWeeklyWelfareTick)
 * 3. Sanction & Investigation Management
 *
 * Goal: Service-oriented architecture with clear dependencies.
 */

import type { WorldState } from "../../types/world";
import type { Heya } from "../../types/heya";
import type { WelfareState, ComplianceState, DietRegimen } from "../../types/economy";
import type { Id } from "../../types/common";
import { EntityCollection } from "../../core/EntityCollection";
import { EntityService } from "../../core/EntityService";
import { clamp } from "../../utils/math";
import { EventBus } from "../../events";
import { calculateWeeklyWelfareDelta, computeInjuryPressure } from "./WelfareCalculations";
import { generateGovernanceHeadline } from "../media/MediaService";
import {
  DEFAULT_WELFARE_RISK,
  WELFARE_RISK_INDICATOR_THRESHOLD,
  RISK_SHIFT_THRESHOLD,
  INVESTIGATION_PROGRESS_GAIN,
  SANCTION_PROGRESS_GAIN,
  COMPLIANCE_PROGRESS_GAIN,
  SANCTION_RISK_THRESHOLD,
} from "../../../constants/engine/welfareTransitions";

/**
 * Ensures that a heya has a valid welfare state.
 * If not present, initializes it with default values.
 *
 * @param heya - The heya to check/initialize
 * @returns The current or new WelfareState
 */
export function ensureHeyaWelfareState(heya: Heya): WelfareState {
  return EntityService.ensureState(heya, "welfareState", () => ({
    welfareRisk: DEFAULT_WELFARE_RISK,
    complianceState: "compliant",
    weeksInState: 0,
    lastReviewedWeek: 0,
    activeDiet: "maintenance",
  }));
}

export const WelfareService = {
  ensureHeyaWelfareState,

  /**
   * Performs the weekly welfare compliance tick for all heyas in the world.
   * Calculates risk shifts, orchestrates transitions, and updates indicators.
   *
   * @param world - The current world state
   */
  applyWeeklyWelfareTick(world: WorldState): void {
    const stables = EntityCollection.getHeyas(world);
    const week = world.calendar?.currentWeek || 0;

    stables.forEach((heya) => {
      const state = this.ensureHeyaWelfareState(heya);
      const beforeRisk = state.welfareRisk;

      // 1. Calculate Risk Shift
      const { delta, reasons } = calculateWeeklyWelfareDelta(world, heya, state);
      state.welfareRisk = clamp(Math.round(state.welfareRisk + delta), 0, 100);
      state.weeksInState++;
      state.lastReviewedWeek = week;

      // 2. Transition Logic
      this.orchestrateComplianceTransitions(world, heya, state, reasons);

      // 3. Risk indicator Update
      if (!heya.riskIndicators)
        heya.riskIndicators = { financial: false, governance: false, rivalry: false };
      heya.riskIndicators.welfare =
        state.complianceState !== "compliant" ||
        state.welfareRisk >= WELFARE_RISK_INDICATOR_THRESHOLD;

      // 4. Material Shift logging
      const riskUp = state.welfareRisk - beforeRisk;
      if (Math.abs(riskUp) >= RISK_SHIFT_THRESHOLD) {
        EventBus.welfareCompliance(world, heya.id, {
          heyaname: heya.name,
          status: "risk_shift",
          risk: state.welfareRisk,
          delta: riskUp,
          reason: reasons.join("|"),
        });
      }
    });
  },

  /**
   * Orchestrates transitions through the compliance lifecycle based on risk and injury pressure.
   * Handles transitions between 'compliant', 'watch', 'investigation', and 'sanctioned' states.
   *
   * @param world - The current world state
   * @param heya - The heya undergoing transition check
   * @param state - The current welfare state of the heya
   * @param reasons - List of triggers/reasons for the current risk level
   */
  orchestrateComplianceTransitions(
    world: WorldState,
    heya: Heya,
    state: WelfareState,
    reasons: string[]
  ): void {
    const { seriousCount, negligenceCount } = computeInjuryPressure(world, heya);
    const hasNegligence = negligenceCount > 0;
    const week = world.calendar?.currentWeek || 0;

    const COMPLIANCE_HANDLERS: Record<ComplianceState, () => void> = {
      compliant: () => {
        const watchThreshold = hasNegligence ? 30 : 45;
        if (
          state.welfareRisk >= watchThreshold ||
          seriousCount >= 2 ||
          (hasNegligence && state.welfareRisk >= 20)
        ) {
          this.setComplianceState(state, "watch");
          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "watch",
            incident: hasNegligence ? "negligence_suspected" : "standard_watch",
            reason: reasons.join("|"),
          });

          generateGovernanceHeadline({
            world,
            heyaId: heya.id,
            templatePath: "institutional.welfare.watch_headline",
            severity: "local",
          });
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(
              100,
              (world.mediaState.heyaPressure[heya.id] ?? 0) + INVESTIGATION_PROGRESS_GAIN
            );
          }
        }
      },
      watch: () => {
        if (state.welfareRisk >= 65 && state.weeksInState >= 2) {
          this.setComplianceState(state, "investigation");
          state.investigation = {
            openedWeek: week,
            severity: state.welfareRisk >= 80 ? "high" : state.welfareRisk >= 72 ? "medium" : "low",
            triggers: reasons,
            progress: 0,
          };
          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "investigation_opened",
            risk: state.welfareRisk,
          });

          generateGovernanceHeadline({
            world,
            heyaId: heya.id,
            templatePath: "institutional.welfare.investigation_headline",
            severity: "national",
          });
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(
              100,
              (world.mediaState.heyaPressure[heya.id] ?? 0) + SANCTION_PROGRESS_GAIN
            );
          }
        } else if (state.welfareRisk <= 25 && state.weeksInState >= 3) {
          this.setComplianceState(state, "compliant");
          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "cleared",
            risk: state.welfareRisk,
          });
        }
      },
      investigation: () => {
        if (!state.investigation) {
          state.investigation = {
            openedWeek: week,
            severity: "low",
            triggers: [],
            progress: 0,
          };
        }
        const progressGain = clamp(Math.round(4 + (heya.facilities?.recovery || 50) / 30), 2, 12);
        state.investigation.progress = clamp(
          (state.investigation.progress || 0) + progressGain,
          0,
          100
        );

        if (state.welfareRisk >= 85 || (seriousCount >= 3 && state.welfareRisk >= 70)) {
          this.setComplianceState(state, "sanctioned");
          const fineYen = 5_000_000;
          state.sanctions = {
            recruitmentFreezeWeeks: 12,
            trainingIntensityCap: "medium",
            fineYen,
            note: "Mandatory welfare remediation",
          };

          heya.funds = (heya.funds ?? 0) - fineYen;

          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "sanctioned",
            risk: state.welfareRisk,
            money: fineYen,
          });

          generateGovernanceHeadline({
            world,
            heyaId: heya.id,
            templatePath: "institutional.welfare.sanction_headline",
            severity: "main_event",
          });
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(
              100,
              (world.mediaState.heyaPressure[heya.id] ?? 0) + COMPLIANCE_PROGRESS_GAIN
            );
          }
        } else if (
          state.investigation &&
          state.investigation.progress >= 100 &&
          state.welfareRisk <= SANCTION_RISK_THRESHOLD
        ) {
          this.setComplianceState(state, "watch");
          state.investigation = undefined;
          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "investigation_closed",
            risk: state.welfareRisk,
          });
        }
      },
      sanctioned: () => {
        if (state.sanctions?.recruitmentFreezeWeeks && state.sanctions.recruitmentFreezeWeeks > 0) {
          state.sanctions.recruitmentFreezeWeeks--;
        }
        const freezeDone =
          !state.sanctions?.recruitmentFreezeWeeks || state.sanctions.recruitmentFreezeWeeks <= 0;
        if (freezeDone && state.welfareRisk <= 45 && state.weeksInState >= 4) {
          this.setComplianceState(state, "watch");
          state.sanctions = undefined;
          EventBus.welfareCompliance(world, heya.id, {
            status: "sanctions_lifted",
            heyaname: heya.name,
            risk: state.welfareRisk,
          });
        }
      },
    };

    const handler = COMPLIANCE_HANDLERS[state.complianceState];
    if (handler) handler();
  },

  /**
   * Helper to transition a welfare state to a next compliance state.
   * Resets weeksInState if the state actually changes.
   *
   * @param state - The welfare state to update
   * @param next - The target compliance state
   */
  setComplianceState(state: WelfareState, next: ComplianceState): void {
    if (state.complianceState !== next) {
      state.complianceState = next;
      state.weeksInState = 0;
    }
  },

  /**
   * Sets the active diet regimen for a specific heya.
   * Triggers a welfare compliance event.
   *
   * @param world - The current world state
   * @param heyaId - The ID of the heya to update
   * @param diet - The new diet regimen to apply
   */
  setHeyaDiet(world: WorldState, heyaId: Id, diet: DietRegimen): void {
    const heya = EntityCollection.getHeya(world, heyaId);
    if (!heya) return;

    const state = this.ensureHeyaWelfareState(heya);
    const oldDiet = state.activeDiet;
    state.activeDiet = diet;

    EventBus.welfareCompliance(world, heyaId, {
      heyaname: heya.name,
      status: "diet_changed",
      regimen: diet,
      reason: oldDiet,
    });
  },
};
