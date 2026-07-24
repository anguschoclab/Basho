/**
 * offSeasonPipeline.ts
 * ====================
 * Phase array for the standard inter-basho training week.
 *
 * Execution order is strict per TDD §4:
 *   1. Economy     — income / upkeep → updates heya.funds
 *   2. Context     — derives ActiveModifiers from facility/ichimon/morale/penalty
 *   3. Pre-basho   — schedule generation and health assessment
 *   4. Progression — applies training gains (consumes ActiveModifiers)
 *   5. Health      — recovery, healing, injury rolls (consumes recoveryMultiplier)
 *   6. Welfare     — welfare compliance checks
 *   7. Staff       — staff fatigue/morale updates
 *   8. Scouting    — scouting decay
 *   9. Governance  — governance reviews
 *  10. NPC AI      — rival stable decisions
 *  11. Narrative   — delta-driven Inbox / news events
 */

import type { PipelinePhase } from "../pipelineRunner";
import * as phases from "../phases";

export const offSeasonPipeline: PipelinePhase[] = [
  phases.phase01_week_economy, // Weekly finances: income, salaries, facility upkeep
  phases.phase02_context, // Derive ActiveModifiers (facility, nutrition, degeiko, recovery, morale, penalty)
  phases.phase_pre_basho_schedule, // Generate Day 1-2 schedules 2 days before basho
  phases.phase_pre_basho_assessment, // Pre-basho health assessment and withdrawal recommendations
  phases.phase01_week_training,
  phases.phase01_week_health,
  phases.phase01_week_welfare,
  phases.phase01_week_staff, // Weekly staff fatigue/morale updates
  phases.phase01_week_scouting, // Weekly scouting decay
  phases.phase01_week_governance,
  phases.phase01_week_npc_ai,
  phases.phase01_week_talent_pool, // Reveal candidates before recruitment
  phases.phase01_week_recruitment,
  phases.phase01_week_rivalries,
  phases.phase01_week_world_circuit, // Apply style drift from overseas exhibition influence
  phases.phase_global_cup_advance, // Advance Global Cup bracket when tournament is active (Jan off-season)
  phases.phase06_narrative,
];
