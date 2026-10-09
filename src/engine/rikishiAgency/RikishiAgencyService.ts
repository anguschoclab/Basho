/**
 * RikishiAgencyService.ts — WS4 rikishi-level agency.
 *
 * Rikishi are actors: this module derives a weekly disposition from real,
 * visible state (motivation, stress, momentum, mentorship, deny/grant
 * history), generates threshold-crossed requests, and escalates ignored
 * unrest into incidents via canonical paths (reportScandal / welfare risk).
 * Pure + deterministic — callers commit via ImpactBuilder.
 */

import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import type { RikishiAgencyState, RikishiRequest, RikishiRequestType } from "./types";
import { RANK_HIERARCHY } from "../types/banzuke";
import { clamp } from "../utils/math";
import {
  REQUEST_COOLDOWN_WEEKS,
  REST_FATIGUE_THRESHOLD,
  INTENSITY_MOTIVATION_THRESHOLD,
  INTENSITY_FATIGUE_MAX,
  TRANSFER_SATISFACTION_MAX,
  TRANSFER_RESTLESSNESS_THRESHOLD,
  RETIREMENT_AGE_MIN,
  RETIREMENT_SATISFACTION_MAX,
  MENTOR_MAX_AGE,
  DISPUTE_MOMENTUM_MAX,
  DISPUTE_RESTLESSNESS_THRESHOLD,
  INCIDENT_RESTLESSNESS_THRESHOLD,
  INCIDENT_STRESS_THRESHOLD,
} from "../../constants/engine/rikishiAgency";
import { getEarlyShikonaMotivationBoost } from "../systems/generation/FightingNameEarly";

export { REQUEST_COOLDOWN_WEEKS };

/** Fold visible rikishi state into a banded disposition. Pure + deterministic. */
export function deriveDisposition(world: WorldState, r: Rikishi): RikishiAgencyState {
  const prev = r.agency;
  const motivation = (r.motivation ?? 50) + getEarlyShikonaMotivationBoost(r);
  const stress = r.behavior?.stress ?? 0;
  const momentum = r.momentum ?? 50;
  const denied = prev?.deniedCount ?? 0;
  const granted = prev?.grantedCount ?? 0;

  const satisfaction = clamp(
    Math.round(
      50 +
        (motivation - 50) * 0.5 -
        Math.max(0, stress - 30) * 0.6 +
        (momentum - 50) * 0.2 +
        (r.mentorId ? 8 : 0) -
        denied * 6 +
        granted * 4
    ),
    0,
    100
  );
  const restlessness = clamp(
    Math.round(stress * 0.45 + (100 - satisfaction) * 0.4 + denied * 12),
    0,
    100
  );
  const loyaltyBand =
    satisfaction >= 65
      ? "loyal"
      : satisfaction >= 45
        ? "wavering"
        : satisfaction >= 25
          ? "restless"
          : "discontent";

  return {
    satisfaction,
    restlessness,
    loyaltyBand,
    deniedCount: denied,
    grantedCount: granted,
    lastRequestWeek: prev?.lastRequestWeek,
    lastEvaluatedWeek: world.week ?? world.calendar?.currentWeek,
  };
}

/** Deterministic request rules — (condition, type, banded reason). */
const REQUEST_RULES: Array<{
  type: RikishiRequestType;
  reason: string;
  when: (r: Rikishi, d: RikishiAgencyState) => boolean;
}> = [
  {
    type: "request_rest",
    reason: "fatigue",
    when: (r) => (r.fatigue ?? 0) >= REST_FATIGUE_THRESHOLD,
  },
  {
    type: "seek_transfer",
    reason: "discontent",
    when: (_r, d) =>
      d.loyaltyBand === "discontent" && d.restlessness >= TRANSFER_RESTLESSNESS_THRESHOLD,
  },
  {
    type: "seek_transfer",
    reason: "low_satisfaction",
    when: (_r, d) => d.satisfaction <= TRANSFER_SATISFACTION_MAX && d.restlessness >= 55,
  },
  {
    type: "retirement_consideration",
    reason: "career_wind_down",
    when: (r, d) => (r.age ?? 0) >= RETIREMENT_AGE_MIN && d.satisfaction <= RETIREMENT_SATISFACTION_MAX,
  },
  {
    type: "request_intensity",
    reason: "high_motivation",
    when: (r) =>
      (r.motivation ?? 0) >= INTENSITY_MOTIVATION_THRESHOLD &&
      (r.fatigue ?? 0) <= INTENSITY_FATIGUE_MAX,
  },
  {
    type: "tactic_dispute",
    reason: "losing_streak",
    when: (r, d) =>
      (r.momentum ?? 50) <= DISPUTE_MOMENTUM_MAX &&
      d.restlessness >= DISPUTE_RESTLESSNESS_THRESHOLD,
  },
  {
    type: "mentor_request",
    reason: "development",
    when: (r, d) =>
      !r.mentorId &&
      !RANK_HIERARCHY[r.rank]?.isSekitori &&
      (r.age ?? 99) <= MENTOR_MAX_AGE &&
      d.satisfaction >= 40,
  },
];

/**
 * New requests this rikishi raises this week. Threshold crossing + cooldown +
 * no duplicate pending type. Deterministic (no rng).
 */
export function generateRequests(
  world: WorldState,
  r: Rikishi,
  disposition: RikishiAgencyState,
  pending: RikishiRequest[]
): RikishiRequest[] {
  const week = world.week ?? world.calendar?.currentWeek ?? 0;
  if (disposition.lastRequestWeek != null && week - disposition.lastRequestWeek < REQUEST_COOLDOWN_WEEKS) {
    return [];
  }
  const out: RikishiRequest[] = [];
  for (const rule of REQUEST_RULES) {
    if (pending.some((q) => q.rikishiId === r.id && q.type === rule.type)) continue;
    if (!rule.when(r, disposition)) continue;
    out.push({
      id: `${r.id}-${rule.type}-w${week}`,
      rikishiId: r.id,
      heyaId: r.heyaId,
      type: rule.type,
      createdWeek: week,
      reason: rule.reason,
    });
  }
  return out;
}

/** Unrest severe enough to risk an incident this week? */
export function shouldEscalate(r: Rikishi, d: RikishiAgencyState): boolean {
  return (
    d.restlessness >= INCIDENT_RESTLESSNESS_THRESHOLD &&
    (r.behavior?.stress ?? 0) >= INCIDENT_STRESS_THRESHOLD &&
    d.deniedCount >= 1
  );
}
