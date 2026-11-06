/**
 * ObjectivesService.ts — yearly player objectives (T1.1).
 *
 * Career mode only: the JSA issues 1–2 objectives per year boundary
 * (sekitori targets, financial targets) scaled to stable stature.
 * Success grants political capital; failure deducts it. Sandbox mode
 * clears active objectives — no fail states by design.
 */

import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { rngForWorld } from "@/engine/core/rng";
import {
  objectiveProgress,
  type ObjectivesState,
  type PlayerObjective,
} from "@/engine/types/objectives";

const HISTORY_CAP = 12;

function isCareerMode(world: WorldState): boolean {
  return world.settings?.careerMode !== "sandbox";
}

/**
 * Evaluate pending objectives whose deadline has arrived. Met/failed
 * outcomes apply political-capital stakes and move to bounded history.
 */
export function evaluateObjectives(world: WorldState): StateImpact {
  const builder = createImpactBuilder("evaluateObjectives");
  const state = world.objectivesState;
  if (!state || !world.playerHeyaId) return builder.build();

  const nextActive: PlayerObjective[] = [];
  const history = [...(state.history ?? [])];
  const heya = world.heyas.get(world.playerHeyaId);
  let capitalDelta = 0;

  for (const obj of state.active) {
    if (obj.outcome !== "pending" || world.year < obj.deadlineYear) {
      nextActive.push(obj);
      continue;
    }
    const met = objectiveProgress(world, world.playerHeyaId, obj.kind) >= obj.target;
    const outcome = met ? "met" : "failed";
    capitalDelta += met ? obj.stakes : -obj.stakes;
    history.unshift({ id: obj.id, title: obj.title, outcome, year: world.year });
    builder.logEvent(
      "GOVERNANCE_RULING",
      "milestone",
      {
        incident: met ? "objective_met" : "objective_failed",
        reason: obj.title,
        score: obj.stakes,
      },
      { heyaId: world.playerHeyaId, importance: met ? "notable" : "major" }
    );
  }

  if (nextActive.length === state.active.length) return builder.build();

  const next: ObjectivesState = { active: nextActive, history: history.slice(0, HISTORY_CAP) };
  builder.updateWorldField("objectivesState", next);
  if (capitalDelta !== 0 && heya) {
    builder.updateHeya(world.playerHeyaId, {
      politicalCapital: Math.max(0, (heya.politicalCapital ?? 0) + capitalDelta),
    });
  }
  return builder.build();
}

/**
 * Issue new yearly objectives for the player (career mode only).
 * Idempotent per year — skips if a pending objective already exists for
 * the current year.
 */
export function issueYearlyObjectives(world: WorldState): StateImpact {
  const builder = createImpactBuilder("issueYearlyObjectives");
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId || !isCareerMode(world)) {
    // Sandbox: clear any active objectives carried over from a prior mode.
    if (world.objectivesState?.active?.length) {
      builder.updateWorldField("objectivesState", {
        active: [],
        history: world.objectivesState.history ?? [],
      } satisfies ObjectivesState);
    }
    return builder.build();
  }

  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return builder.build();

  const existing = world.objectivesState ?? { active: [], history: [] };
  if (existing.active.some((o) => o.issuedYear === world.year)) return builder.build();

  const rng = rngForWorld(world, "objectives", `year_${world.year}`);
  const objectives: PlayerObjective[] = [];

  // Sekitori growth target scaled to current roster strength.
  const sekitoriNow = objectiveProgress(world, playerHeyaId, "sekitori_count");
  const sekitoriTarget = sekitoriNow + (sekitoriNow >= 3 ? 1 : 2);
  objectives.push({
    id: rng.uuid("OBJ"),
    kind: "sekitori_count",
    title: `Reach ${sekitoriTarget} sekitori (currently ${sekitoriNow})`,
    baseline: sekitoriNow,
    target: sekitoriTarget,
    issuedYear: world.year,
    deadlineYear: world.year + 2,
    outcome: "pending",
    stakes: 10,
  });

  // Financial stability objective ~50% of years.
  if (rng.bool(0.5)) {
    const fundsNow = heya.funds ?? 0;
    const target = Math.max(0, Math.round(fundsNow * 1.1));
    objectives.push({
      id: rng.uuid("OBJ"),
      kind: "funds_growth",
      title: `Grow stable funds to ¥${(target / 1_000_000).toFixed(1)}M`,
      baseline: fundsNow,
      target,
      issuedYear: world.year,
      deadlineYear: world.year + 1,
      outcome: "pending",
      stakes: 5,
    });
  }

  for (const obj of objectives) {
    builder.logEvent(
      "GOVERNANCE_RULING",
      "milestone",
      { incident: "objective_issued", reason: obj.title, score: obj.stakes },
      { heyaId: playerHeyaId, importance: "notable" }
    );
  }

  builder.updateWorldField("objectivesState", {
    active: [...existing.active, ...objectives],
    history: existing.history ?? [],
  } satisfies ObjectivesState);
  return builder.build();
}
