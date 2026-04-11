/**
 * bashoPipeline.ts
 * ================
 * Phase array for an active-tournament week.
 *
 * During a basho the economic and progression cadence is lighter — no
 * full training occurs (rikishi are competing), and welfare only handles
 * bout-sustained injuries processed separately by boutResolver.
 *
 * Phases included:
 *   1. Economy   — income / upkeep still applies during basho weeks
 *   2. Context   — recompute ActiveModifiers (financialPenalty may still hit)
 *   5. NPC AI    — rival stables still make strategic decisions
 *   6. Narrative — financial crisis events still fire if applicable
 *
 * Phases 3 (progression) and 4 (welfare) are intentionally excluded:
 *   - Training gains are paused; rikishi do not train during competition.
 *   - Injury rolling is handled by boutResolver per bout outcome.
 */

import type { PipelinePhase } from "../pipelineRunner";
import * as phases from "../phases";

export const bashoPipeline: PipelinePhase[] = [
  phases.phase02_context, // Recompute ActiveModifiers (financialPenalty may still hit during basho)
  phases.phase01_week_governance,
  phases.phase01_week_npc_ai,
  phases.phase01_week_recruitment,
  phases.phase01_week_rivalries,
  phases.phase06_narrative,
];
