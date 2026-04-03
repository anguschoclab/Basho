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
import { logEngineEvent } from "../../events";
import { 
  calculateWeeklyWelfareDelta, 
  computeInjuryPressure 
} from "./WelfareCalculations";
import { generateGovernanceHeadline } from "../media/MediaService";
import { assertNever } from "../../utils/types";

/**
 * Unified Welfare Service.
 */
export const WelfareService = {
  /**
   * Ensure heya welfare state exists.
   */
  ensureHeyaWelfareState(heya: Heya): WelfareState {
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
  },

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
        logEngineEvent(world, {
          type: "WELFARE_RISK_UPDATE",
          category: "discipline",
          importance: state.welfareRisk >= 70 ? "major" : "notable",
          scope: "heya",
          heyaId: heya.id,
          title: "Welfare Risk Shift",
          summary: `${heya.name} welfare risk is now ${state.welfareRisk}.`,
          data: { welfareRisk: state.welfareRisk, delta: riskUp, reasons: reasons.join("|") }
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
          logEngineEvent(world, {
            type: "COMPLIANCE_WATCH",
            category: "discipline",
            importance: "notable",
            scope: "heya",
            heyaId: heya.id,
            title: hasNegligence ? "Compliance Watch — Negligence Suspected" : "Compliance Watch",
            summary: hasNegligence
                ? `${heya.name} placed under watch. Regulators suspect negligence.`
                : `${heya.name} placed under watch for welfare concerns.`,
            data: { welfareRisk: state.welfareRisk, negligenceCount, reasons: reasons.join("|") }
          });

          // --- MEDIA CONNECTIVITY (Phase 3.3) ---
          generateGovernanceHeadline(world, heya.id, "minor", "Heya placed under regulatory watch for welfare concerns.");
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
          logEngineEvent(world, {
            type: "COMPLIANCE_INVESTIGATION_OPENED",
            category: "discipline",
            importance: state.welfareRisk >= 80 ? "headline" : "major",
            scope: "heya",
            heyaId: heya.id,
            title: "Investigation Opened",
            summary: `Regulators open an investigation into ${heya.name}.`,
            data: { welfareRisk: state.welfareRisk }
          });

          // --- MEDIA CONNECTIVITY (Phase 3.3) ---
          generateGovernanceHeadline(world, heya.id, "major", `Full-scale investigation opened into ${heya.name}.`);
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 30);
          }
        } else if (state.welfareRisk <= 25 && state.weeksInState >= 3) {
          this.setComplianceState(state, "compliant");
          logEngineEvent(world, {
            type: "COMPLIANCE_CLEARED",
            category: "discipline",
            importance: "minor",
            scope: "heya",
            heyaId: heya.id,
            title: "Watch Lifted",
            summary: `${heya.name} returns to good standing.`,
            data: { welfareRisk: state.welfareRisk }
          });
        }
        break;

      case "investigation":
        const progressGain = clamp(Math.round(4 + (heya.facilities?.recovery || 50) / 30), 2, 12);
        state.investigation!.progress = clamp((state.investigation!.progress || 0) + progressGain, 0, 100);

        if (state.welfareRisk >= 85 || (seriousCount >= 3 && state.welfareRisk >= 70)) {
          this.setComplianceState(state, "sanctioned");
          state.sanctions = {
            recruitmentFreezeWeeks: 12,
            trainingIntensityCap: "medium",
            fineYen: 5_000_000,
            note: "Mandatory welfare remediation"
          };
          logEngineEvent(world, {
            type: "COMPLIANCE_SANCTIONED",
            category: "discipline",
            importance: "headline",
            scope: "heya",
            heyaId: heya.id,
            title: "Sanctions Issued",
            summary: `${heya.name} sanctioned for violations.`,
            data: { welfareRisk: state.welfareRisk }
          });

          // --- MEDIA CONNECTIVITY (Phase 3.3) ---
          generateGovernanceHeadline(world, heya.id, "critical", `${heya.name} sanctioned for severe welfare violations.`);
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 50);
          }
        } else if (state.investigation!.progress >= 100 && state.welfareRisk <= 50) {
          this.setComplianceState(state, "watch");
          state.investigation = undefined;
          logEngineEvent(world, {
            type: "COMPLIANCE_INVESTIGATION_CLOSED",
            category: "discipline",
            importance: "major",
            scope: "heya",
            heyaId: heya.id,
            title: "Investigation Closed",
            summary: `${heya.name} meets remediation requirements.`,
            data: { welfareRisk: state.welfareRisk }
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
          logEngineEvent(world, {
            type: "COMPLIANCE_SANCTIONS_LIFTED",
            category: "discipline",
            importance: "major",
            scope: "heya",
            heyaId: heya.id,
            title: "Sanctions Lifted",
            summary: `${heya.name} served sanctions and returns to watch.`,
            data: { welfareRisk: state.welfareRisk }
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

    logEngineEvent(world, {
      type: "DIET_CHANGED",
      category: "facility",
      importance: "minor",
      scope: "heya",
      heyaId,
      title: `${heya.name} changed diet to ${diet}`,
      summary: `${heya.name} is now using the ${diet} regimen.`,
      data: { oldDiet, newDiet: diet }
    });
  }
};
