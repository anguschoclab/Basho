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

  // Collect events and media pressure changes to apply after loop
  const events: any[] = [];
  const mediaPressureChanges: Record<string, number> = {};

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
    orchestrateTransitionsPure(world, nextHeya, nextState, reasons, events, mediaPressureChanges);

    // 3. Risk indicator Update
    nextHeya.riskIndicators = {
      ...heya.riskIndicators,
      welfare: nextState.complianceState !== "compliant" || nextState.welfareRisk >= 55
    } as any;

    nextHeya.welfareState = nextState;

    // 4. Material Shift logging
    const riskUp = nextState.welfareRisk - beforeRisk;
    if (Math.abs(riskUp) >= 8) {
      events.push({
        type: 'welfareCompliance',
        heyaId: nextHeya.id,
        heyaname: nextHeya.name,
        status: "risk_shift",
        risk: nextState.welfareRisk,
        delta: riskUp,
        reason: reasons.join("|")
      });
    }

    nextHeyas.set(id, nextHeya);
  }

  // Apply collected events and media pressure changes
  let nextWorld = {
    ...world,
    heyas: nextHeyas
  };

  // Apply media pressure changes
  if (Object.keys(mediaPressureChanges).length > 0) {
    const nextMediaState = nextWorld.mediaState 
      ? { ...nextWorld.mediaState, heyaPressure: { ...nextWorld.mediaState.heyaPressure } as Record<string, number> }
      : undefined;
    if (nextMediaState) {
      for (const [heyaId, delta] of Object.entries(mediaPressureChanges)) {
        nextMediaState.heyaPressure[heyaId] = Math.min(100, (nextMediaState.heyaPressure[heyaId] ?? 0) + delta);
      }
      nextWorld = { ...nextWorld, mediaState: nextMediaState };
    }
  }

  // Apply collected events
  for (const event of events) {
    if (event.type === 'welfareCompliance') {
      EventBus.welfareCompliance(nextWorld, event.heyaId, {
        heyaname: event.heyaname,
        status: event.status,
        risk: event.risk,
        delta: event.delta,
        reason: event.reason
      });
    } else if (event.type === 'welfareComplianceWithImportance') {
      EventBus.welfareCompliance(nextWorld, event.heyaId, event.ctx);
    } else if (event.type === 'governanceHeadline') {
      generateGovernanceHeadline({
        world: nextWorld,
        heyaId: event.heyaId,
        templatePath: 'institutional.governance.welfare_headline',
        severity: event.severity
      });
    }
  }

  return nextWorld;
}

function orchestrateTransitionsPure(world: WorldState, heya: Heya, state: WelfareState, reasons: string[], events: any[], mediaPressureChanges: Record<string, number>): void {
  const { seriousCount, negligenceCount } = computeInjuryPressure(world, heya);
  const hasNegligence = negligenceCount > 0;
  const week = world.calendar.currentWeek || 0;

  switch (state.complianceState) {
    case "compliant":
      handleCompliantTransition(world, heya, state, reasons, events, mediaPressureChanges, hasNegligence, seriousCount);
      break;

    case "watch":
      handleWatchTransition(world, heya, state, reasons, events, mediaPressureChanges, week);
      break;

    case "investigation":
      handleInvestigationTransition(world, heya, state, reasons, events, mediaPressureChanges, seriousCount);
      break;

    case "sanctioned":
      handleSanctionedTransition(world, heya, state, reasons, events);
      break;
  }
}

function handleCompliantTransition(world: WorldState, heya: Heya, state: WelfareState, reasons: string[], events: any[], mediaPressureChanges: Record<string, number>, hasNegligence: boolean, seriousCount: number): void {
  const watchThreshold = hasNegligence ? 30 : 45;
  if (state.welfareRisk >= watchThreshold || seriousCount >= 2 || (hasNegligence && state.welfareRisk >= 20)) {
    setComplianceStatePure(state, "watch");
    events.push({
      type: 'welfareComplianceWithImportance',
      heyaId: heya.id,
      ctx: {
        heyaname: heya.name,
        status: "watch",
        incident: hasNegligence ? "negligence_suspected" : "standard_watch",
        reason: reasons.join("|")
      },
      importance: "notable"
    });

    events.push({
      type: 'governanceHeadline',
      heyaId: heya.id,
      severity: "national",
      message: "Heya placed under regulatory watch for welfare concerns."
    });
    mediaPressureChanges[heya.id] = (mediaPressureChanges[heya.id] ?? 0) + 15;
  }
}

function handleWatchTransition(world: WorldState, heya: Heya, state: WelfareState, reasons: string[], events: any[], mediaPressureChanges: Record<string, number>, week: number): void {
  if (state.welfareRisk >= 65 && state.weeksInState >= 2) {
    setComplianceStatePure(state, "investigation");
    state.investigation = {
      openedWeek: week,
      severity: state.welfareRisk >= 80 ? "high" : state.welfareRisk >= 72 ? "medium" : "low",
      triggers: reasons,
      progress: 0
    };
    events.push({
      type: 'welfareComplianceWithImportance',
      heyaId: heya.id,
      ctx: {
        heyaname: heya.name,
        status: "investigation_opened",
        risk: state.welfareRisk
      },
      importance: "notable"
    });

    events.push({
      type: 'governanceHeadline',
      heyaId: heya.id,
      severity: "national",
      message: `Full-scale investigation opened into ${heya.name}.`
    });
    mediaPressureChanges[heya.id] = (mediaPressureChanges[heya.id] ?? 0) + 30;
  } else if (state.welfareRisk <= 25 && state.weeksInState >= 3) {
    setComplianceStatePure(state, "compliant");
    events.push({
      type: 'welfareComplianceWithImportance',
      heyaId: heya.id,
      ctx: {
        heyaname: heya.name,
        status: "cleared",
        risk: state.welfareRisk
      },
      importance: "notable"
    });
  }
}

function handleInvestigationTransition(world: WorldState, heya: Heya, state: WelfareState, reasons: string[], events: any[], mediaPressureChanges: Record<string, number>, seriousCount: number): void {
  const progressGain = clamp(Math.round(4 + (heya.facilities?.recovery || 50) / 30), 2, 12);
  state.investigation!.progress = clamp((state.investigation!.progress || 0) + progressGain, 0, 100);

  if (state.welfareRisk >= 85 || (seriousCount >= 3 && state.welfareRisk >= 70)) {
    transitionToSanctioned(heya, state, events, mediaPressureChanges);
  } else if (state.investigation!.progress >= 100 && state.welfareRisk <= 50) {
    setComplianceStatePure(state, "watch");
    state.investigation = undefined;
    events.push({
      type: 'welfareComplianceWithImportance',
      heyaId: heya.id,
      ctx: {
        heyaname: heya.name,
        status: "investigation_closed",
        risk: state.welfareRisk
      },
      importance: "notable"
    });
  }
}

function transitionToSanctioned(heya: Heya, state: WelfareState, events: any[], mediaPressureChanges: Record<string, number>): void {
  setComplianceStatePure(state, "sanctioned");
  const fineYen = 5_000_000;
  state.sanctions = {
    recruitmentFreezeWeeks: 12,
    trainingIntensityCap: "medium",
    fineYen,
    note: "Mandatory welfare remediation"
  };

  heya.funds = (heya.funds ?? 0) - fineYen;

  events.push({
    type: 'welfareComplianceWithImportance',
    heyaId: heya.id,
    ctx: {
      heyaname: heya.name,
      status: "sanctioned",
      risk: state.welfareRisk,
      money: fineYen
    },
    importance: "notable"
  });

  events.push({
    type: 'governanceHeadline',
    heyaId: heya.id,
    severity: "national",
    message: `Sanctions imposed on ${heya.name} for welfare violations.`
  });
  mediaPressureChanges[heya.id] = (mediaPressureChanges[heya.id] ?? 0) + 50;
}

function handleSanctionedTransition(world: WorldState, heya: Heya, state: WelfareState, reasons: string[], events: any[]): void {
  if (state.sanctions?.recruitmentFreezeWeeks && state.sanctions.recruitmentFreezeWeeks > 0) {
    state.sanctions.recruitmentFreezeWeeks--;
  }
  const freezeDone = !state.sanctions?.recruitmentFreezeWeeks || state.sanctions.recruitmentFreezeWeeks <= 0;
  if (freezeDone && state.welfareRisk <= 45 && state.weeksInState >= 4) {
    setComplianceStatePure(state, "watch");
    state.sanctions = undefined;
    events.push({
      type: 'welfareComplianceWithImportance',
      heyaId: heya.id,
      ctx: {
        status: "sanctions_lifted",
        heyaname: heya.name,
        risk: state.welfareRisk
      },
      importance: "notable"
    });
  }
}

function setComplianceStatePure(state: WelfareState, next: ComplianceState): void {
  if (state.complianceState !== next) {
    state.complianceState = next;
    state.weeksInState = 0;
  }
}
