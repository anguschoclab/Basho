/**
 * phase01_daily_micro.ts
 * ========================
 * Pipeline Phase 1 (Daily) — Fused daily micro-phases.
 *
 * Combines phase01_daily_economy, phase01_daily_welfare,
 * phase01_daily_sponsors, and phase01_daily_drama into a single
 * StateImpact, reducing 4 resolveImpacts calls to 1.
 *
 * The phases must execute in the same order as before (economy → welfare →
 * sponsors → drama) because welfare reads heya funds updated by economy,
 * and drama may read state updated by prior phases.
 */

import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { mergeImpacts, resolveImpacts } from "../../core/ImpactResolver";
import { phase01_daily_economy } from "./phase01_daily_economy";
import { phase01_daily_welfare } from "./phase01_daily_welfare";
import { phase01_daily_sponsors } from "./phase01_daily_sponsors";
import { phase01_daily_drama } from "./phase01_daily_drama";

export function phase01_daily_micro(world: WorldState): StateImpact {
  // Run each sub-phase in sequence, accumulating impacts.
  // We use a running world state so each sub-phase sees the prior phase's
  // resolved state (same as the pipeline runner would do).
  const impacts: StateImpact[] = [];

  impacts.push(phase01_daily_economy(world));

  // Resolve economy impact to feed welfare the updated heya funds
  let currentWorld = resolveImpacts(world, [impacts[0]]);

  impacts.push(phase01_daily_welfare(currentWorld));
  currentWorld = resolveImpacts(currentWorld, [impacts[1]]);

  impacts.push(phase01_daily_sponsors(currentWorld));
  currentWorld = resolveImpacts(currentWorld, [impacts[2]]);

  impacts.push(phase01_daily_drama(currentWorld));

  // Merge all 4 impacts into a single StateImpact
  const merged = mergeImpacts(impacts);
  const builder = createImpactBuilder("phase01_daily_micro");
  builder.merge(merged);

  return builder.build();
}
