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
import { RNGRegistry } from "../../core/RNGRegistry";
import { EntityService } from "../../core/EntityService";
import { clamp } from "../../utils/math";
import { EventBus } from "../../events";
import { BardEngine } from "../../narrative/BardEngine";
import { rngFromSeed } from "../../rng";
import { 
  calculateWeeklyWelfareDelta, 
  computeInjuryPressure 
} from "./WelfareCalculations";
import { generateGovernanceHeadline } from "../media/MediaService";
import { assertNever } from "../../utils/types";

/**
 * Unified Welfare Service.
 */
export function ensureHeyaWelfareState(heya: Heya): WelfareState {
  return EntityService.ensureState(
    heya, 
    "welfareState", 
    () => ({
      welfareRisk: 10,
      complianceState: "compliant",
      weeksInState: 0,
      lastReviewedWeek: 0,
      activeDiet: "maintenance"
    })
  );
}

export const WelfareService = {
  ensureHeyaWelfareState,

  /**
   * Authoritative Weekly Welfare Tick.
   */
  applyWeeklyWelfareTick(world: WorldState): void {
    const stables = EntityCollection.getHeyas(world);
    const week = world.calendar.currentWeek || 0;

    stables.forEach(heya => {
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
      if (!heya.riskIndicators) heya.riskIndicators = {} as any;
      heya.riskIndicators!.welfare = state.complianceState !== "compliant" || state.welfareRisk >= 55;

      // 4. Material Shift logging
      const riskUp = state.welfareRisk - beforeRisk;
      if (Math.abs(riskUp) >= 8) {
        EventBus.welfareCompliance(world, heya.id, { 
          heyaname: heya.name, 
          status: "risk_shift",
          risk: state.welfareRisk, 
          delta: riskUp, 
          reason: reasons.join("|") 
        });
      }
    });
  },

  /**
   * Orchestrates transitions through the compliance lifecycle.
   */
  orchestrateComplianceTransitions(world: WorldState, heya: Heya, state: WelfareState, reasons: string[]): void {
    const { seriousCount, negligenceCount } = computeInjuryPressure(world, heya);
    const hasNegligence = negligenceCount > 0;
    const week = world.calendar.currentWeek || 0;

    switch (state.complianceState) {
      case "compliant":
        const watchThreshold = hasNegligence ? 30 : 45;
        if (state.welfareRisk >= watchThreshold || seriousCount >= 2 || (hasNegligence && state.welfareRisk >= 20)) {
          this.setComplianceState(state, "watch");
          EventBus.welfareCompliance(world, heya.id, { 
            heyaname: heya.name, 
            status: "watch",
            incident: hasNegligence ? "negligence_suspected" : "standard_watch", 
            reason: reasons.join("|") 
          });

          // --- MEDIA CONNECTIVITY (Phase 3.3) ---
          generateGovernanceHeadline({
            world, 
            heyaId: heya.id, 
            templatePath: 'institutional.welfare.watch_headline',
            severity: "local"
          });
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 15);
          }
        }
        break;

      case "watch":
        if (state.welfareRisk >= 65 && state.weeksInState >= 2) {
          this.setComplianceState(state, "investigation");
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

          // --- MEDIA CONNECTIVITY (Phase 3.3) ---
          generateGovernanceHeadline({
            world, 
            heyaId: heya.id, 
            templatePath: 'institutional.welfare.investigation_headline',
            severity: "national"
          });
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 30);
          }
        } else if (state.welfareRisk <= 25 && state.weeksInState >= 3) {
          this.setComplianceState(state, "compliant");
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
          this.setComplianceState(state, "sanctioned");
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

          // --- MEDIA CONNECTIVITY (Phase 3.3) ---
          generateGovernanceHeadline({
            world, 
            heyaId: heya.id, 
            templatePath: 'institutional.welfare.sanction_headline',
            severity: "main_event"
          });
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 50);
          }
        } else if (state.investigation!.progress >= 100 && state.welfareRisk <= 50) {
          this.setComplianceState(state, "watch");
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
          this.setComplianceState(state, "watch");
          state.sanctions = undefined;
          EventBus.welfareCompliance(world, heya.id, {
            status: "sanctions_lifted",
            heyaname: heya.name,
            risk: state.welfareRisk
          });
        }
        break;
      default: assertNever(state.complianceState);

    }
  },

  /**
   * Transition state helper.
   */
  setComplianceState(state: WelfareState, next: ComplianceState): void {
    if (state.complianceState !== next) {
      state.complianceState = next;
      state.weeksInState = 0;
    }
  },

  /**
   * Set active diet for a heya.
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
      reason: oldDiet
    });
  }
};
