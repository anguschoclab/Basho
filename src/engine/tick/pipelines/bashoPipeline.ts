/**
 * bashoPipeline.ts
 * ================
 * Phase array for an active-tournament week.
 *
 * During a basho the economic and progression cadence is lighter — no
 * full training occurs (rikishi are competing). Injury recovery still
 * ticks, but new injury rolls are skipped (handled by boutResolver).
 *
 * Phases included:
 *   1. Economy   — income / upkeep still applies during basho weeks
 *   2. Context   — derives ActiveModifiers (recoveryMultiplier needed by health)
 *   3. Staff     — staff fatigue/morale still ticks during basho
 *   4. Scouting  — scouting decay still ticks during basho
 *   5. Health    — recovery for injured rikishi (no new injury rolls during basho)
 *   6. Governance — governance reviews still apply
 *   7. NPC AI    — rival stables still make strategic decisions
 *   8. Narrative — financial crisis events still fire if applicable
 *
 * Phases intentionally excluded:
 *   - Training: rikishi do not train during competition.
 *   - Welfare: injury rolling is handled by boutResolver per bout outcome.
 */

import type { PipelinePhase } from "../pipelineRunner";
import * as phases from "../phases";

export const bashoPipeline: PipelinePhase[] = [
  phases.phase01_week_economy, // Weekly finances (income/upkeep) apply during basho weeks
  phases.phase02_context, // Derive ActiveModifiers (recoveryMultiplier consumed by health phase)
  phases.phase01_week_staff, // Staff fatigue/morale still ticks during basho
  phases.phase01_week_scouting, // Scouting decay still ticks during basho
  phases.phase01_week_health, // Recovery for injured rikishi (injury rolls skipped during basho)
  phases.phase01_week_governance,
  phases.phase01_week_npc_ai,
  phases.phase01_week_talent_pool, // Reveal candidates before recruitment (gap-aware supply)
  phases.phase01_week_candidate_pool, // NPC watchlist: simulate interest + maintenance
  phases.phase01_week_recruitment,
  phases.phase01_week_rivalries,
  phases.phase06_narrative,
];
