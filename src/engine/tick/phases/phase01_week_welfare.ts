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
import type { MediaHeadline } from "../../types/media";
import { createImpactBuilder, type ImpactBuilder } from "../../core/ImpactBuilder";
import { resolveImpacts } from "../../core/ImpactResolver";
import type { StateImpact } from "../../core/StateImpact";
import {
  calculateWeeklyWelfareDelta,
  computeInjuryPressure,
} from "../../systems/welfare/WelfareCalculations";
import { clamp } from "../../utils/math";
import { WelfareService } from "../../systems/welfare/WelfareService";
import { getHeyaRoster } from "../../queries";
import { canEncourage, provideEncouragement } from "../../actions/InjuredEncouragement";
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
  MORALE_WELFARE_RISK_WEIGHT,
  MORALE_MOMENTUM_NORMALIZER,
  MORALE_MOMENTUM_OFFSET,
  MORALE_SANCTIONED_PENALTY,
  MORALE_INVESTIGATION_PENALTY,
  MORALE_WATCH_PENALTY,
  MAX_MORALE,
} from "../../../constants/engine/welfare";

interface HeyaRiskIndicators {
  financial: boolean;
  governance: boolean;
  rivalry: boolean;
  welfare?: boolean;
}

export function phase01_week_welfare(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_welfare");
  const week = world.calendar?.currentWeek ?? 0;

  // Collect media pressure changes and generated headlines to apply after
  // the loop in a single composed mediaState write (per-headline merges carry
  // stale input snapshots and would drop all but the last).
  const mediaPressureChanges: Record<string, number> = {};
  const collectedHeadlines: MediaHeadline[] = [];

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

    // 1b. Calculate Morale (0..100)
    const roster = getHeyaRoster(world, heya.id);
    let momentumSum = 0;
    for (const r of roster) {
      momentumSum += r.momentum ?? 0;
    }
    const avgMomentum = roster.length > 0 ? momentumSum / roster.length : 0;
    let morale = Math.round(
      (100 - nextState.welfareRisk) * MORALE_WELFARE_RISK_WEIGHT +
        (avgMomentum + MORALE_MOMENTUM_OFFSET) * MORALE_MOMENTUM_NORMALIZER
    );
    // Compliance penalties
    if (nextState.complianceState === "sanctioned") morale -= MORALE_SANCTIONED_PENALTY;
    else if (nextState.complianceState === "investigation") morale -= MORALE_INVESTIGATION_PENALTY;
    else if (nextState.complianceState === "watch") morale -= MORALE_WATCH_PENALTY;
    nextState.morale = clamp(morale, 0, MAX_MORALE);

    // 2. Transition Logic (Inlined/Refactored for purity)
    orchestrateTransitionsPure(
      world,
      heya,
      nextState,
      reasons,
      builder,
      mediaPressureChanges,
      collectedHeadlines
    );

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
        "welfare",
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

  // Injured encouragement: injured rikishi encourage active stablemates.
  // Each provideEncouragement impact carries complete snapshots
  // (encouragementLog, recipient motivation) derived from its input world —
  // sequence them so later encouragements build on earlier ones instead of
  // being silently dropped by last-wins merge.
  const bashoName = world.currentBasho?.bashoName ?? "off-season";
  let encWorld = world;
  const encImpacts: StateImpact[] = [];
  for (const [, heya] of world.heyas) {
    const roster = getHeyaRoster(encWorld, heya.id);
    // ⚡ Bolt: Single pass loop over roster replaces two array.filter() passes for performance
    const injured = [];
    const active = [];
    for (const r of roster) {
      if (!r.isRetired) {
        if (r.injured) injured.push(r);
        else active.push(r);
      }
    }
    if (injured.length === 0 || active.length === 0) continue;

    // Limit to 1 encouragement per injured rikishi per week
    for (const from of injured) {
      for (const to of active) {
        if (!canEncourage(from, to)) continue;
        const encImpact = provideEncouragement(encWorld, from, to, bashoName);
        encImpacts.push(encImpact);
        encWorld = resolveImpacts(encWorld, [encImpact]);
        break; // 1 encouragement per injured rikishi per week
      }
    }
  }
  for (const encImpact of encImpacts) builder.merge(encImpact);

  // Compose mediaState once: collected headlines + accumulated pressure
  // deltas on the input base. A pressure-only write would drop the headlines
  // merged by the transition handlers above (they carry input-world
  // snapshots), so they must be composed here.
  if (collectedHeadlines.length > 0 || Object.keys(mediaPressureChanges).length > 0) {
    const base = world.mediaState;
    if (base) {
      const heyaPressure = { ...(base.heyaPressure ?? {}) } as Record<string, number>;
      for (const heyaId in mediaPressureChanges) {
        if (!Object.prototype.hasOwnProperty.call(mediaPressureChanges, heyaId)) continue;
        heyaPressure[heyaId] = Math.min(
          MAX_MEDIA_PRESSURE,
          (heyaPressure[heyaId] ?? 0) + mediaPressureChanges[heyaId]
        );
      }
      builder.updateWorldField("mediaState", {
        ...base,
        headlines: [...(base.headlines ?? []), ...collectedHeadlines],
        heyaPressure,
      });
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
  mediaPressureChanges: Record<string, number>,
  collectedHeadlines: MediaHeadline[]
): void {
  const { seriousCount, negligenceCount } = computeInjuryPressure(world, heya);
  const hasNegligence = negligenceCount > 0;
  const week = world.calendar?.currentWeek ?? 0;

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
        seriousCount,
        collectedHeadlines
      );
      break;

    case "watch":
      handleWatchTransition(
        world,
        heya,
        state,
        reasons,
        builder,
        mediaPressureChanges,
        week,
        collectedHeadlines
      );
      break;

    case "investigation":
      handleInvestigationTransition(
        world,
        heya,
        state,
        reasons,
        builder,
        mediaPressureChanges,
        seriousCount,
        collectedHeadlines
      );
      break;

    case "sanctioned":
      handleSanctionedTransition(world, heya, state, reasons, builder);
      break;
  }
}
