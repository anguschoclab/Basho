/**
 * requests.ts — WS4 rikishi agency: request resolution and effects.
 *
 * `resolveNPCRequest` is a deterministic archetype/trait policy — no rng —
 * so an NPC oyakata answers requests the way their persona dictates.
 * `applyRequestOutcome` writes the REAL consequence through ImpactBuilder for
 * both the NPC path (weekly phase) and the player path (LoopDecisionEngine).
 */

import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Oyakata } from "../types/oyakata";
import type { Rikishi } from "../types/rikishi";
import type { ImpactBuilder } from "../core/ImpactBuilder";
import type { RikishiRequest } from "./types";
import { clamp } from "../utils/math";
import { assignMentor } from "../lineage";
import { MentorshipService } from "../systems/training/MentorshipService";
import { getRikishi } from "../queries";
import {
  DENY_STRESS_DELTA,
  DENY_RESTLESSNESS_DELTA,
  DENY_MOTIVATION_DELTA,
  REST_FATIGUE_RELIEF,
  GRANT_MOTIVATION_DELTA,
  GRANT_STRESS_RELIEF,
  GRANT_SATISFACTION_DELTA,
} from "../../constants/engine/rikishiAgency";

/** Deterministic archetype/trait answer to a pending request. */
export function resolveNPCRequest(
  world: WorldState,
  _heya: Heya,
  oyakata: Oyakata,
  request: RikishiRequest
): "grant" | "deny" {
  const r = world.rikishi.get(request.rikishiId);
  if (!r) return "deny";
  const compassion = oyakata.traits?.compassion ?? 50;
  const ambition = oyakata.traits?.ambition ?? 50;
  const tradition = oyakata.traits?.tradition ?? 50;

  switch (request.type) {
    case "request_rest":
      // Welfare-minded stables rest tired rikishi; hard drivers only relent
      // when the oyakata is unusually compassionate.
      return oyakata.archetype === "tyrant" || oyakata.archetype === "strict"
        ? compassion >= 60
          ? "grant"
          : "deny"
        : compassion >= 40
          ? "grant"
          : "deny";
    case "request_intensity":
      // Ambitious / exacting stables welcome a rikishi asking for more work.
      return ambition >= 55 || oyakata.archetype === "tyrant" || oyakata.archetype === "scientist"
        ? "grant"
        : "deny";
    case "seek_transfer":
      // Transfers are almost always refused — only genuinely compassionate
      // stables let a miserable rikishi walk.
      return compassion >= 70 && (oyakata.archetype === "nurturer" || oyakata.archetype === "indulgent")
        ? "grant"
        : "deny";
    case "retirement_consideration":
      // Retirement is honored — except tyrants who keep drawing on sekitori.
      return oyakata.archetype === "tyrant" && compassion < 50 ? "deny" : "grant";
    case "mentor_request":
      // Granted only when a plausible mentor exists on the roster.
      return pickMentor(world, r) ? "grant" : "deny";
    case "tactic_dispute":
      // Traditionalists dismiss style complaints; adaptive minds listen.
      return tradition < 60 || oyakata.archetype === "scientist" || oyakata.archetype === "strategist"
        ? "grant"
        : "deny";
    default:
      return "deny";
  }
}

/**
 * Apply grant/deny consequences. Mutates via ImpactBuilder only; callers are
 * responsible for removing the request from world.pendingRikishiRequests.
 */
export function applyRequestOutcome(
  world: WorldState,
  builder: ImpactBuilder,
  request: RikishiRequest,
  granted: boolean
): void {
  const r = getRikishi(world, request.rikishiId);
  if (!r) return;
  const week = world.week ?? world.calendar?.currentWeek ?? 0;
  const agency = r.agency ?? {
    satisfaction: 50,
    restlessness: 50,
    loyaltyBand: "wavering" as const,
    deniedCount: 0,
    grantedCount: 0,
  };

  if (!granted) {
    builder.updateRikishi(r.id, {
      motivation: clamp((r.motivation ?? 50) - DENY_MOTIVATION_DELTA, 0, 100),
      behavior: {
        ...r.behavior,
        stress: clamp((r.behavior?.stress ?? 0) + DENY_STRESS_DELTA, 0, 100),
      },
      agency: {
        ...agency,
        deniedCount: agency.deniedCount + 1,
        restlessness: clamp(agency.restlessness + DENY_RESTLESSNESS_DELTA, 0, 100),
        satisfaction: clamp(agency.satisfaction - 8, 0, 100),
        lastRequestWeek: week,
      },
    });
    builder.logEvent(
      "LIFECYCLE_EVENT",
      "narrative",
      {
        rikishiId: r.id,
        heyaId: request.heyaId,
        status: "request_denied",
        requestType: request.type,
      },
      { rikishiId: r.id, heyaId: request.heyaId, importance: "minor" }
    );
    return;
  }

  const grant: Partial<Rikishi> = {
    motivation: clamp((r.motivation ?? 50) + GRANT_MOTIVATION_DELTA, 0, 100),
    behavior: {
      ...r.behavior,
      stress: clamp((r.behavior?.stress ?? 0) - GRANT_STRESS_RELIEF, 0, 100),
    },
    agency: {
      ...agency,
      grantedCount: agency.grantedCount + 1,
      satisfaction: clamp(agency.satisfaction + GRANT_SATISFACTION_DELTA, 0, 100),
      restlessness: clamp(agency.restlessness - 20, 0, 100),
      lastRequestWeek: week,
    },
  };

  switch (request.type) {
    case "request_rest":
      grant.fatigue = clamp((r.fatigue ?? 0) - REST_FATIGUE_RELIEF, 0, 100);
      break;
    case "request_intensity":
      grant.fatigue = clamp((r.fatigue ?? 0) + 10, 0, 100);
      grant.momentum = clamp((r.momentum ?? 50) + 8, 0, 100);
      break;
    case "seek_transfer":
      grant.transferListed = true;
      break;
    case "retirement_consideration":
      grant.retirementPlanned = true;
      break;
    case "mentor_request": {
      const mentor = pickMentor(world, r);
      if (mentor) {
        const res = assignMentor(world, r.id, mentor.id);
        if (res.ok && res.impact) builder.merge(res.impact);
      }
      break;
    }
    case "tactic_dispute":
      grant.momentum = clamp((r.momentum ?? 50) + 8, 0, 100);
      break;
  }

  builder.updateRikishi(r.id, grant);
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "narrative",
    {
      rikishiId: r.id,
      heyaId: request.heyaId,
      status: "request_granted",
      requestType: request.type,
    },
    { rikishiId: r.id, heyaId: request.heyaId, importance: "minor" }
  );
}

/** Highest-technique eligible mentor on the same roster. */
function pickMentor(world: WorldState, r: Rikishi) {
  const heya = world.heyas.get(r.heyaId);
  let best: Rikishi | undefined;
  for (const id of heya?.rikishiIds ?? []) {
    if (id === r.id) continue;
    const m = world.rikishi.get(id);
    if (!m || m.isRetired || m.injured) continue;
    if (!MentorshipService.canMentor(m, r)) continue;
    if (!best || m.stats.technique > best.stats.technique) best = m;
  }
  return best;
}
